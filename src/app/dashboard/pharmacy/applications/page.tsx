"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  getPharmacyAdsByStatus,
  getAdApplications,
  formatDate,
  formatDateRange,
  formatSalary,
  getQualificationLabel,
} from "@/lib/firestoreService";
import { Ad, ApplicationWithDetails } from "@/types";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../../../firebase.config";
import {
  BriefcaseIcon,
  UsersIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  CalendarIcon,
  PhoneIcon,
  MailIcon,
  StarIcon,
} from "@/components/ui/Icons";

export default function PharmacyApplicationsPage() {
  const router = useRouter();
  const { user, pharmacies, loading: authLoading } = useAuth();

  const [activeAds, setActiveAds] = useState<Ad[]>([]);
  const [closedAds, setClosedAds] = useState<Ad[]>([]);
  const [showClosedAds, setShowClosedAds] = useState(false);
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const [applications, setApplications] = useState<ApplicationWithDetails[]>(
    []
  );

  const [loadingAds, setLoadingAds] = useState(true);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [loadingClosedAds, setLoadingClosedAds] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // Redirect if not logged in or not a pharmacy
  useEffect(() => {
    if (!authLoading && (!user || user.role !== "PHARMACY")) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Fetch active ads on mount
  useEffect(() => {
    async function fetchActiveAds() {
      if (!user?.id) return;

      try {
        setLoadingAds(true);
        const ads = await getPharmacyAdsByStatus(user.id, "OPEN");
        setActiveAds(ads);

        // Auto-select first ad if available
        if (ads.length > 0 && !selectedAd) {
          setSelectedAd(ads[0]);
        }
      } catch (error) {
        console.error("Error fetching active ads:", error);
      } finally {
        setLoadingAds(false);
      }
    }

    if (user?.id) {
      fetchActiveAds();
    }
  }, [user?.id]);

  // Fetch closed ads when toggle is enabled
  useEffect(() => {
    async function fetchClosedAds() {
      if (!user?.id || !showClosedAds || closedAds.length > 0) return;

      try {
        setLoadingClosedAds(true);
        const ads = await getPharmacyAdsByStatus(user.id, "CLOSED");
        setClosedAds(ads);
      } catch (error) {
        console.error("Error fetching closed ads:", error);
      } finally {
        setLoadingClosedAds(false);
      }
    }

    fetchClosedAds();
  }, [user?.id, showClosedAds, closedAds.length]);

  // Fetch applications when ad is selected
  useEffect(() => {
    async function fetchApplications() {
      if (!selectedAd?.id) {
        setApplications([]);
        return;
      }

      try {
        setLoadingApplications(true);
        const apps = await getAdApplications(selectedAd.id);
        setApplications(apps);
      } catch (error) {
        console.error("Error fetching applications:", error);
      } finally {
        setLoadingApplications(false);
      }
    }

    fetchApplications();
  }, [selectedAd?.id]);

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

  const handleAdSelect = (ad: Ad) => {
    setSelectedAd(ad);
  };

  const isLoading = authLoading || loadingAds;

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

  const allAds = showClosedAds ? [...activeAds, ...closedAds] : activeAds;
  const pendingApplications = applications.filter(
    (app) => app.status === "PENDING"
  );
  const processedApplications = applications.filter(
    (app) => app.status !== "PENDING"
  );

  return (
    <div className="dashboard">
      <div className="dashboard-container">
        {/* Header */}
        <header className="dashboard-header">
          <div className="dashboard-header-content">
            <div className="applications-header-left">
              <Link
                href="/dashboard/pharmacy"
                className="btn btn-ghost btn-sm back-link"
              >
                <ChevronLeftIcon />
                Vissza
              </Link>
              <div>
                <h1 className="dashboard-title">Jelentkezések</h1>
                <p className="dashboard-subtitle">
                  Tekintse át és kezelje a hirdetésekre érkezett jelentkezéseket
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="applications-page-layout">
          {/* Ads Sidebar */}
          <aside className="applications-sidebar">
            <div className="sidebar-header">
              <h2 className="sidebar-title">Hirdetések</h2>
              <span className="sidebar-count">
                {activeAds.length} aktív
                {closedAds.length > 0 && showClosedAds
                  ? `, ${closedAds.length} lezárt`
                  : ""}
              </span>
            </div>

            {allAds.length === 0 && !loadingClosedAds ? (
              <div className="sidebar-empty">
                <BriefcaseIcon />
                <p>Nincs hirdetése</p>
                <Link href="/ads/new" className="btn btn-primary btn-sm">
                  Hirdetés létrehozása
                </Link>
              </div>
            ) : (
              <div className="sidebar-ads-list">
                {activeAds.map((ad) => (
                  <button
                    key={ad.id}
                    className={`sidebar-ad-item ${
                      selectedAd?.id === ad.id ? "selected" : ""
                    }`}
                    onClick={() => handleAdSelect(ad)}
                  >
                    <div className="sidebar-ad-header">
                      <span className="badge badge-primary badge-sm">
                        {getQualificationLabel(ad.position)}
                      </span>
                      <span className="badge badge-success badge-sm">
                        Aktív
                      </span>
                    </div>
                    <div className="sidebar-ad-date">
                      <CalendarIcon />
                      {formatDateRange(ad.dateFrom, ad.dateTo)}
                    </div>
                    <div className="sidebar-ad-salary">
                      {formatSalary(ad.salary)}
                    </div>
                  </button>
                ))}

                {showClosedAds && loadingClosedAds && (
                  <div className="sidebar-loading">
                    Lezárt hirdetések betöltése...
                  </div>
                )}

                {showClosedAds &&
                  closedAds.map((ad) => (
                    <button
                      key={ad.id}
                      className={`sidebar-ad-item closed ${
                        selectedAd?.id === ad.id ? "selected" : ""
                      }`}
                      onClick={() => handleAdSelect(ad)}
                    >
                      <div className="sidebar-ad-header">
                        <span className="badge badge-primary badge-sm">
                          {getQualificationLabel(ad.position)}
                        </span>
                        <span className="badge badge-secondary badge-sm">
                          Lezárt
                        </span>
                      </div>
                      <div className="sidebar-ad-date">
                        <CalendarIcon />
                        {formatDateRange(ad.dateFrom, ad.dateTo)}
                      </div>
                      <div className="sidebar-ad-salary">
                        {formatSalary(ad.salary)}
                      </div>
                    </button>
                  ))}
              </div>
            )}

            {/* Show Closed Ads Toggle */}
            <div className="sidebar-toggle">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={showClosedAds}
                  onChange={(e) => setShowClosedAds(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
              <span className="toggle-label">Lezárt hirdetések mutatása</span>
            </div>
          </aside>

          {/* Applications Panel */}
          <main className="applications-panel">
            {!selectedAd ? (
              <div className="applications-empty-state">
                <UsersIcon />
                <h3>Válasszon ki egy hirdetést</h3>
                <p>
                  Válasszon ki egy hirdetést a bal oldali listából a
                  jelentkezések megtekintéséhez.
                </p>
              </div>
            ) : loadingApplications ? (
              <div className="applications-loading">
                <div className="loading-state">Jelentkezések betöltése...</div>
              </div>
            ) : (
              <>
                {/* Selected Ad Summary */}
                <div className="selected-ad-summary">
                  <div className="selected-ad-info">
                    <h2>
                      {getQualificationLabel(selectedAd.position)} pozíció
                    </h2>
                    <div className="selected-ad-meta">
                      <span>
                        <CalendarIcon />
                        {formatDateRange(
                          selectedAd.dateFrom,
                          selectedAd.dateTo
                        )}
                      </span>
                      <span>{formatSalary(selectedAd.salary)}</span>
                    </div>
                  </div>
                  <div className="selected-ad-stats">
                    <div className="stat-mini">
                      <span className="stat-mini-value">
                        {applications.length}
                      </span>
                      <span className="stat-mini-label">Összes</span>
                    </div>
                    <div className="stat-mini stat-mini-warning">
                      <span className="stat-mini-value">
                        {pendingApplications.length}
                      </span>
                      <span className="stat-mini-label">Függőben</span>
                    </div>
                  </div>
                </div>

                {applications.length === 0 ? (
                  <div className="applications-empty-state">
                    <UsersIcon />
                    <h3>Nincs jelentkezés</h3>
                    <p>Erre a hirdetésre még nem érkezett jelentkezés.</p>
                  </div>
                ) : (
                  <div className="applications-content">
                    {/* Pending Applications */}
                    {pendingApplications.length > 0 && (
                      <section className="applications-section">
                        <h3 className="applications-section-title">
                          <ClockIcon />
                          Feldolgozásra vár ({pendingApplications.length})
                        </h3>
                        <div className="applications-grid">
                          {pendingApplications.map((app) => (
                            <div
                              key={app.id}
                              className="application-card pending"
                            >
                              <div className="application-card-header">
                                <div className="application-avatar">
                                  {app.substitute?.name?.charAt(0) || "?"}
                                </div>
                                <div className="application-card-info">
                                  <h4>
                                    {app.substitute?.name || "Ismeretlen"}
                                  </h4>
                                  <p>
                                    {app.substitute?.qualification &&
                                      getQualificationLabel(
                                        app.substitute.qualification
                                      )}
                                  </p>
                                </div>
                                <span className="badge badge-warning">
                                  Függőben
                                </span>
                              </div>

                              <div className="application-card-body">
                                <div className="application-card-details">
                                  <div className="detail-item">
                                    <StarIcon />
                                    <span>
                                      {app.substitute?.experienceYears || 0} év
                                      tapasztalat
                                    </span>
                                  </div>
                                  {app.substitute?.phone && (
                                    <div className="detail-item">
                                      <PhoneIcon />
                                      <a href={`tel:${app.substitute.phone}`}>
                                        {app.substitute.phone}
                                      </a>
                                    </div>
                                  )}
                                  {app.substitute?.email && (
                                    <div className="detail-item">
                                      <MailIcon />
                                      <a
                                        href={`mailto:${app.substitute.email}`}
                                      >
                                        {app.substitute.email}
                                      </a>
                                    </div>
                                  )}
                                </div>
                                {app.substitute?.bio && (
                                  <p className="application-card-bio">
                                    {app.substitute.bio}
                                  </p>
                                )}
                              </div>

                              <div className="application-card-footer">
                                <span className="application-date">
                                  Jelentkezett: {formatDate(app.appliedAt)}
                                </span>
                                <div className="application-card-actions">
                                  <button
                                    className="btn btn-success btn-sm"
                                    onClick={() =>
                                      handleApplicationStatus(
                                        app.id!,
                                        "ACCEPTED"
                                      )
                                    }
                                    disabled={updatingStatus === app.id}
                                  >
                                    <CheckCircleIcon />
                                    Elfogadás
                                  </button>
                                  <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() =>
                                      handleApplicationStatus(
                                        app.id!,
                                        "REJECTED"
                                      )
                                    }
                                    disabled={updatingStatus === app.id}
                                  >
                                    <XCircleIcon />
                                    Elutasítás
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Processed Applications */}
                    {processedApplications.length > 0 && (
                      <section className="applications-section">
                        <h3 className="applications-section-title">
                          <CheckCircleIcon />
                          Feldolgozott jelentkezések (
                          {processedApplications.length})
                        </h3>
                        <div className="applications-grid">
                          {processedApplications.map((app) => (
                            <div
                              key={app.id}
                              className={`application-card ${
                                app.status === "ACCEPTED"
                                  ? "accepted"
                                  : "rejected"
                              }`}
                            >
                              <div className="application-card-header">
                                <div className="application-avatar">
                                  {app.substitute?.name?.charAt(0) || "?"}
                                </div>
                                <div className="application-card-info">
                                  <h4>
                                    {app.substitute?.name || "Ismeretlen"}
                                  </h4>
                                  <p>
                                    {app.substitute?.qualification &&
                                      getQualificationLabel(
                                        app.substitute.qualification
                                      )}
                                  </p>
                                </div>
                                <span
                                  className={`badge ${
                                    app.status === "ACCEPTED"
                                      ? "badge-success"
                                      : "badge-danger"
                                  }`}
                                >
                                  {app.status === "ACCEPTED"
                                    ? "Elfogadva"
                                    : "Elutasítva"}
                                </span>
                              </div>

                              <div className="application-card-body">
                                <div className="application-card-details">
                                  <div className="detail-item">
                                    <StarIcon />
                                    <span>
                                      {app.substitute?.experienceYears || 0} év
                                      tapasztalat
                                    </span>
                                  </div>
                                  {app.status === "ACCEPTED" && (
                                    <>
                                      {app.substitute?.phone && (
                                        <div className="detail-item">
                                          <PhoneIcon />
                                          <a
                                            href={`tel:${app.substitute.phone}`}
                                          >
                                            {app.substitute.phone}
                                          </a>
                                        </div>
                                      )}
                                      {app.substitute?.email && (
                                        <div className="detail-item">
                                          <MailIcon />
                                          <a
                                            href={`mailto:${app.substitute.email}`}
                                          >
                                            {app.substitute.email}
                                          </a>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="application-card-footer">
                                <span className="application-date">
                                  Jelentkezett: {formatDate(app.appliedAt)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
