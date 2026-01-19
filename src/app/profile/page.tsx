"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  doc,
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../../firebase.config";
import { useAuth } from "@/contexts/AuthContext";
import { Pharmacy } from "@/types";
import {
  UserIcon,
  BuildingIcon,
  CheckCircleIcon,
  PlusIcon,
  XIcon,
  TrashIcon,
} from "@/components/ui/Icons";
import { REGIONS } from "../constants/regions";

interface PharmacyFormData {
  id?: string;
  name: string;
  zip: string;
  city: string;
  street: string;
  region: string;
  phone: string;
  email: string;
  isNew?: boolean;
  isSaving?: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, substitute, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");

  // Multiple pharmacies state
  const [pharmacies, setPharmacies] = useState<PharmacyFormData[]>([]);
  const [loadingPharmacies, setLoadingPharmacies] = useState(true);

  // Substitute form state
  const [substituteForm, setSubstituteForm] = useState({
    name: "",
    qualification: "" as
      | "GYÓGYSZERÉSZ"
      | "SZAKASSZISZTENS"
      | "ASSZISZTENS"
      | "",
    experienceYears: "",
    bio: "",
    availableRegions: [] as string[],
    isOpenToWork: true,
    availabilityNote: "",
    phone: "",
    email: "",
  });

  const handleRegionToggle = (region: string) => {
    setSubstituteForm((prev) => ({
      ...prev,
      availableRegions: prev.availableRegions.includes(region)
        ? prev.availableRegions.filter((r) => r !== region)
        : [...prev.availableRegions, region],
    }));
    setSuccessMessage("");
  };

  // Fetch all pharmacies for the user
  useEffect(() => {
    async function fetchPharmacies() {
      if (!user || user.role !== "PHARMACY") {
        setLoadingPharmacies(false);
        return;
      }

      try {
        const q = query(
          collection(db, "pharmacies"),
          where("userId", "==", user.id)
        );
        const snapshot = await getDocs(q);
        const pharmacyData: PharmacyFormData[] = snapshot.docs.map((doc) => {
          const data = doc.data() as Pharmacy;
          return {
            id: doc.id,
            name: data.name || "",
            zip: data.address?.zip || "",
            city: data.address?.city || "",
            street: data.address?.street || "",
            region: data.address?.region || "",
            phone: data.phone || "",
            email: data.email || "",
          };
        });
        setPharmacies(pharmacyData);
      } catch (err) {
        console.error("Error fetching pharmacies:", err);
      } finally {
        setLoadingPharmacies(false);
      }
    }

    if (user) {
      fetchPharmacies();
    }
  }, [user]);

  // Initialize substitute form with current data
  useEffect(() => {
    if (substitute) {
      setSubstituteForm({
        name: substitute.name || "",
        qualification: substitute.qualification || "",
        experienceYears: substitute.experienceYears?.toString() || "",
        bio: substitute.bio || "",
        availableRegions: substitute.availableRegions || [],
        isOpenToWork: substitute.isOpenToWork ?? true,
        availabilityNote: substitute.availabilityNote || "",
        phone: substitute.phone || "",
        email: substitute.email || "",
      });
    }
  }, [substitute]);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Handle pharmacy form field changes
  const handlePharmacyFieldChange = (
    index: number,
    field: keyof PharmacyFormData,
    value: string
  ) => {
    setPharmacies((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
    setSuccessMessage("");
  };

  // Add new empty pharmacy form
  const handleAddNewPharmacy = () => {
    setPharmacies((prev) => [
      {
        name: "",
        zip: "",
        city: "",
        street: "",
        region: "",
        phone: "",
        email: "",
        isNew: true,
      },
      ...prev,
    ]);
  };

  // Cancel adding new pharmacy
  const handleCancelNewPharmacy = (index: number) => {
    setPharmacies((prev) => prev.filter((_, i) => i !== index));
  };

  // Save pharmacy (create or update)
  const handleSavePharmacy = async (index: number) => {
    const pharmacy = pharmacies[index];
    if (!user) return;

    // Validate required fields
    if (
      !pharmacy.name ||
      !pharmacy.region ||
      !pharmacy.zip ||
      !pharmacy.city ||
      !pharmacy.street ||
      !pharmacy.phone
    ) {
      setError("Kérjük, töltse ki az összes kötelező mezőt.");
      return;
    }

    setPharmacies((prev) =>
      prev.map((p, i) => (i === index ? { ...p, isSaving: true } : p))
    );
    setError("");
    setSuccessMessage("");

    try {
      const pharmacyData = {
        name: pharmacy.name,
        address: {
          zip: pharmacy.zip,
          city: pharmacy.city,
          street: pharmacy.street,
          region: pharmacy.region,
        },
        phone: pharmacy.phone,
        email: pharmacy.email || null,
      };

      if (pharmacy.isNew) {
        // Create new pharmacy
        const docRef = await addDoc(collection(db, "pharmacies"), {
          ...pharmacyData,
          userId: user.id,
          createdAt: new Date(),
        });
        setPharmacies((prev) =>
          prev.map((p, i) =>
            i === index
              ? { ...p, id: docRef.id, isNew: false, isSaving: false }
              : p
          )
        );
        setSuccessMessage("Új patika sikeresen létrehozva!");
      } else {
        // Update existing pharmacy
        await updateDoc(doc(db, "pharmacies", pharmacy.id!), pharmacyData);
        setPharmacies((prev) =>
          prev.map((p, i) => (i === index ? { ...p, isSaving: false } : p))
        );
        setSuccessMessage("Patika sikeresen frissítve!");
      }
    } catch (err) {
      console.error("Error saving pharmacy:", err);
      setError("Hiba történt a mentés során. Kérjük, próbálja újra.");
      setPharmacies((prev) =>
        prev.map((p, i) => (i === index ? { ...p, isSaving: false } : p))
      );
    }
  };

  // Delete pharmacy
  const handleDeletePharmacy = async (index: number) => {
    const pharmacy = pharmacies[index];

    if (pharmacy.isNew) {
      handleCancelNewPharmacy(index);
      return;
    }

    if (!confirm("Biztosan törölni szeretné ezt a patikát?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "pharmacies", pharmacy.id!));
      setPharmacies((prev) => prev.filter((_, i) => i !== index));
      setSuccessMessage("Patika sikeresen törölve!");
    } catch (err) {
      console.error("Error deleting pharmacy:", err);
      setError("Hiba történt a törlés során. Kérjük, próbálja újra.");
    }
  };

  const handleSubstituteChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setSubstituteForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setSubstituteForm((prev) => ({ ...prev, [name]: value }));
    }
    setSuccessMessage("");
  };

  const handleSubstituteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      await updateDoc(doc(db, "substitutes", user.id!), {
        name: substituteForm.name,
        qualification: substituteForm.qualification,
        experienceYears: Number(substituteForm.experienceYears),
        bio: substituteForm.bio,
        availableRegions: substituteForm.availableRegions,
        isOpenToWork: substituteForm.isOpenToWork,
        availabilityNote: substituteForm.availabilityNote,
        phone: substituteForm.phone || null,
        email: substituteForm.email || null,
      });
      setSuccessMessage("Profil sikeresen frissítve!");
    } catch (err) {
      console.error("Error updating substitute:", err);
      setError("Hiba történt a mentés során. Kérjük, próbálja újra.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-page-container">
          <div className="loading-state">Betöltés...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="profile-page">
      <div className="profile-page-container">
        <header className="profile-page-header">
          <div className="profile-page-icon">
            {user.role === "PHARMACY" ? <BuildingIcon /> : <UserIcon />}
          </div>
          <div>
            <h1 className="profile-page-title">Profil beállítások</h1>
            <p className="profile-page-subtitle">
              {user.role === "PHARMACY"
                ? "Gyógyszertár adatainak kezelése"
                : "Személyes adatok kezelése"}
            </p>
          </div>
        </header>

        {successMessage && (
          <div className="alert alert-success">
            <CheckCircleIcon />
            {successMessage}
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        {/* Email (read-only) */}
        <section className="profile-form-section">
          <h2 className="profile-form-section-title">Fiók adatok</h2>
          <div className="form-group">
            <label className="form-label">E-mail cím</label>
            <input
              type="email"
              className="form-input form-input-disabled"
              value={user.email}
              disabled
            />
            <span className="form-hint">Az e-mail cím nem módosítható.</span>
          </div>
        </section>

        {/* Pharmacies Section */}
        {user.role === "PHARMACY" && (
          <>
            <div className="profile-form-section-header">
              <h2 className="profile-form-section-title">Patikák kezelése</h2>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAddNewPharmacy}
              >
                <PlusIcon />
                Új patika
              </button>
            </div>

            {loadingPharmacies ? (
              <div className="loading-state">Patikák betöltése...</div>
            ) : pharmacies.length === 0 ? (
              <div className="empty-state-small">
                <p>
                  Még nincs patika hozzáadva. Kattintson az "Új patika" gombra
                  az első patika létrehozásához.
                </p>
              </div>
            ) : null}

            {pharmacies.map((pharmacy, index) => (
              <section
                key={pharmacy.id || `new-${index}`}
                className={`profile-form-section pharmacy-card ${
                  pharmacy.isNew ? "pharmacy-card-new" : ""
                }`}
              >
                <div className="profile-form-section-header">
                  <h2 className="profile-form-section-title">
                    {pharmacy.isNew ? "Új patika" : pharmacy.name || "Patika"}
                  </h2>
                  <button
                    type="button"
                    className="btn btn-outline btn-danger"
                    onClick={() => handleDeletePharmacy(index)}
                  >
                    {pharmacy.isNew ? <XIcon /> : <TrashIcon />}
                    {pharmacy.isNew ? "Mégse" : "Törlés"}
                  </button>
                </div>

                <div className="form-group">
                  <label className="form-label required">Patika neve</label>
                  <input
                    type="text"
                    className="form-input"
                    value={pharmacy.name}
                    onChange={(e) =>
                      handlePharmacyFieldChange(index, "name", e.target.value)
                    }
                    placeholder="pl. Központi Gyógyszertár"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label required">Régió</label>
                  <select
                    className="form-select"
                    value={pharmacy.region}
                    onChange={(e) =>
                      handlePharmacyFieldChange(index, "region", e.target.value)
                    }
                    required
                  >
                    <option value="">Válassz régiót</option>
                    {REGIONS.map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">Irányítószám</label>
                    <input
                      type="text"
                      className="form-input"
                      value={pharmacy.zip}
                      onChange={(e) =>
                        handlePharmacyFieldChange(index, "zip", e.target.value)
                      }
                      placeholder="1234"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Város</label>
                    <input
                      type="text"
                      className="form-input"
                      value={pharmacy.city}
                      onChange={(e) =>
                        handlePharmacyFieldChange(index, "city", e.target.value)
                      }
                      placeholder="Budapest"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label required">Utca, házszám</label>
                  <input
                    type="text"
                    className="form-input"
                    value={pharmacy.street}
                    onChange={(e) =>
                      handlePharmacyFieldChange(index, "street", e.target.value)
                    }
                    placeholder="Kossuth utca 10."
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">Telefonszám</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={pharmacy.phone}
                      onChange={(e) =>
                        handlePharmacyFieldChange(
                          index,
                          "phone",
                          e.target.value
                        )
                      }
                      placeholder="+36 30 123 4567"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email cím</label>
                    <input
                      type="email"
                      className="form-input"
                      value={pharmacy.email}
                      onChange={(e) =>
                        handlePharmacyFieldChange(
                          index,
                          "email",
                          e.target.value
                        )
                      }
                      placeholder="patika@email.com"
                    />
                  </div>
                </div>

                <div className="profile-form-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleSavePharmacy(index)}
                    disabled={pharmacy.isSaving}
                  >
                    {pharmacy.isSaving
                      ? "Mentés..."
                      : pharmacy.isNew
                      ? "Patika létrehozása"
                      : "Változások mentése"}
                  </button>
                </div>
              </section>
            ))}
          </>
        )}

        {/* Substitute Form */}
        {user.role === "SUBSTITUTE" && (
          <form onSubmit={handleSubstituteSubmit}>
            <section className="profile-form-section">
              <h2 className="profile-form-section-title">Személyes adatok</h2>

              <div className="form-group">
                <label className="form-label required">Teljes név</label>
                <input
                  type="text"
                  name="name"
                  className="form-input"
                  value={substituteForm.name}
                  onChange={handleSubstituteChange}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label required">Végzettség</label>
                  <select
                    name="qualification"
                    className="form-select"
                    value={substituteForm.qualification}
                    onChange={handleSubstituteChange}
                    required
                  >
                    <option value="">Válasszon...</option>
                    <option value="GYÓGYSZERÉSZ">Gyógyszerész</option>
                    <option value="SZAKASSZISZTENS">Szakasszisztens</option>
                    <option value="ASSZISZTENS">Asszisztens</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">
                    Tapasztalat (év)
                  </label>
                  <input
                    type="number"
                    name="experienceYears"
                    className="form-input"
                    value={substituteForm.experienceYears}
                    onChange={handleSubstituteChange}
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Bemutatkozás</label>
                <textarea
                  name="bio"
                  className="form-textarea"
                  value={substituteForm.bio}
                  onChange={handleSubstituteChange}
                  rows={4}
                  placeholder="Írjon pár mondatot magáról, tapasztalatairól..."
                />
              </div>
            </section>

            <section className="profile-form-section">
              <h2 className="profile-form-section-title">Elérhetőség</h2>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Telefonszám</label>
                  <input
                    type="tel"
                    name="phone"
                    className="form-input"
                    value={substituteForm.phone}
                    onChange={handleSubstituteChange}
                    placeholder="+36 30 123 4567"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Kapcsolati email</label>
                  <input
                    type="email"
                    name="email"
                    className="form-input"
                    value={substituteForm.email}
                    onChange={handleSubstituteChange}
                    placeholder="helyettes@email.hu"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="isOpenToWork"
                    checked={substituteForm.isOpenToWork}
                    onChange={handleSubstituteChange}
                  />
                  <span>Elérhető vagyok munkára</span>
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">Elérhetőségi megjegyzés</label>
                <input
                  type="text"
                  name="availabilityNote"
                  className="form-input"
                  value={substituteForm.availabilityNote}
                  onChange={handleSubstituteChange}
                  placeholder="Pl.: Január-februárban bármikor elérhető vagyok."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Elérhető régiók</label>
                <div className="regions-grid">
                  {REGIONS.map((region) => (
                    <label key={region} className="region-checkbox">
                      <input
                        type="checkbox"
                        checked={substituteForm.availableRegions.includes(
                          region
                        )}
                        onChange={() => handleRegionToggle(region)}
                      />
                      <span>{region}</span>
                    </label>
                  ))}
                </div>
              </div>
            </section>

            <div className="profile-form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Mentés..." : "Változások mentése"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
