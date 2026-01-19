"use client";

import {
  BriefcaseIcon,
  BuildingIcon,
  CalendarIcon,
  ChevronRightIcon,
  ClockIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  StarIcon,
  XIcon,
} from "@/components/ui/Icons";
import {
  formatDate,
  formatDateRange,
  formatSalary,
  getAdsByPositionAndRegion,
  getQualificationLabel,
} from "@/lib/firestoreService";
import { AdWithPharmacy, Qualification } from "@/types";
import Link from "next/link";
import { useEffect, useState } from "react";
import { REGIONS } from "../constants/regions";

const QUALIFICATIONS: Qualification[] = [
  "GYÓGYSZERÉSZ",
  "SZAKASSZISZTENS",
  "ASSZISZTENS",
];

const STORAGE_KEY = "ads-filters";

interface StoredFilters {
  qualification: string;
  region: string;
  showOnlyWithSalary: boolean;
  searchQuery: string;
  dateFrom: string;
  dateTo: string;
}

function getStoredFilters(): StoredFilters | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function storeFilters(filters: StoredFilters) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // Ignore storage errors
  }
}

export default function AdsPage() {
  const [ads, setAds] = useState<AdWithPharmacy[]>([]);
  const [filteredAds, setFilteredAds] = useState<AdWithPharmacy[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Filters
  const [selectedQualification, setSelectedQualification] =
    useState<string>("");
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [showOnlyWithSalary, setShowOnlyWithSalary] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [dateTo, setDateTo] = useState<string>("");

  // Load stored filters on mount
  useEffect(() => {
    const stored = getStoredFilters();
    if (stored) {
      setSelectedQualification(stored.qualification);
      setSelectedRegion(stored.region);
      setDateFrom(stored.dateFrom || new Date().toISOString().split("T")[0]);
      setDateTo(stored.dateTo || "");
      setShowOnlyWithSalary(stored.showOnlyWithSalary);
      setSearchQuery(stored.searchQuery);
    }
    setInitialized(true);
  }, []);

  // Store filters when they change
  useEffect(() => {
    if (!initialized) return;
    storeFilters({
      qualification: selectedQualification,
      region: selectedRegion,
      showOnlyWithSalary,
      searchQuery,
      dateFrom,
      dateTo,
    });
  }, [
    initialized,
    selectedQualification,
    selectedRegion,
    showOnlyWithSalary,
    searchQuery,
    dateFrom,
    dateTo,
    showOnlyWithSalary,
    searchQuery,
  ]);

  // Fetch ads when both position and region are selected
  useEffect(() => {
    async function fetchAds() {
      if (!initialized) return;
      if (!selectedQualification || !selectedRegion) {
        setAds([]);
        setFilteredAds([]);
        return;
      }
      setLoading(true);
      try {
        const data = await getAdsByPositionAndRegion(
          selectedQualification as Qualification,
          selectedRegion,
          dateFrom,
          dateTo
        );
        setAds(data);
        setFilteredAds(data);
      } catch (error) {
        console.error("Error fetching ads:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAds();
  }, [initialized, selectedQualification, selectedRegion, dateFrom, dateTo]);

  // Apply UI-side filters (salary and search)
  useEffect(() => {
    let result = [...ads];

    // Filter by salary
    if (showOnlyWithSalary) {
      result = result.filter((ad) => ad.salary?.amount && ad.salary.amount > 0);
    }

    // Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((ad) => {
        const pharmacyName = ad.pharmacy?.name?.toLowerCase() || "";
        const city = ad.pharmacy?.address?.city?.toLowerCase() || "";
        const description = ad.description?.toLowerCase() || "";
        return (
          pharmacyName.includes(query) ||
          city.includes(query) ||
          description.includes(query)
        );
      });
    }

    setFilteredAds(result);
  }, [ads, showOnlyWithSalary, searchQuery]);

  const clearFilters = () => {
    setSelectedQualification("");
    setSelectedRegion("");
    setShowOnlyWithSalary(false);
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
  };

  const activeFiltersCount = [selectedQualification, selectedRegion].filter(
    Boolean
  ).length;

  const filtersSelected = selectedQualification && selectedRegion;

  return (
    <div className="ads-page">
      <div className="ads-container">
        {/* Header */}
        <header className="ads-header">
          <div className="ads-header-content">
            <h1 className="ads-title">Hirdetések</h1>
            <p className="ads-subtitle">
              {filteredAds.length} aktív hirdetés{" "}
              {activeFiltersCount > 0 && `(${ads.length} összesen)`}
            </p>
          </div>
        </header>

        {/* Search and Filter Bar */}
        {/*    <div className="ads-toolbar">
          <div className="search-box">
            <SearchIcon />
            <input
              type="text"
              placeholder="Keresés patika, város vagy leírás alapján..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="search-clear"
              >
                <XIcon />
              </button>
            )}
          </div>
        </div> */}

        {/* Filter Panel */}
        <div className="filter-panel">
          <div className="filter-grid">
            {/* Qualification Filter */}
            <div className="filter-group">
              <label className="filter-label">Pozíció</label>
              <select
                value={selectedQualification}
                onChange={(e) => setSelectedQualification(e.target.value)}
                className="filter-select"
              >
                <option value="">Összes pozíció</option>
                {QUALIFICATIONS.map((q) => (
                  <option key={q} value={q}>
                    {getQualificationLabel(q)}
                  </option>
                ))}
              </select>
            </div>

            {/* Region Filter */}
            <div className="filter-group">
              <label className="filter-label">Régió</label>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="filter-select"
              >
                <option value="">Összes régió</option>
                {REGIONS.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From Filter */}
            <div className="filter-group">
              <label className="filter-label">Ettől</label>
              <div className="date-input-wrapper">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="filter-date-input"
                />
                {dateFrom && (
                  <button
                    onClick={() => setDateFrom("")}
                    className="date-clear"
                    type="button"
                  >
                    <XIcon />
                  </button>
                )}
              </div>
            </div>

            {/* Date To Filter */}
            <div className="filter-group">
              <label className="filter-label">Eddig</label>
              <div className="date-input-wrapper">
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="filter-date-input"
                />
                {dateTo && (
                  <button
                    onClick={() => setDateTo("")}
                    className="date-clear"
                    type="button"
                  >
                    <XIcon />
                  </button>
                )}
              </div>
            </div>

            {/* Salary Filter */}
            <div className="filter-group filter-group-checkbox">
              <label className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={showOnlyWithSalary}
                  onChange={(e) => setShowOnlyWithSalary(e.target.checked)}
                />
                <span className="filter-checkbox-mark"></span>
                <span>Csak fizetéssel megadott hirdetések</span>
              </label>
            </div>
          </div>

          {/* {activeFiltersCount > 0 && (
            <button onClick={clearFilters} className="clear-filters-btn">
              <XIcon />
              Szűrők törlése
            </button>
          )} */}
        </div>

        {/* Ads List */}
        {!filtersSelected ? (
          <div className="empty-state">
            <BriefcaseIcon />
            <h3>Válassz szűrőket</h3>
            <p>
              Kérjük, válaszd ki a pozíciót és a régiót a hirdetések
              megtekintéséhez.
            </p>
          </div>
        ) : loading ? (
          <div className="empty-state">
            <div className="loading-spinner"></div>
            <p>Hirdetések betöltése...</p>
          </div>
        ) : filteredAds.length === 0 ? (
          <div className="empty-state">
            <BriefcaseIcon />
            <h3>Nincs találat</h3>
            <p>A megadott szűrőknek megfelelő hirdetés nem található.</p>
            <button onClick={clearFilters} className="btn btn-outline">
              Szűrők törlése
            </button>
          </div>
        ) : (
          <div className="ads-list">
            {filteredAds.map((ad) => (
              <Link key={ad.id} href={`/ads/${ad.id}`} className="ad-card">
                <div className="ad-card-header">
                  <span className="badge badge-primary">
                    {getQualificationLabel(ad.position)}
                  </span>
                  <span className="ad-card-date">
                    <ClockIcon />
                    {ad.createdAt && formatDate(ad.createdAt)}
                  </span>
                </div>

                <div className="ad-card-body">
                  <h3 className="ad-card-pharmacy">
                    <BuildingIcon />
                    {ad.pharmacy?.name || "Ismeretlen patika"}
                  </h3>

                  <div className="ad-card-meta">
                    <span className="ad-card-location">
                      <MapPinIcon />
                      {ad.pharmacy?.address?.city || "—"}
                    </span>
                    <span className="ad-card-time">
                      <CalendarIcon />
                      {formatDateRange(ad.dateFrom, ad.dateTo)}
                    </span>
                  </div>

                  <div className="ad-card-contact">
                    {ad.email && (
                      <span className="ad-card-email">
                        <MailIcon />
                        {ad.email}
                      </span>
                    )}
                    {ad.phone && (
                      <span className="ad-card-phone">
                        <PhoneIcon />
                        {ad.phone}
                      </span>
                    )}
                  </div>

                  {ad.description && (
                    <p className="ad-card-description">
                      {ad.description.length > 120
                        ? `${ad.description.substring(0, 120)}...`
                        : ad.description}
                    </p>
                  )}
                </div>

                <div className="ad-card-footer">
                  {ad.salary?.amount ? (
                    <span className="ad-card-salary">
                      <StarIcon />
                      {formatSalary(ad.salary)}
                    </span>
                  ) : (
                    <span className="ad-card-salary-na">
                      Fizetés: egyeztetés után
                    </span>
                  )}
                  <span className="ad-card-cta">
                    Részletek
                    <ChevronRightIcon />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
