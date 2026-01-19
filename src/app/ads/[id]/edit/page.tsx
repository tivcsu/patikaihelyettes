"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { getAdById } from "@/lib/firestoreService";
import { AdWithPharmacy } from "@/types";
import AdForm from "@/components/ads/NewAdForm";
import {
  FileTextIcon,
  BriefcaseIcon,
  ChevronRightIcon,
} from "@/components/ui/Icons";
import "@/styles/pages/ads.css";

export default function EditAdPage() {
  const params = useParams();
  const { pharmacies } = useAuth();

  const [loading, setLoading] = useState(true);
  const [ad, setAd] = useState<AdWithPharmacy | null>(null);
  const [error, setError] = useState("");

  const adId = params.id as string;

  useEffect(() => {
    async function fetchAd() {
      if (!adId) return;

      setLoading(true);
      try {
        const adData = await getAdById(adId);

        if (!adData) {
          setError("Hirdetés nem található");
          return;
        }

        // Check ownership
        if (pharmacies && !pharmacies.find((p) => p.id === adData.pharmacyId)) {
          setError("Nincs jogosultságod szerkeszteni ezt a hirdetést");
          return;
        }

        setAd(adData);
      } catch (err) {
        console.error("Error fetching ad:", err);
        setError("Hiba történt a hirdetés betöltésekor");
      } finally {
        setLoading(false);
      }
    }
    fetchAd();
  }, [adId, pharmacies]);

  if (loading) {
    return (
      <div className="new-ad-page">
        <div className="empty-state">
          <div className="loading-spinner"></div>
          <p>Hirdetés betöltése...</p>
        </div>
      </div>
    );
  }

  if (error || !ad) {
    return (
      <div className="new-ad-page">
        <div className="empty-state">
          <BriefcaseIcon />
          <h3>Hiba</h3>
          <p>{error || "Hirdetés nem található"}</p>
          <Link href="/ads" className="btn btn-primary">
            Vissza a hirdetésekhez
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="new-ad-page">
      <div className="page-header-hero">
        <Link href={`/ads/${adId}`} className="back-link">
          <ChevronRightIcon />
          Vissza a hirdetéshez
        </Link>
        <div className="page-header-icon">
          <FileTextIcon />
        </div>
        <h1 className="page-header-title">Hirdetés szerkesztése</h1>
        <p className="page-header-subtitle">Módosítsd a hirdetés adatait</p>
      </div>
      <AdForm editAd={ad} />
    </div>
  );
}
