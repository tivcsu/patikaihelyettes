"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  BuildingIcon,
  MapPinIcon,
  BriefcaseIcon,
  CalendarIcon,
  ClockIcon,
  StarIcon,
  FileTextIcon,
  CheckIcon,
  ArrowRightIcon,
} from "@/components/ui/Icons";
import {
  addDoc,
  collection,
  doc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../../firebase.config";
import { REGIONS } from "@/app/constants/regions";
import { AdWithPharmacy } from "@/types";

type PositionType = "GYÓGYSZERÉSZ" | "SZAKASSZISZTENS" | "ASSZISZTENS";
type ShiftType = "egész nap" | "délelőtt" | "délután";
type CompensationType = "órabér" | "napidíj";
type CompensationBasis = "nettó" | "bruttó";

const steps = [
  { id: 1, name: "Patika", icon: BuildingIcon },
  { id: 2, name: "Pozíció", icon: BriefcaseIcon },
  { id: 3, name: "Időpont", icon: CalendarIcon },
  { id: 4, name: "Díjazás", icon: StarIcon },
  { id: 5, name: "Részletek", icon: FileTextIcon },
];

// Helper to convert Timestamp to date string
const timestampToDateString = (
  timestamp: Timestamp | Date | undefined
): string => {
  if (!timestamp) return "";
  const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
  return date.toISOString().split("T")[0];
};

interface AdFormProps {
  editAd?: AdWithPharmacy;
}

export default function AdForm({ editAd }: AdFormProps = {}) {
  const router = useRouter();
  const { user, pharmacies } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [maxStepReached, setMaxStepReached] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!editAd;

  // Form state
  const [formData, setFormData] = useState({
    // Pharmacy selection
    selectedPharmacyId: "",
    // Pharmacy info
    pharmacyName: "",
    postalCode: "",
    city: "",
    street: "",
    region: "",
    email: "",
    phone: "",

    // Position
    positionType: "" as PositionType | "",

    // Date & Time
    startDate: "",
    endDate: "",
    shiftType: "egész nap" as ShiftType,
    startTime: "",
    endTime: "",

    // Compensation
    compensationType: "órabér" as CompensationType,
    compensationBasis: "nettó" as CompensationBasis,
    compensationAmount: "",
    invoiceCapable: false,

    // Other
    description: "",
    experienceYears: "",
    notes: "",
  });

  // Preload data - either from editAd or pharmacy profile
  useEffect(() => {
    if (editAd) {
      // Edit mode - load ad data and allow navigation to all steps
      setMaxStepReached(steps.length);
      setFormData({
        selectedPharmacyId: editAd.pharmacyId || "",
        pharmacyName: editAd.pharmacy?.name || "",
        postalCode: editAd.address?.zip || "",
        city: editAd.address?.city || "",
        street: editAd.address?.street || "",
        region: editAd.address?.region || "",
        email: editAd.email || editAd.pharmacy?.email || "",
        phone: editAd.phone || editAd.pharmacy?.phone || "",
        positionType: editAd.position || "",
        startDate: timestampToDateString(editAd.dateFrom),
        endDate: timestampToDateString(editAd.dateTo),
        shiftType: "egész nap",
        startTime: editAd.startTime || "",
        endTime: editAd.endTime || "",
        compensationType: editAd.salary?.type || "órabér",
        compensationBasis: editAd.salary?.basis || "nettó",
        compensationAmount: editAd.salary?.amount?.toString() || "",
        invoiceCapable: editAd.salary?.invoiceRequired || false,
        description: editAd.description || "",
        experienceYears: editAd.experienceRequired?.toString() || "",
        notes: editAd.notes || "",
      });
    } else if (pharmacies && pharmacies.length > 0 && user) {
      // Create mode - preload first pharmacy data
      const firstPharmacy = pharmacies[0];
      setFormData((prev) => ({
        ...prev,
        selectedPharmacyId: firstPharmacy.id || "",
        pharmacyName: firstPharmacy.name || "",
        postalCode: firstPharmacy.address?.zip || "",
        city: firstPharmacy.address?.city || "",
        street: firstPharmacy.address?.street || "",
        region: firstPharmacy.address?.region || "",
        email: firstPharmacy.email || "",
        phone: firstPharmacy.phone || "",
      }));
    }
  }, [editAd, pharmacies, user]);

  const handlePharmacySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pharmacyId = e.target.value;
    setFormData((prev) => ({ ...prev, selectedPharmacyId: pharmacyId }));

    if (pharmacyId && pharmacies) {
      const selectedPharmacy = pharmacies.find((p) => p.id === pharmacyId);
      if (selectedPharmacy) {
        setFormData((prev) => ({
          ...prev,
          selectedPharmacyId: pharmacyId,
          pharmacyName: selectedPharmacy.name || "",
          postalCode: selectedPharmacy.address?.zip || "",
          city: selectedPharmacy.address?.city || "",
          street: selectedPharmacy.address?.street || "",
          region: selectedPharmacy.address?.region || "",
          email: selectedPharmacy.email || "",
          phone: selectedPharmacy.phone || "",
        }));
      }
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Only allow submission on the last step
    if (currentStep !== steps.length) {
      return;
    }

    setIsSubmitting(true);

    const adData = {
      position: formData.positionType,
      name: formData.pharmacyName,
      phone: formData?.phone || "",
      email: formData?.email || "",
      address: {
        zip: formData.postalCode,
        city: formData.city,
        street: formData.street,
        region: formData.region,
      },
      dateFrom: new Date(formData.startDate),
      dateTo: formData.endDate ? new Date(formData.endDate) : null,
      startTime: formData.startTime,
      endTime: formData.endTime,
      salary: {
        amount: formData.compensationAmount
          ? Number(formData.compensationAmount)
          : null,
        type: formData.compensationType,
        basis: formData.compensationBasis,
        invoiceRequired: formData.invoiceCapable,
      },
      description: formData.description,
      experienceRequired: formData.experienceYears
        ? Number(formData.experienceYears)
        : null,
      notes: formData.notes,
    };

    try {
      if (isEditMode && editAd?.id) {
        // Update existing ad
        await updateDoc(doc(db, "ads", editAd.id), adData);
        router.push(`/ads/${editAd.id}`);
      } else {
        // Create new ad
        await addDoc(collection(db, "ads"), {
          ...adData,
          pharmacyId: formData.selectedPharmacyId,
          status: "OPEN",
          createdAt: new Date(),
        });
        router.push("/dashboard/pharmacy");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      alert(
        isEditMode
          ? "Hiba történt a hirdetés mentésekor."
          : "Hiba történt a hirdetés feladása során."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1: // Pharmacy info
        return !!(
          formData.pharmacyName &&
          formData.region &&
          formData.postalCode &&
          formData.city &&
          formData.street
        );
      case 2: // Position
        return !!formData.positionType;
      case 3: // Date & Time
        return !!(formData.startDate && formData.startTime && formData.endTime);
      case 4: // Compensation
        return true;
      case 5: // Details
        return !!formData.description;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length && validateCurrentStep()) {
      const nextStepNum = currentStep + 1;
      setCurrentStep(nextStepNum);
      setMaxStepReached(Math.max(maxStepReached, nextStepNum));
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step: number) => {
    // Allow navigation to any step that has been reached before
    if (step <= maxStepReached) {
      setCurrentStep(step);
    }
  };

  return (
    <div className="ad-form-wizard">
      {/* Progress Steps */}
      <div className="wizard-progress">
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;

          return (
            <div key={step.id} className="wizard-step-wrapper">
              <button
                type="button"
                onClick={() => goToStep(step.id)}
                className={`wizard-step ${isCurrent ? "active" : ""} ${
                  isCompleted ? "completed" : ""
                }`}
                disabled={step.id > maxStepReached}
              >
                <span className="wizard-step-icon">
                  {isCompleted ? <CheckIcon /> : <StepIcon />}
                </span>
                <span className="wizard-step-name">{step.name}</span>
              </button>
              {index < steps.length - 1 && (
                <div
                  className={`wizard-step-connector ${
                    isCompleted ? "completed" : ""
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="ad-form">
        {/* Step 1: Pharmacy Information */}
        {currentStep === 1 && (
          <section className="form-section form-section-active">
            <div className="form-section-header">
              <div className="form-section-icon">
                <BuildingIcon />
              </div>
              <div>
                <h2 className="form-section-title">
                  Add meg a gyógyszertár adatait
                </h2>
              </div>
            </div>

            <div className="form-grid">
              {pharmacies && pharmacies.length > 0 && (
                <div className="form-group form-group-full">
                  <label
                    htmlFor="pharmacySelect"
                    className="form-label required"
                  >
                    Válassz patikát
                  </label>
                  <select
                    id="pharmacySelect"
                    name="pharmacySelect"
                    value={formData.selectedPharmacyId}
                    onChange={handlePharmacySelect}
                    className="form-input"
                    required
                  >
                    <option value="">Válassz egy patikát</option>
                    {pharmacies.map((pharmacy) => (
                      <option key={pharmacy.id} value={pharmacy.id}>
                        {pharmacy.name} - {pharmacy.address?.city}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group form-group-full">
                <label htmlFor="pharmacyName" className="form-label required">
                  Patika neve
                </label>
                <input
                  type="text"
                  id="pharmacyName"
                  name="pharmacyName"
                  value={formData.pharmacyName}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="pl. Központi Patika"
                  required
                />
              </div>
              <div className="form-group-full">
                <label htmlFor="region" className="form-label required">
                  Régió
                </label>
                <select
                  id="region"
                  name="region"
                  value={formData.region}
                  onChange={handleChange}
                  className="form-input"
                  required
                >
                  <option value="">Válasszon megyét</option>
                  {REGIONS.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="postalCode" className="form-label required">
                  Irányítószám
                </label>
                <input
                  type="text"
                  id="postalCode"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="1234"
                  pattern="[0-9]{4}"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="city" className="form-label required">
                  Város
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="pl. Budapest"
                  required
                />
              </div>

              <div className="form-group form-group-full">
                <label htmlFor="street" className="form-label required">
                  Utca, házszám
                </label>
                <input
                  type="text"
                  id="street"
                  name="street"
                  value={formData.street}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="pl. Fő utca 12."
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email
                </label>
                <input
                  type="text"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="phone" className="form-label">
                  Telefonszám
                </label>
                <input
                  type="text"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>
            </div>
          </section>
        )}

        {/* Step 2: Position Type */}
        {currentStep === 2 && (
          <section className="form-section form-section-active">
            <div className="form-section-header">
              <div className="form-section-icon">
                <BriefcaseIcon />
              </div>
              <div>
                <h2 className="form-section-title">
                  Válaszd ki, milyen helyettesítőt keresel
                </h2>
              </div>
            </div>

            <div className="position-selector">
              {[
                {
                  value: "GYÓGYSZERÉSZ",
                  label: "Gyógyszerész",
                  description: "Diplomás gyógyszerész szakember",
                },
                {
                  value: "SZAKASSZISZTENS",
                  label: "Szakasszisztens",
                  description: "Gyógyszertári szakasszisztens",
                },
                {
                  value: "ASSZISZTENS",
                  label: "Asszisztens",
                  description: "Gyógyszertári asszisztens",
                },
              ].map((position) => (
                <label
                  key={position.value}
                  className={`position-card ${
                    formData.positionType === position.value ? "selected" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="positionType"
                    value={position.value}
                    checked={formData.positionType === position.value}
                    onChange={handleChange}
                    className="position-radio"
                  />
                  <div className="position-card-content">
                    <span className="position-card-icon">
                      <BriefcaseIcon />
                    </span>
                    <span className="position-card-label">
                      {position.label}
                    </span>
                    <span className="position-card-description">
                      {position.description}
                    </span>
                  </div>
                  <span className="position-card-check">
                    <CheckIcon />
                  </span>
                </label>
              ))}
            </div>
          </section>
        )}

        {/* Step 3: Time & Conditions */}
        {currentStep === 3 && (
          <section className="form-section form-section-active">
            <div className="form-section-header">
              <div className="form-section-icon">
                <CalendarIcon />
              </div>
              <div>
                <h2 className="form-section-title">
                  Mikor és meddig van szükséged helyettesítőre?
                </h2>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="startDate" className="form-label required">
                  Kezdő dátum
                </label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className="form-input"
                  min={new Date().toISOString().split("T")[0]}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="endDate" className="form-label">
                  Befejező dátum
                </label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  className="form-input"
                  min={
                    formData.startDate || new Date().toISOString().split("T")[0]
                  }
                />
                <small className="form-hint">Hagyd üresen, ha egynapos</small>
              </div>

              {/* <div className="form-group form-group-full">
                <label className="form-label required">Műszak</label>
                <div className="shift-selector">
                  {[
                    { value: "egész nap", label: "Egész nap", icon: "☀️" },
                    { value: "délelőtt", label: "Délelőtt", icon: "🌅" },
                    { value: "délután", label: "Délután", icon: "🌇" },
                  ].map((shift) => (
                    <label
                      key={shift.value}
                      className={`shift-option ${
                        formData.shiftType === shift.value ? "selected" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="shiftType"
                        value={shift.value}
                        checked={formData.shiftType === shift.value}
                        onChange={handleChange}
                      />
                      <span className="shift-icon">{shift.icon}</span>
                      <span className="shift-label">{shift.label}</span>
                    </label>
                  ))}
                </div>
              </div> */}

              <div className="form-group">
                <label htmlFor="startTime" className="form-label required">
                  Kezdés időpontja
                </label>
                <input
                  type="time"
                  id="startTime"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="endTime" className="form-label required">
                  Befejezés időpontja
                </label>
                <input
                  type="time"
                  id="endTime"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>
            </div>
          </section>
        )}

        {/* Step 4: Compensation */}
        {currentStep === 4 && (
          <section className="form-section form-section-active">
            <div className="form-section-header">
              <div className="form-section-icon">
                <StarIcon />
              </div>
              <div>
                <h2 className="form-section-title">
                  Add meg a fizetési feltételeket
                </h2>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label ">Díjazás típusa</label>
                <div className="toggle-group">
                  <label
                    className={`toggle-option ${
                      formData.compensationType === "órabér" ? "selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="compensationType"
                      value="órabér"
                      checked={formData.compensationType === "órabér"}
                      onChange={handleChange}
                    />
                    <span>Órabér</span>
                  </label>
                  <label
                    className={`toggle-option ${
                      formData.compensationType === "napidíj" ? "selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="compensationType"
                      value="napidíj"
                      checked={formData.compensationType === "napidíj"}
                      onChange={handleChange}
                    />
                    <span>Napidíj</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label ">Összeg alapja</label>
                <div className="toggle-group">
                  <label
                    className={`toggle-option ${
                      formData.compensationBasis === "nettó" ? "selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="compensationBasis"
                      value="nettó"
                      checked={formData.compensationBasis === "nettó"}
                      onChange={handleChange}
                    />
                    <span>Nettó</span>
                  </label>
                  <label
                    className={`toggle-option ${
                      formData.compensationBasis === "bruttó" ? "selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="compensationBasis"
                      value="bruttó"
                      checked={formData.compensationBasis === "bruttó"}
                      onChange={handleChange}
                    />
                    <span>Bruttó</span>
                  </label>
                </div>
              </div>

              <div className="form-group form-group-full">
                <label htmlFor="compensationAmount" className="form-label">
                  Összeg (Ft)
                </label>
                <div className="input-with-suffix">
                  <input
                    type="number"
                    id="compensationAmount"
                    name="compensationAmount"
                    value={formData.compensationAmount}
                    onChange={handleChange}
                    className="form-input"
                    min="0"
                    step="100"
                    placeholder="pl. 5000"
                    required
                  />
                  <span className="input-suffix">
                    Ft /{" "}
                    {formData.compensationType === "órabér" ? "óra" : "nap"}
                  </span>
                </div>
              </div>

              <div className="form-group form-group-full">
                <label className="checkbox-card">
                  <input
                    type="checkbox"
                    name="invoiceCapable"
                    checked={formData.invoiceCapable}
                    onChange={handleChange}
                  />
                  <div className="checkbox-card-content">
                    <span className="checkbox-card-title">
                      Számlaképes jelentkező szükséges
                    </span>
                    <span className="checkbox-card-description">
                      Csak olyan jelentkezők láthatják, akik számlát tudnak adni
                    </span>
                  </div>
                  <span className="checkbox-card-check">
                    <CheckIcon />
                  </span>
                </label>
              </div>
            </div>
          </section>
        )}

        {/* Step 5: Other Information */}
        {currentStep === 5 && (
          <section className="form-section form-section-active">
            <div className="form-section-header">
              <div className="form-section-icon">
                <FileTextIcon />
              </div>
              <div>
                <h2 className="form-section-title">
                  Adj meg további információkat a pozícióról
                </h2>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group form-group-full">
                <label htmlFor="description" className="form-label required">
                  Leírás
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="form-textarea"
                  rows={5}
                  placeholder="Írd le a munkakör részleteit, elvárásokat, egyéb fontos információkat..."
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="experienceYears" className="form-label">
                  Elvárt tapasztalat (év)
                </label>
                <input
                  type="number"
                  id="experienceYears"
                  name="experienceYears"
                  value={formData.experienceYears}
                  onChange={handleChange}
                  className="form-input"
                  min="0"
                  max="50"
                  placeholder="pl. 2"
                />
                <small className="form-hint">
                  Hagyd üresen, ha nincs minimum elvárás
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="notes" className="form-label">
                  Megjegyzés
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  className="form-textarea"
                  rows={3}
                  placeholder="További megjegyzések, különleges kérések..."
                />
              </div>
            </div>
          </section>
        )}

        {/* Navigation Buttons */}
        <div className="form-navigation">
          <button
            type="button"
            onClick={currentStep === 1 ? () => router.back() : prevStep}
            className="btn btn-outline"
            disabled={isSubmitting}
          >
            {currentStep === 1 ? "Mégse" : "Vissza"}
          </button>

          {currentStep < steps.length ? (
            <button
              key="next-button"
              type="button"
              onClick={nextStep}
              className="btn btn-primary"
              disabled={!validateCurrentStep()}
            >
              Tovább
              <ArrowRightIcon />
            </button>
          ) : (
            <button
              key="submit-button"
              type="submit"
              className="btn btn-primary btn-success"
              disabled={isSubmitting || !validateCurrentStep()}
            >
              {isSubmitting
                ? isEditMode
                  ? "Mentés..."
                  : "Feladás..."
                : isEditMode
                ? "Változtatások mentése"
                : "Hirdetés feladása"}
              {!isSubmitting && <CheckIcon />}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
