import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  orderBy,
  Timestamp,
  deleteDoc,
  addDoc,
  limit,
} from "firebase/firestore";
import { db } from "../../firebase.config";
import {
  Ad,
  Application,
  Pharmacy,
  Substitute,
  AdWithPharmacy,
  ApplicationWithDetails,
  AdStatus,
  ApplicationStatus,
  Qualification,
} from "@/types";

// Fetch all ads for a pharmacy
export async function getPharmaciesAds(userId: string): Promise<Ad[]> {
  const q = query(
    collection(db, "ads"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Ad));
}

// Fetch pharmacy ads by status, sorted by dateFrom ascending
export async function getPharmacyAdsByStatus(
  userId: string,
  status: AdStatus
): Promise<Ad[]> {
  const q = query(
    collection(db, "ads"),
    where("userId", "==", userId),
    where("status", "==", status),
    orderBy("dateFrom", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Ad));
}

// Fetch all applications for a pharmacy's ads
export async function getPharmacyApplications(
  userId: string
): Promise<ApplicationWithDetails[]> {
  // First get all ads for this pharmacy
  const ads = await getPharmaciesAds(userId);
  const adIds = ads.map((ad) => ad.id);

  if (adIds.length === 0) return [];

  // Then get all applications for those ads
  const applications: ApplicationWithDetails[] = [];

  // Firestore 'in' query is limited to 10 items, so we need to batch
  const batches = [];
  for (let i = 0; i < adIds.length; i += 10) {
    batches.push(adIds.slice(i, i + 10));
  }

  for (const batch of batches) {
    const q = query(
      collection(db, "applications"),
      where("adId", "in", batch),
      orderBy("appliedAt", "desc")
    );
    const snapshot = await getDocs(q);

    for (const docSnap of snapshot.docs) {
      const app = { id: docSnap.id, ...docSnap.data() } as Application;
      const ad = ads.find((a) => a.id === app.adId);

      // Fetch substitute info
      let substitute: Substitute | undefined;
      try {
        const subDoc = await getDoc(doc(db, "substitutes", app.substituteId));
        if (subDoc.exists()) {
          substitute = { id: subDoc.id, ...subDoc.data() } as Substitute;
        }
      } catch (e) {
        console.error("Error fetching substitute:", e);
      }

      applications.push({ ...app, ad, substitute });
    }
  }

  return applications;
}

// Fetch applications for a substitute
export async function getSubstituteApplications(
  substituteId: string
): Promise<ApplicationWithDetails[]> {
  const q = query(
    collection(db, "applications"),
    where("substituteId", "==", substituteId),
    orderBy("appliedAt", "desc")
  );
  const snapshot = await getDocs(q);

  const applications: ApplicationWithDetails[] = [];

  for (const docSnap of snapshot.docs) {
    const app = { id: docSnap.id, ...docSnap.data() } as Application;

    // Fetch ad info
    let ad: Ad | undefined;
    let pharmacy: Pharmacy | undefined;

    try {
      const adDoc = await getDoc(doc(db, "ads", app.adId));
      if (adDoc.exists()) {
        ad = { id: adDoc.id, ...adDoc.data() } as Ad;

        // Fetch pharmacy info
        const pharmacyDoc = await getDoc(doc(db, "pharmacies", ad.pharmacyId));
        if (pharmacyDoc.exists()) {
          pharmacy = { id: pharmacyDoc.id, ...pharmacyDoc.data() } as Pharmacy;
        }
      }
    } catch (e) {
      console.error("Error fetching ad/pharmacy:", e);
    }

    applications.push({ ...app, ad, pharmacy });
  }

  return applications;
}

// Fetch latest N open ads with pharmacy info
export async function getLatestAds(
  count: number = 3
): Promise<AdWithPharmacy[]> {
  const q = query(
    collection(db, "ads"),
    where("status", "==", "OPEN"),
    orderBy("createdAt", "desc"),
    limit(count)
  );
  const snapshot = await getDocs(q);

  const ads: AdWithPharmacy[] = [];

  for (const docSnap of snapshot.docs) {
    const ad = { id: docSnap.id, ...docSnap.data() } as Ad;

    // Fetch pharmacy info
    let pharmacy: Pharmacy | undefined;
    try {
      const pharmacyDoc = await getDoc(doc(db, "pharmacies", ad.pharmacyId));
      if (pharmacyDoc.exists()) {
        pharmacy = { id: pharmacyDoc.id, ...pharmacyDoc.data() } as Pharmacy;
      }
    } catch (e) {
      console.error("Error fetching pharmacy:", e);
    }

    ads.push({ ...ad, pharmacy });
  }

  return ads;
}

// Fetch all open ads with pharmacy info
export async function getOpenAdsWithPharmacy(): Promise<AdWithPharmacy[]> {
  const q = query(
    collection(db, "ads"),
    where("status", "==", "OPEN"),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);

  const ads: AdWithPharmacy[] = [];

  for (const docSnap of snapshot.docs) {
    const ad = { id: docSnap.id, ...docSnap.data() } as Ad;

    // Fetch pharmacy info
    let pharmacy: Pharmacy | undefined;
    try {
      const pharmacyDoc = await getDoc(doc(db, "pharmacies", ad.pharmacyId));
      if (pharmacyDoc.exists()) {
        pharmacy = { id: pharmacyDoc.id, ...pharmacyDoc.data() } as Pharmacy;
      }
    } catch (e) {
      console.error("Error fetching pharmacy:", e);
    }

    ads.push({ ...ad, pharmacy });
  }

  return ads;
}

// Fetch ads filtered by position and region
export async function getAdsByPositionAndRegion(
  position: Qualification,
  region: string,
  dateFrom?: string,
  dateTo?: string
): Promise<AdWithPharmacy[]> {
  const filterDateFrom = dateFrom
    ? Timestamp.fromDate(new Date(dateFrom))
    : Timestamp.fromDate(new Date());
  const filterDateTo = dateTo ? new Date(dateTo) : null;

  const q = query(
    collection(db, "ads"),
    where("status", "==", "OPEN"),
    where("position", "==", position.toUpperCase()),
    where("address.region", "==", region),
    where("dateFrom", ">=", filterDateFrom),
    orderBy("dateFrom", "asc")
  );
  const snapshot = await getDocs(q);

  const ads: AdWithPharmacy[] = [];

  // Convert filter dates to Date objects if provided

  for (const docSnap of snapshot.docs) {
    const ad = { id: docSnap.id, ...docSnap.data() } as Ad;

    // Filter by date range if provided
    if (filterDateFrom || filterDateTo) {
      const adDateFrom = ad.dateFrom?.toDate ? ad.dateFrom.toDate() : null;
      const adDateTo = ad.dateTo?.toDate ? ad.dateTo.toDate() : null;

      if (filterDateTo && adDateFrom && adDateFrom > filterDateTo) {
        continue; // Ad starts after filter ends
      }
    }

    // Fetch pharmacy info
    let pharmacy: Pharmacy | undefined;
    try {
      const pharmacyDoc = await getDoc(doc(db, "pharmacies", ad.pharmacyId));
      if (pharmacyDoc.exists()) {
        pharmacy = { id: pharmacyDoc.id, ...pharmacyDoc.data() } as Pharmacy;

        ads.push({ ...ad, pharmacy });
      }
    } catch (e) {
      console.error("Error fetching pharmacy:", e);
    }
  }

  return ads;
}

// Fetch a single pharmacy by ID
export async function getPharmacyById(
  pharmacyId: string
): Promise<Pharmacy | null> {
  try {
    const docSnap = await getDoc(doc(db, "pharmacies", pharmacyId));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Pharmacy;
    }
  } catch (e) {
    console.error("Error fetching pharmacy:", e);
  }
  return null;
}

// Fetch a single ad by ID with pharmacy info
export async function getAdById(adId: string): Promise<AdWithPharmacy | null> {
  try {
    const docSnap = await getDoc(doc(db, "ads", adId));
    if (docSnap.exists()) {
      const ad = { id: docSnap.id, ...docSnap.data() } as Ad;

      // Fetch pharmacy info
      let pharmacy: Pharmacy | undefined;
      const pharmacyDoc = await getDoc(doc(db, "pharmacies", ad.pharmacyId));
      if (pharmacyDoc.exists()) {
        pharmacy = { id: pharmacyDoc.id, ...pharmacyDoc.data() } as Pharmacy;

        // Fetch user email if not on pharmacy
        if (!pharmacy.email && pharmacy.userId) {
          const userDoc = await getDoc(doc(db, "users", pharmacy.userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            pharmacy.email = userData?.email;
          }
        }
      }

      return { ...ad, pharmacy };
    }
  } catch (e) {
    console.error("Error fetching ad:", e);
  }
  return null;
}

// Fetch applications for a specific ad
export async function getAdApplications(
  adId: string
): Promise<ApplicationWithDetails[]> {
  const q = query(
    collection(db, "applications"),
    where("adId", "==", adId),
    orderBy("appliedAt", "desc")
  );
  const snapshot = await getDocs(q);

  const applications: ApplicationWithDetails[] = [];

  for (const docSnap of snapshot.docs) {
    const app = { id: docSnap.id, ...docSnap.data() } as Application;

    // Fetch substitute info
    let substitute: Substitute | undefined;
    try {
      const subDoc = await getDoc(doc(db, "substitutes", app.substituteId));
      if (subDoc.exists()) {
        substitute = { id: subDoc.id, ...subDoc.data() } as Substitute;
      }
    } catch (e) {
      console.error("Error fetching substitute:", e);
    }

    applications.push({ ...app, substitute });
  }

  return applications;
}

// Fetch a single substitute by ID
export async function getSubstituteById(
  substituteId: string
): Promise<Substitute | null> {
  try {
    const docSnap = await getDoc(doc(db, "substitutes", substituteId));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Substitute;
    }
  } catch (e) {
    console.error("Error fetching substitute:", e);
  }
  return null;
}

// Calculate pharmacy stats
export function calculatePharmacyStats(
  ads: Ad[],
  applications: ApplicationWithDetails[]
) {
  return {
    totalAds: ads.length,
    activeAds: ads.filter((ad) => ad.status === "OPEN").length,
    closedAds: ads.filter((ad) => ad.status === "CLOSED").length,
    totalApplications: applications.length,
    pendingApplications: applications.filter((app) => app.status === "PENDING")
      .length,
    acceptedApplications: applications.filter(
      (app) => app.status === "ACCEPTED"
    ).length,
    rejectedApplications: applications.filter(
      (app) => app.status === "REJECTED"
    ).length,
  };
}

// Calculate substitute stats
export function calculateSubstituteStats(
  applications: ApplicationWithDetails[],
  availableAdsCount: number = 0
) {
  return {
    totalApplications: applications.length,
    pendingApplications: applications.filter((app) => app.status === "PENDING")
      .length,
    acceptedApplications: applications.filter(
      (app) => app.status === "ACCEPTED"
    ).length,
    rejectedApplications: applications.filter(
      (app) => app.status === "REJECTED"
    ).length,
    availableAds: availableAdsCount,
  };
}

// Format helpers
export const formatDate = (timestamp: Timestamp): string => {
  if (!timestamp?.toDate) return "";
  const date = timestamp.toDate();
  return date.toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export const formatDateShort = (timestamp: Timestamp): string => {
  if (!timestamp?.toDate) return "";
  const date = timestamp.toDate();
  return date.toLocaleDateString("hu-HU", {
    month: "short",
    day: "numeric",
  });
};

export const formatDateRange = (from: Timestamp, to?: Timestamp): string => {
  if (!from) return "";
  if (!to) return formatDate(from);
  return `${formatDateShort(from)} - ${formatDateShort(to)}`;
};

export const formatSalary = (salary: Ad["salary"]): string => {
  if (!salary || !salary.amount) return "";
  const formatted = salary.amount?.toLocaleString("hu-HU");
  return `${formatted} Ft/${salary.type === "órabér" ? "óra" : "nap"} (${
    salary.basis
  })`;
};

export const getStatusLabel = (
  status: AdStatus | ApplicationStatus
): string => {
  const labels: Record<string, string> = {
    OPEN: "Aktív",
    CLOSED: "Lezárt",
    PENDING: "Függőben",
    ACCEPTED: "Elfogadva",
    REJECTED: "Elutasítva",
  };
  return labels[status] || status;
};

// Delete an ad and its applications
export async function deleteAd(adId: string): Promise<void> {
  // Delete all applications for this ad
  const applicationsQuery = query(
    collection(db, "applications"),
    where("adId", "==", adId)
  );
  const applicationsSnapshot = await getDocs(applicationsQuery);

  const deletePromises = applicationsSnapshot.docs.map((doc) =>
    deleteDoc(doc.ref)
  );
  await Promise.all(deletePromises);

  // Delete the ad itself
  await deleteDoc(doc(db, "ads", adId));
}

export const getQualificationLabel = (qualification: Qualification): string => {
  if (!qualification) return "";
  return qualification.charAt(0) + qualification.slice(1).toLowerCase();
};

// Check if substitute has already applied to an ad
export async function checkIfAlreadyApplied(
  adId: string,
  substituteId: string
): Promise<boolean> {
  const q = query(
    collection(db, "applications"),
    where("adId", "==", adId),
    where("substituteId", "==", substituteId)
  );
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

// Apply to an ad
export async function applyToAd(
  adId: string,
  substituteId: string
): Promise<string> {
  // Check if already applied
  const alreadyApplied = await checkIfAlreadyApplied(adId, substituteId);
  if (alreadyApplied) {
    throw new Error("Már jelentkeztél erre a hirdetésre.");
  }

  // Create the application
  const applicationData = {
    adId,
    substituteId,
    status: "PENDING" as ApplicationStatus,
    appliedAt: Timestamp.now(),
  };

  const docRef = await addDoc(collection(db, "applications"), applicationData);
  return docRef.id;
}
