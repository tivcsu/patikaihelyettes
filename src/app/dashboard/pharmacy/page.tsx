"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  getPharmacyApplications,
  calculatePharmacyStats,
  formatDate,
  formatDateRange,
  formatSalary,
  getQualificationLabel,
  getPharmaciesAds,
} from "@/lib/firestoreService";
import { Ad, ApplicationWithDetails } from "@/types";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../../firebase.config";
import {
  PlusIcon,
  BriefcaseIcon,
  UsersIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ChevronRightIcon,
  MapPinIcon,
  PhoneIcon,
  CalendarIcon,
  BuildingIcon,
} from "@/components/ui/Icons";

export default function PharmacyDashboard() {
  const router = useRouter();
  const { user, pharmacies, loading: authLoading } = useAuth();
  const [ads, setAds] = useState<Ad[]>([]);
  const [applications, setApplications] = useState<ApplicationWithDetails[]>(
    []
  );
  const [dataLoading, setDataLoading] = useState(true);
  const [showClosedAds, setShowClosedAds] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // Redirect if not logged in or not a pharmacy
  useEffect(() => {
    if (!authLoading && (!user || user.role !== "PHARMACY")) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Fetch data from Firestore
  useEffect(() => {
    async function fetchData() {
      if (!user?.id) return;

      try {
        const [adsData, applicationsData] = await Promise.all([
          getPharmaciesAds(user.id),
          getPharmacyApplications(user.id),
        ]);
        setAds(adsData);
        setApplications(applicationsData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setDataLoading(false);
      }
    }

    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  const isLoading = authLoading || dataLoading;

  if (isLoading) {
    return (
      <div className="dashboard">
        <div className="dashboard-container">
          <div className="loading-state">Betöltés...</div>
        </div>
      </div>
    );
  }

  if (
    !user ||
    user.role !== "PHARMACY" ||
    !pharmacies ||
    pharmacies.length === 0
  ) {
    return null;
  }

  const stats = calculatePharmacyStats(ads, applications);

  const activeAds = ads.filter((ad) => ad.status === "OPEN");
  const closedAds = ads.filter((ad) => ad.status === "CLOSED");
  const recentApplications = applications
    .filter((app) => app.status === "PENDING")
    .slice(0, 5);

  const handleApplicationStatus = async (
    applicationId: string,
    status: "ACCEPTED" | "REJECTED"
  ) => {
    setUpdatingStatus(applicationId);
    try {
      await updateDoc(doc(db, "applications", applicationId), {
        status,
      });
      setApplications(
        applications.map((app) =>
          app.id === applicationId ? { ...app, status } : app
        )
      );
    } catch (error) {
      console.error("Error updating application status:", error);
    } finally {
      setUpdatingStatus(null);
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-container">
        {/* Header */}
        <header className="dashboard-header">
          <div className="dashboard-header-content">
            <div>
              <h1 className="dashboard-title">
                Üdvözöljük, {user?.name ?? user?.email ?? ""}!
              </h1>
              <p className="dashboard-subtitle">
                Kezelje hirdetéseit és jelentkezéseit egy helyen
              </p>
            </div>
            <Link href="/ads/new" className="btn btn-primary">
              <PlusIcon />
              Új hirdetés
            </Link>
          </div>
        </header>

        {/* Stats Grid */}
        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon stat-icon-primary">
              <BriefcaseIcon />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.activeAds}</span>
              <span className="stat-label">Aktív hirdetés</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-secondary">
              <UsersIcon />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.totalApplications}</span>
              <span className="stat-label">Összes jelentkezés</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-warning">
              <ClockIcon />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.pendingApplications}</span>
              <span className="stat-label">Feldolgozásra vár</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-success">
              <CheckCircleIcon />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.acceptedApplications}</span>
              <span className="stat-label">Elfogadott</span>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <div className="dashboard-grid">
          {/* Active Ads */}
          <section className="dashboard-section">
            <div className="section-header-row">
              <h2 className="section-title">Aktív hirdetések</h2>
              <Link href="/ads" className="section-link">
                Összes megtekintése
                <ChevronRightIcon />
              </Link>
            </div>
            {activeAds.length === 0 ? (
              <div className="empty-state">
                <BriefcaseIcon />
                <p>Nincs aktív hirdetése</p>
                <Link href="/ads/new" className="btn btn-outline btn-sm">
                  Hirdetés létrehozása
                </Link>
              </div>
            ) : (
              <div className="dashboard-cards">
                {activeAds.map((ad) => {
                  const adApplications = applications.filter(
                    (app) => app.adId === ad.id
                  );

                  const pendingCount = adApplications.filter(
                    (app) => app.status === "PENDING"
                  ).length;
                  const acceptedCount = adApplications.filter(
                    (app) => app.status === "ACCEPTED"
                  ).length;

                  return (
                    <div key={ad.id} className="dashboard-ad-card">
                      <div className="ad-card-header">
                        <span>
                          {
                            pharmacies.find(
                              (pharmacy) => pharmacy.id === ad.pharmacyId
                            )?.name
                          }
                        </span>
                        <span className="badge badge-primary">
                          {getQualificationLabel(ad.position)}
                        </span>
                        {pendingCount > 0 && (
                          <span className="badge badge-warning">
                            {pendingCount} új jelentkezés
                          </span>
                        )}
                        {acceptedCount > 0 && (
                          <span className="badge badge-success">
                            {acceptedCount} elfogadott
                          </span>
                        )}
                      </div>
                      <div className="ad-card-body">
                        <div className="ad-card-meta">
                          <span>
                            <CalendarIcon />
                            {formatDateRange(ad.dateFrom, ad.dateTo)}
                          </span>
                          {/*  <span>
                            <ClockIcon />
                            {ad.shift} ({ad.startTime} - {ad.endTime})
                          </span> */}
                        </div>
                        <p className="ad-card-salary">
                          {formatSalary(ad.salary)}
                        </p>
                      </div>
                      <div className="ad-card-footer">
                        <span className="ad-card-applications">
                          <UsersIcon />
                          {adApplications.length} jelentkező
                        </span>
                        <Link
                          href={`/ads/${ad.id}?from=/dashboard/pharmacy`}
                          className="btn btn-ghost btn-sm"
                        >
                          Részletek
                          <ChevronRightIcon />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {/* Closed Ads Toggle */}
            {closedAds.length > 0 && (
              <div className="closed-ads-section">
                <button
                  className="closed-ads-toggle"
                  onClick={() => setShowClosedAds(!showClosedAds)}
                >
                  <span
                    className={`toggle-icon ${showClosedAds ? "rotated" : ""}`}
                  >
                    <ChevronRightIcon />
                  </span>
                  Lezárt hirdetések ({closedAds.length})
                </button>

                {showClosedAds && (
                  <div className="dashboard-cards closed-ads-list">
                    {closedAds.map((ad) => {
                      const adApplications = applications.filter(
                        (app) => app.adId === ad.id
                      );

                      return (
                        <div
                          key={ad.id}
                          className="dashboard-ad-card closed-ad-card"
                        >
                          <div className="ad-card-header">
                            <span className="badge badge-primary">
                              {getQualificationLabel(ad.position)}
                            </span>
                            <span className="badge badge-secondary">
                              Lezárt
                            </span>
                          </div>
                          <div className="ad-card-body">
                            <div className="ad-card-meta">
                              <span>
                                <CalendarIcon />
                                {formatDateRange(ad.dateFrom, ad.dateTo)}
                              </span>
                            </div>
                            <p className="ad-card-salary">
                              {formatSalary(ad.salary)}
                            </p>
                          </div>
                          <div className="ad-card-footer">
                            <span className="ad-card-applications">
                              <UsersIcon />
                              {adApplications.length} jelentkező
                            </span>
                            <Link
                              href={`/ads/${ad.id}?from=/dashboard/pharmacy`}
                              className="btn btn-ghost btn-sm"
                            >
                              Részletek
                              <ChevronRightIcon />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}{" "}
          </section>

          {/* Recent Applications */}
          <section className="dashboard-section">
            <div className="section-header-row">
              <h2 className="section-title">Új jelentkezések</h2>
              <Link
                href="/dashboard/pharmacy/applications"
                className="section-link"
              >
                Összes megtekintése
                <ChevronRightIcon />
              </Link>
            </div>

            {recentApplications.length === 0 ? (
              <div className="empty-state">
                <UsersIcon />
                <p>Nincs új jelentkezés</p>
              </div>
            ) : (
              <div className="applications-list">
                {recentApplications.map((app) => (
                  <div key={app.id} className="application-item">
                    <div className="application-avatar">
                      {app.substitute?.name?.charAt(0) || "?"}
                    </div>
                    <div className="application-info">
                      <h4 className="application-name">
                        {app.substitute?.name || "Ismeretlen"} - {app?.ad?.name}
                      </h4>
                      <p className="application-details">
                        {app.substitute?.qualification &&
                          getQualificationLabel(
                            app.substitute.qualification
                          )}{" "}
                        • {app.substitute?.experienceYears || 0} év tapasztalat
                      </p>
                      <p className="application-ad">
                        Jelentkezett:{" "}
                        {app.ad?.position &&
                          getQualificationLabel(app.ad.position)}{" "}
                        pozícióra
                      </p>
                    </div>
                    <div className="application-actions">
                      <button
                        className="btn btn-success btn-sm btn-icon"
                        onClick={() =>
                          handleApplicationStatus(app.id!, "ACCEPTED")
                        }
                        disabled={updatingStatus === app.id}
                        title="Elfogadás"
                      >
                        <CheckCircleIcon />
                      </button>
                      <button
                        className="btn btn-danger btn-sm btn-icon"
                        onClick={() =>
                          handleApplicationStatus(app.id!, "REJECTED")
                        }
                        disabled={updatingStatus === app.id}
                        title="Elutasítás"
                      >
                        <XCircleIcon />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Profile Card */}
        <section className="dashboard-section profile-section">
          <div className="section-header-row">
            <h2 className="section-title">Gyógyszertár adatok</h2>
            <Link href="/profile" className="section-link">
              Szerkesztés
              <ChevronRightIcon />
            </Link>
          </div>
          {pharmacies.map((pharmacy) => (
            <div className="profile-card" key={pharmacy.id}>
              <div className="profile-card-header">
                <div className="profile-avatar">
                  <BuildingIcon />
                </div>
                <div>
                  <h3 className="profile-name">{pharmacy.name}</h3>
                  <p className="profile-since">
                    {pharmacy.createdAt &&
                      `Tag ${formatDate(pharmacy.createdAt)} óta`}
                  </p>
                </div>
              </div>
              <div className="profile-card-body">
                <div className="profile-info-item">
                  <MapPinIcon />
                  <span>
                    {pharmacy.address?.zip} {pharmacy.address?.city},{" "}
                    {pharmacy.address?.street}
                  </span>
                </div>
                <div className="profile-info-item">
                  <PhoneIcon />
                  <span>{pharmacy.phone}</span>
                </div>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
