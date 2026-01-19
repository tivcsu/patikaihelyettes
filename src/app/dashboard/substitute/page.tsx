"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  getSubstituteApplications,
  getOpenAdsWithPharmacy,
  calculateSubstituteStats,
  formatDate,
  formatDateRange,
  formatSalary,
  getStatusLabel,
  getQualificationLabel,
} from "@/lib/firestoreService";
import { ApplicationWithDetails, AdWithPharmacy } from "@/types";
import {
  SearchIcon,
  BriefcaseIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronRightIcon,
  MapPinIcon,
  CalendarIcon,
  UserIcon,
  StarIcon,
  BuildingIcon,
} from "@/components/ui/Icons";

export default function SubstituteDashboard() {
  const router = useRouter();
  const { user, substitute, loading: authLoading } = useAuth();
  const [applications, setApplications] = useState<ApplicationWithDetails[]>(
    []
  );
  const [availableAds, setAvailableAds] = useState<AdWithPharmacy[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Redirect if not logged in or not a substitute
  useEffect(() => {
    if (!authLoading && (!user || user.role !== "SUBSTITUTE")) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Fetch data from Firestore
  useEffect(() => {
    async function fetchData() {
      if (!substitute?.id) return;

      try {
        const [applicationsData, adsData] = await Promise.all([
          getSubstituteApplications(substitute.id),
          getOpenAdsWithPharmacy(),
        ]);
        setApplications(applicationsData);
        setAvailableAds(adsData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setDataLoading(false);
      }
    }

    if (substitute?.id) {
      fetchData();
    }
  }, [substitute?.id]);

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

  if (!user || user.role !== "SUBSTITUTE" || !substitute) {
    return null;
  }

  const stats = calculateSubstituteStats(applications, availableAds.length);

  const pendingApplications = applications.filter(
    (app) => app.status === "PENDING"
  );
  const acceptedApplications = applications.filter(
    (app) => app.status === "ACCEPTED"
  );

  return (
    <div className="dashboard">
      <div className="dashboard-container">
        {/* Header */}
        <header className="dashboard-header">
          <div className="dashboard-header-content">
            <div>
              <h1 className="dashboard-title">
                Üdvözöljük, {substitute.name}!
              </h1>
              <p className="dashboard-subtitle">
                Keresse a legjobb helyettesítési lehetőségeket
              </p>
            </div>
            <Link href="/ads" className="btn btn-primary">
              <SearchIcon />
              Hirdetések böngészése
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
              <span className="stat-label">Függőben</span>
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
          <div className="stat-card">
            <div className="stat-icon stat-icon-secondary">
              <SearchIcon />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.availableAds}</span>
              <span className="stat-label">Elérhető hirdetés</span>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <div className="dashboard-grid">
          {/* Applications */}
          <section className="dashboard-section">
            <div className="section-header-row">
              <h2 className="section-title">Jelentkezéseim</h2>
              {/* <Link href="/applications" className="section-link">
                Összes megtekintése
                <ChevronRightIcon />
              </Link> */}
            </div>

            {applications.length === 0 ? (
              <div className="empty-state">
                <BriefcaseIcon />
                <p>Még nincs jelentkezése</p>
                <Link href="/ads" className="btn btn-outline btn-sm">
                  Hirdetések böngészése
                </Link>
              </div>
            ) : (
              <div className="applications-list-detailed">
                {applications.map((app) => (
                  <div key={app.id} className="application-card">
                    <div className="application-card-status">
                      <span
                        className={`badge badge-${
                          app.status === "PENDING"
                            ? "warning"
                            : app.status === "ACCEPTED"
                            ? "success"
                            : "danger"
                        }`}
                      >
                        {app.status === "PENDING" && <ClockIcon />}
                        {app.status === "ACCEPTED" && <CheckCircleIcon />}
                        {app.status === "REJECTED" && <XCircleIcon />}
                        {getStatusLabel(app.status)}
                      </span>
                    </div>
                    <div className="application-card-content">
                      <h4 className="application-card-title">
                        {app.ad?.position &&
                          getQualificationLabel(app.ad.position)}
                      </h4>
                      <p className="application-card-pharmacy">
                        <BuildingIcon />
                        {app.pharmacy?.name}
                      </p>
                      <div className="application-card-meta">
                        <span>
                          <MapPinIcon />
                          {app.pharmacy?.address?.city}
                        </span>
                        <span>
                          <CalendarIcon />
                          {app.ad &&
                            formatDateRange(app.ad.dateFrom, app.ad.dateTo)}
                        </span>
                      </div>
                      {app.ad && (
                        <p className="application-card-salary">
                          {formatSalary(app.ad.salary)}
                        </p>
                      )}
                    </div>
                    <div className="application-card-footer">
                      <span className="application-card-date">
                        Jelentkezve: {formatDate(app.appliedAt)}
                      </span>
                      <Link
                        href={`/ads/${app.adId}`}
                        className="btn btn-ghost btn-sm"
                      >
                        Részletek
                        <ChevronRightIcon />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recommended Ads */}
          <section className="dashboard-section">
            <div className="section-header-row">
              <h2 className="section-title">Ajánlott hirdetések</h2>
              <Link href="/ads" className="section-link">
                Összes megtekintése
                <ChevronRightIcon />
              </Link>
            </div>

            <div className="recommended-ads">
              {availableAds.slice(0, 3).map((ad) => (
                <div key={ad.id} className="recommended-ad-card">
                  <div className="recommended-ad-header">
                    <span className="badge badge-primary">
                      {getQualificationLabel(ad.position)}
                    </span>
                    <span className="recommended-ad-date">
                      {formatDateRange(ad.dateFrom, ad.dateTo)}
                    </span>
                  </div>
                  <h4 className="recommended-ad-pharmacy">
                    {ad.pharmacy?.name}
                  </h4>
                  <p className="recommended-ad-location">
                    <MapPinIcon />
                    {ad.pharmacy?.address?.city}
                  </p>
                  <p className="recommended-ad-salary">
                    {formatSalary(ad.salary)}
                  </p>
                  <Link
                    href={`/ads/${ad.id}?from=/dashboard/substitute`}
                    className="btn btn-outline btn-sm btn-full"
                  >
                    Jelentkezés
                  </Link>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Profile Card */}
        <section className="dashboard-section profile-section">
          <div className="section-header-row">
            <h2 className="section-title">Profilom</h2>
            <Link href="/profile" className="section-link">
              Szerkesztés
              <ChevronRightIcon />
            </Link>
          </div>

          <div className="profile-card substitute-profile">
            <div className="profile-card-header">
              <div className="profile-avatar profile-avatar-user">
                <UserIcon />
              </div>
              <div>
                <h3 className="profile-name">{substitute.name}</h3>
                <p className="profile-qualification">
                  {getQualificationLabel(substitute.qualification)}
                </p>
              </div>
              <div className="profile-status">
                {substitute.isOpenToWork ? (
                  <span className="badge badge-success">
                    <CheckCircleIcon />
                    Elérhető
                  </span>
                ) : (
                  <span className="badge badge-muted">
                    <XCircleIcon />
                    Nem elérhető
                  </span>
                )}
              </div>
            </div>
            <div className="profile-card-body">
              <div className="profile-stats">
                <div className="profile-stat">
                  <StarIcon />
                  <span>
                    <strong>{substitute.experienceYears || 0}</strong> év
                    tapasztalat
                  </span>
                </div>
                <div className="profile-stat">
                  <MapPinIcon />
                  <span>
                    <strong>{substitute.availableRegions?.length || 0}</strong>{" "}
                    régió
                  </span>
                </div>
              </div>
              <p className="profile-bio">{substitute.bio}</p>
              {substitute.availabilityNote && (
                <div className="profile-availability">
                  <CalendarIcon />
                  <span>{substitute.availabilityNote}</span>
                </div>
              )}
              {substitute.availableRegions &&
                substitute.availableRegions.length > 0 && (
                  <div className="profile-regions">
                    <strong>Elérhető régiók:</strong>
                    <div className="region-tags">
                      {substitute.availableRegions.map((region) => (
                        <span key={region} className="region-tag">
                          {region}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
