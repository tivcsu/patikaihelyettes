"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icons } from "@/components/ui/Icons";
import {
  getLatestAds,
  formatDateRange,
  getQualificationLabel,
} from "@/lib/firestoreService";
import { AdWithPharmacy } from "@/types";

export default function LatestAds() {
  const [ads, setAds] = useState<AdWithPharmacy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAds() {
      try {
        const latestAds = await getLatestAds(3);
        setAds(latestAds);
      } catch (error) {
        console.error("Error fetching latest ads:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAds();
  }, []);

  // Don't render the section if there are no ads
  if (!loading && ads.length === 0) {
    return null;
  }

  return (
    <section className="latest-ads-section section">
      <div className="section-header">
        <span className="section-label">Friss lehetőségek</span>
        <h2 className="section-title">Legfrissebb hirdetések</h2>
        <p className="section-subtitle">
          Böngészd a legújabb helyettesítői pozíciókat országszerte
        </p>
      </div>

      {loading ? (
        <div className="ads-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="ad-card ad-card-skeleton">
              <div className="skeleton skeleton-badge"></div>
              <div className="skeleton skeleton-title"></div>
              <div className="skeleton skeleton-text"></div>
              <div className="skeleton skeleton-meta"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="ads-grid">
          {ads.map((ad) => (
            <div key={ad.id} className="ad-card">
              <div className="ad-card-header">
                <div className="ad-badge">
                  {getQualificationLabel(ad.position)}
                </div>
              </div>
              <h3 className="ad-title">{ad.pharmacy?.name || "Patika"}</h3>
              <p className="ad-pharmacy">
                {ad.address?.city}, {ad.address?.street}
              </p>
              <div className="ad-meta">
                <span className="ad-meta-item">
                  <Icons.MapPin />
                  {ad.address?.region}
                </span>
                <span className="ad-meta-item">
                  <Icons.Calendar />
                  {formatDateRange(ad.dateFrom, ad.dateTo)}
                </span>
              </div>
              <Link href={`/ads/${ad.id}`} className="ad-link">
                <span>Részletek</span>
                <Icons.ArrowRight />
              </Link>
            </div>
          ))}
        </div>
      )}

      <div className="view-all-container">
        <Link href="/ads" className="btn btn-outline btn-lg">
          Összes hirdetés megtekintése
        </Link>
      </div>
    </section>
  );
}
