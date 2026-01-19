"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAdById,
  getAdApplications,
  formatDate,
  formatDateRange,
  formatSalary,
  getQualificationLabel,
  getStatusLabel,
  deleteAd,
  checkIfAlreadyApplied,
  applyToAd,
} from "@/lib/firestoreService";
import { AdWithPharmacy, ApplicationWithDetails } from "@/types";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../../firebase.config";
import {
  BuildingIcon,
  MapPinIcon,
  CalendarIcon,
  ClockIcon,
  StarIcon,
  BriefcaseIcon,
  PhoneIcon,
  MailIcon,
  UserIcon,
  ChevronRightIcon,
  CheckIcon,
  XIcon,
} from "@/components/ui/Icons";
import "@/styles/pages/ad-details.css";

export default function AdDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pharmacies, substitute, user } = useAuth();

  const [ad, setAd] = useState<AdWithPharmacy | null>(null);
  const [applications, setApplications] = useState<ApplicationWithDetails[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"details" | "applicants">(
    "details"
  );
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const adId = params.id as string;
  const isOwner =
    pharmacies && !!pharmacies.find((p) => p.id === ad?.pharmacyId);
  const isSubstitute = user?.role === "SUBSTITUTE" && substitute;

  // Determine back URL from query param or default to /ads
  const fromParam = searchParams.get("from");
  const backUrl = fromParam || "/ads";

  useEffect(() => {
    async function fetchData() {
      if (!adId) return;

      setLoading(true);
      try {
        const adData = await getAdById(adId);
        setAd(adData);

        // If owner, fetch applications
        if (
          adData &&
          pharmacies &&
          !!pharmacies.find((p) => p.id === adData.pharmacyId)
        ) {
          const apps = await getAdApplications(adId);
          setApplications(apps);
        }

        // If substitute, check if already applied
        if (substitute?.id) {
          const applied = await checkIfAlreadyApplied(adId, substitute.id);
          setHasApplied(applied);
        }
      } catch (error) {
        console.error("Error fetching ad:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [adId, pharmacies, substitute?.id]);

  const handleApply = async () => {
    if (!ad?.id || !substitute?.id || hasApplied || isApplying) return;

    setIsApplying(true);
    try {
      await applyToAd(ad.id, substitute.id);
      setHasApplied(true);
      alert("Sikeres jelentkezés! A patika hamarosan értesíteni fog.");
    } catch (error) {
      console.error("Error applying to ad:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Hiba történt a jelentkezés során."
      );
    } finally {
      setIsApplying(false);
    }
  };

  const handleCloseAd = async () => {
    if (!ad?.id || !isOwner) return;

    try {
      await updateDoc(doc(db, "ads", ad.id), {
        status: "CLOSED",
      });
      setAd({ ...ad, status: "CLOSED" });
    } catch (error) {
      console.error("Error closing ad:", error);
    }
  };

  const handleReopenAd = async () => {
    if (!ad?.id || !isOwner) return;

    try {
      await updateDoc(doc(db, "ads", ad.id), {
        status: "OPEN",
      });
      setAd({ ...ad, status: "OPEN" });
    } catch (error) {
      console.error("Error reopening ad:", error);
    }
  };

  const handleDeleteAd = async () => {
    if (!ad?.id || !isOwner) return;

    if (
      !confirm(
        "Biztosan törölni szeretnéd a hirdetést? Ez a művelet nem vonható vissza, és minden kapcsolódó jelentkezés is törlésre kerül."
      )
    ) {
      return;
    }

    try {
      await deleteAd(ad.id);
      router.push("/dashboard/pharmacy/ads");
    } catch (error) {
      console.error("Error deleting ad:", error);
      alert("Hiba történt a hirdetés törlésekor.");
    }
  };

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

  if (loading) {
    return (
      <div className="ad-details-page">
        <div className="ad-details-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Hirdetés betöltése...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!ad) {
    return (
      <div className="ad-details-page">
        <div className="ad-details-container">
          <div className="error-state">
            <BriefcaseIcon />
            <h2>Hirdetés nem található</h2>
            <p>A keresett hirdetés nem létezik vagy törölve lett.</p>
            <Link href={backUrl} className="btn btn-primary">
              {fromParam
                ? "Vissza az irányítópulthoz"
                : "Vissza a hirdetésekhez"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const pendingCount = applications.filter(
    (app) => app.status === "PENDING"
  ).length;

  return (
    <div className="ad-details-page">
      <div className="ad-details-container">
        {/* Back Link */}
        <Link href={backUrl} className="back-link">
          <ChevronRightIcon />
          {fromParam ? "Vissza az irányítópulthoz" : "Vissza a hirdetésekhez"}
        </Link>

        {/* Header */}
        <header className="ad-details-header">
          <div className="ad-details-header-content">
            <div className="ad-details-badges">
              <span className="badge badge-primary">
                {getQualificationLabel(ad.position)}
              </span>
              <span
                className={`badge ${
                  ad.status === "OPEN" ? "badge-success" : "badge-secondary"
                }`}
              >
                {getStatusLabel(ad.status)}
              </span>
            </div>
            <h1 className="ad-details-title">
              {ad.pharmacy?.name || "Patika"}
            </h1>
            <p className="ad-details-subtitle">
              <MapPinIcon />
              {ad.address?.city}, {ad.address?.street}
            </p>
          </div>

          {/* Owner Actions */}
          {isOwner && (
            <div className="ad-details-actions">
              <Link
                href={`/ads/${ad.id}/edit`}
                className="btn btn-outline btn-sm"
              >
                Szerkesztés
              </Link>
              {ad.status === "OPEN" ? (
                <button
                  onClick={handleCloseAd}
                  className="btn btn-warning btn-sm"
                >
                  Lezárás
                </button>
              ) : (
                <button
                  onClick={handleReopenAd}
                  className="btn btn-primary btn-sm"
                >
                  Újranyitás
                </button>
              )}
              <button
                onClick={handleDeleteAd}
                className="btn btn-danger btn-sm"
              >
                Törlés
              </button>
            </div>
          )}
        </header>

        {/* Tabs for Owner */}
        {isOwner && (
          <div className="ad-details-tabs">
            <button
              className={`tab-btn ${activeTab === "details" ? "active" : ""}`}
              onClick={() => setActiveTab("details")}
            >
              Részletek
            </button>
            <button
              className={`tab-btn ${
                activeTab === "applicants" ? "active" : ""
              }`}
              onClick={() => setActiveTab("applicants")}
            >
              Jelentkezők
              {pendingCount > 0 && (
                <span className="tab-badge">{pendingCount}</span>
              )}
            </button>
          </div>
        )}

        {/* Content */}
        {activeTab === "details" ? (
          <div className="ad-details-content">
            {/* Main Info Card */}
            <div className="ad-details-card">
              <h2 className="card-title">
                <CalendarIcon />
                Időpont és munkaidő
              </h2>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Időszak</span>
                  <span className="info-value">
                    {formatDateRange(ad.dateFrom, ad.dateTo)}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Munkaidő</span>
                  <span className="info-value">
                    {ad.startTime} - {ad.endTime}
                  </span>
                </div>
              </div>
            </div>

            {/* Location Card */}
            <div className="ad-details-card">
              <h2 className="card-title">
                <MapPinIcon />
                Helyszín
              </h2>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Cím</span>
                  <span className="info-value">
                    {ad.address?.zip} {ad.address?.city}, {ad.address?.street}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Régió</span>
                  <span className="info-value">{ad.address?.region}</span>
                </div>
              </div>
            </div>

            {/* Salary Card */}
            <div className="ad-details-card">
              <h2 className="card-title">
                <StarIcon />
                Díjazás
              </h2>
              {ad.salary?.amount ? (
                <div className="salary-display">
                  <span className="salary-amount">
                    {ad.salary.amount.toLocaleString("hu-HU")} Ft
                  </span>
                  <span className="salary-details">
                    / {ad.salary.type === "órabér" ? "óra" : "nap"} (
                    {ad.salary.basis})
                  </span>
                  {ad.salary.invoiceRequired && (
                    <span className="salary-note">Számla szükséges</span>
                  )}
                </div>
              ) : (
                <p className="info-na">Egyeztetés alapján</p>
              )}
            </div>

            {/* Requirements Card */}
            {ad.experienceRequired && ad.experienceRequired > 0 && (
              <div className="ad-details-card">
                <h2 className="card-title">
                  <BriefcaseIcon />
                  Követelmények
                </h2>
                <div className="info-item">
                  <span className="info-label">Minimum tapasztalat</span>
                  <span className="info-value">{ad.experienceRequired} év</span>
                </div>
              </div>
            )}

            {/* Description Card */}
            {ad.description && (
              <div className="ad-details-card ad-details-card-full">
                <h2 className="card-title">
                  <BriefcaseIcon />
                  Leírás
                </h2>
                <p className="description-text">{ad.description}</p>
              </div>
            )}

            {/* Notes Card */}
            {ad.notes && (
              <div className="ad-details-card ad-details-card-full">
                <h2 className="card-title">Megjegyzés</h2>
                <p className="description-text">{ad.notes}</p>
              </div>
            )}

            {/* Contact Card */}
            <div className="ad-details-card ad-details-card-full">
              <h2 className="card-title">
                <BuildingIcon />
                Kapcsolat
              </h2>
              <div className="contact-grid">
                <div className="contact-item">
                  <BuildingIcon />
                  <span>{ad.pharmacy?.name}</span>
                </div>
                {(ad.email || ad.pharmacy?.email) && (
                  <a
                    href={`mailto:${ad.email || ad.pharmacy?.email}`}
                    className="contact-item contact-link"
                  >
                    <MailIcon />
                    <span>{ad.email || ad.pharmacy?.email}</span>
                  </a>
                )}
                {(ad.phone || ad.pharmacy?.phone) && (
                  <a
                    href={`tel:${ad.phone || ad.pharmacy?.phone}`}
                    className="contact-item contact-link"
                  >
                    <PhoneIcon />
                    <span>{ad.phone || ad.pharmacy?.phone}</span>
                  </a>
                )}
              </div>
            </div>

            {/* Apply Button for non-owners */}
            {!isOwner && isSubstitute && ad.status === "OPEN" && (
              <div className="ad-details-apply">
                {hasApplied ? (
                  <div className="already-applied">
                    <CheckIcon />
                    <span>Már jelentkeztél erre a hirdetésre</span>
                  </div>
                ) : (
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={handleApply}
                    disabled={isApplying}
                  >
                    {isApplying ? "Jelentkezés..." : "Jelentkezés küldése"}
                  </button>
                )}
              </div>
            )}

            {/* Login prompt for guests */}
            {!user && ad.status === "OPEN" && (
              <div className="ad-details-apply">
                <p className="login-prompt">
                  <Link href="/login">Jelentkezz be</Link> vagy{" "}
                  <Link href="/register">regisztrálj</Link> a jelentkezéshez
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Applicants Tab */
          <div className="applicants-content">
            {applications.length === 0 ? (
              <div className="empty-applicants">
                <UserIcon />
                <h3>Még nincs jelentkező</h3>
                <p>
                  A hirdetésre még nem érkezett jelentkezés. Amint valaki
                  jelentkezik, itt fogod látni.
                </p>
              </div>
            ) : (
              <div className="applicants-list">
                {applications.map((app) => (
                  <div key={app.id} className="applicant-card">
                    <div className="applicant-header">
                      <div className="applicant-info">
                        <h3 className="applicant-name">
                          <UserIcon />
                          {app.substitute?.name || "Ismeretlen helyettes"}
                        </h3>
                        <span className="applicant-qualification">
                          {app.substitute?.qualification &&
                            getQualificationLabel(app.substitute.qualification)}
                          {app.substitute?.experienceYears &&
                            ` • ${app.substitute.experienceYears} év tapasztalat`}
                        </span>
                      </div>
                      <span
                        className={`badge ${
                          app.status === "PENDING"
                            ? "badge-warning"
                            : app.status === "ACCEPTED"
                            ? "badge-success"
                            : "badge-secondary"
                        }`}
                      >
                        {getStatusLabel(app.status)}
                      </span>
                    </div>

                    {/* Contact Info */}
                    {(app.substitute?.phone || app.substitute?.email) && (
                      <div className="applicant-contact">
                        {app.substitute?.email && (
                          <a
                            href={`mailto:${app.substitute.email}`}
                            className="applicant-contact-item"
                          >
                            <MailIcon />
                            <span>{app.substitute.email}</span>
                          </a>
                        )}
                        {app.substitute?.phone && (
                          <a
                            href={`tel:${app.substitute.phone}`}
                            className="applicant-contact-item"
                          >
                            <PhoneIcon />
                            <span>{app.substitute.phone}</span>
                          </a>
                        )}
                      </div>
                    )}

                    {app.substitute?.bio && (
                      <p className="applicant-bio">{app.substitute.bio}</p>
                    )}

                    <div className="applicant-footer">
                      <span className="applicant-date">
                        <ClockIcon />
                        Jelentkezett: {formatDate(app.appliedAt)}
                      </span>

                      {app.status === "PENDING" && (
                        <div className="applicant-actions">
                          <button
                            onClick={() =>
                              handleApplicationStatus(app.id!, "ACCEPTED")
                            }
                            disabled={updatingStatus === app.id}
                            className="btn btn-success btn-sm"
                          >
                            <CheckIcon />
                            Elfogadás
                          </button>
                          <button
                            onClick={() =>
                              handleApplicationStatus(app.id!, "REJECTED")
                            }
                            disabled={updatingStatus === app.id}
                            className="btn btn-outline btn-sm"
                          >
                            <XIcon />
                            Elutasítás
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Created At Footer */}
        <footer className="ad-details-footer">
          <span className="created-at">
            Létrehozva: {formatDate(ad.createdAt)}
          </span>
        </footer>
      </div>
    </div>
  );
}
