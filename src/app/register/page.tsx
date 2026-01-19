"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { UserRole } from "@/types";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../../firebase.config";
import { addDoc, collection, doc, setDoc } from "firebase/firestore";
import { BuildingIcon, UserIcon } from "@/components/ui/Icons";
import { REGIONS } from "../constants/regions";

type RegistrationStep = "select-type" | "credentials" | "profile";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type") as
    | "pharmacy"
    | "substitute"
    | null;

  const [step, setStep] = useState<RegistrationStep>(
    initialType ? "credentials" : "select-type",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [userType, setUserType] = useState<UserRole | null>(
    initialType === "pharmacy"
      ? "PHARMACY"
      : initialType === "substitute"
        ? "SUBSTITUTE"
        : null,
  );

  // Credentials
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
  });

  // Pharmacy profile
  const [pharmacyProfile, setPharmacyProfile] = useState({
    name: "",
    zip: "",
    city: "",
    street: "",
    region: "",
    phone: "",
    email: "",
  });

  // Substitute profile
  const [substituteProfile, setSubstituteProfile] = useState({
    name: "",
    qualification: "" as
      | "GYÓGYSZERÉSZ"
      | "SZAKASSZISZTENS"
      | "ASSZISZTENS"
      | "",
    experienceYears: "",
    availableRegions: [] as string[],
    bio: "",
    phone: "",
    email: "",
  });

  const handleCredentialsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handlePharmacyChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setPharmacyProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubstituteChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setSubstituteProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegionToggle = (region: string) => {
    setSubstituteProfile((prev) => ({
      ...prev,
      availableRegions: prev.availableRegions.includes(region)
        ? prev.availableRegions.filter((r) => r !== region)
        : [...prev.availableRegions, region],
    }));
  };

  const handleTypeSelect = (type: UserRole) => {
    setUserType(type);
    setStep("credentials");
  };

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (credentials.password !== credentials.confirmPassword) {
      setError("A jelszavak nem egyeznek.");
      return;
    }

    if (credentials.password.length < 6) {
      setError("A jelszónak legalább 6 karakter hosszúnak kell lennie.");
      return;
    }

    setStep("profile");
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password,
      );

      // Create user document in Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        role: userType!,
        email: credentials.email,
        name: credentials.name,
        createdAt: new Date(),
      });

      // Create profile document (use user UID as document ID for easy lookup)
      const collectionName =
        userType === "PHARMACY" ? "pharmacies" : "substitutes";
      collectionName === "pharmacies"
        ? await addDoc(collection(db, collectionName), {
            userId: userCredential.user.uid,
            name: pharmacyProfile.name,
            address: {
              zip: pharmacyProfile.zip,
              city: pharmacyProfile.city,
              street: pharmacyProfile.street,
              region: pharmacyProfile.region,
            },
            createdAt: new Date(),
          })
        : await setDoc(doc(db, collectionName, userCredential.user.uid), {
            userId: userCredential.user.uid,
            name: credentials.name,
            qualification: substituteProfile.qualification,
            experienceYears: Number(substituteProfile.experienceYears),
            availableRegions: substituteProfile.availableRegions,
            bio: substituteProfile.bio,
            phone: substituteProfile.phone || null,
            email: substituteProfile.email || null,
            isOpenToWork: true,
            createdAt: new Date(),
          });

      // Redirect to appropriate dashboard
      if (userType === "PHARMACY") {
        router.push("/dashboard/pharmacy");
      } else {
        router.push("/dashboard/substitute");
      }
    } catch (err) {
      setError("Hiba történt a regisztráció során. Kérjük, próbáld újra.");
      console.error("Registration error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <Link href="/" className="auth-logo">
            patikaihelyettes.hu
          </Link>
          <h1>Regisztráció</h1>
          {step === "select-type" && (
            <p>Válaszd ki, hogyan szeretnéd használni a platformot</p>
          )}
          {step === "credentials" && (
            <p>
              {userType === "PHARMACY"
                ? "Patika regisztráció"
                : "Helyettesítő regisztráció"}
            </p>
          )}
          {step === "profile" && <p>Profil adatok megadása</p>}
        </div>

        {/* Step 1: Select User Type */}
        {step === "select-type" && (
          <div className="type-selection">
            <button
              type="button"
              className="type-card"
              onClick={() => handleTypeSelect("PHARMACY")}
            >
              <div className="type-icon type-icon-pharmacy">
                <BuildingIcon />
              </div>
              <h3>Patika</h3>
              <p>Helyettesítőt keresek a patikámba</p>
            </button>

            <button
              type="button"
              className="type-card"
              onClick={() => handleTypeSelect("SUBSTITUTE")}
            >
              <div className="type-icon type-icon-substitute">
                <UserIcon />
              </div>
              <h3>Helyettesítő</h3>
              <p>Helyettesítő munkát keresek</p>
            </button>
          </div>
        )}

        {/* Step 2: Email/Password */}
        {step === "credentials" && (
          <form onSubmit={handleCredentialsSubmit} className="auth-form">
            {error && <div className="auth-error">{error}</div>}

            <div className="form-group">
              <label htmlFor="email" className="form-label required">
                Neve
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={credentials.name}
                onChange={handleCredentialsChange}
                className="form-input"
                placeholder="Példa Név"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label required">
                Email cím
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={credentials.email}
                onChange={handleCredentialsChange}
                className="form-input"
                placeholder="pelda@email.hu"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label required">
                Jelszó
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={credentials.password}
                onChange={handleCredentialsChange}
                className="form-input"
                placeholder="Minimum 6 karakter"
                required
                minLength={6}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label required">
                Jelszó megerősítése
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={credentials.confirmPassword}
                onChange={handleCredentialsChange}
                className="form-input"
                placeholder="Add meg újra a jelszót"
                required
                minLength={6}
              />
            </div>

            <div className="form-actions-auth">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setStep("select-type")}
              >
                Vissza
              </button>
              <button type="submit" className="btn btn-primary">
                Tovább
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Profile Information */}
        {step === "profile" && userType === "PHARMACY" && (
          <form onSubmit={handleProfileSubmit} className="auth-form">
            {error && <div className="auth-error">{error}</div>}

            <div className="form-group">
              <label htmlFor="name" className="form-label required">
                Patika neve
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={pharmacyProfile.name}
                onChange={handlePharmacyChange}
                className="form-input"
                placeholder="pl. Központi Gyógyszertár"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="region" className="form-label required">
                Régió
              </label>
              <select
                id="region"
                name="region"
                value={pharmacyProfile.region}
                onChange={handlePharmacyChange}
                className="form-input"
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
                <label htmlFor="zip" className="form-label required">
                  Irányítószám
                </label>
                <input
                  type="text"
                  id="zip"
                  name="zip"
                  value={pharmacyProfile.zip}
                  onChange={handlePharmacyChange}
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
                  value={pharmacyProfile.city}
                  onChange={handlePharmacyChange}
                  className="form-input"
                  placeholder="Budapest"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="street" className="form-label required">
                Utca, házszám
              </label>
              <input
                type="text"
                id="street"
                name="street"
                value={pharmacyProfile.street}
                onChange={handlePharmacyChange}
                className="form-input"
                placeholder="Kossuth utca 10."
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email cím
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={pharmacyProfile.email}
                onChange={handlePharmacyChange}
                className="form-input"
                placeholder="patika@email.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone" className="form-label">
                Telefonszám
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={pharmacyProfile.phone}
                onChange={handlePharmacyChange}
                className="form-input"
                placeholder="+36 30 123 4567"
              />
            </div>

            <div className="form-actions-auth">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setStep("credentials")}
                disabled={isLoading}
              >
                Vissza
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isLoading}
              >
                {isLoading ? "Regisztráció..." : "Regisztráció"}
              </button>
            </div>
          </form>
        )}

        {step === "profile" && userType === "SUBSTITUTE" && (
          <form onSubmit={handleProfileSubmit} className="auth-form">
            {error && <div className="auth-error">{error}</div>}

            {/*         <div className="form-group">
              <label htmlFor="name" className="form-label">
                Teljes név
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={substituteProfile.name}
                onChange={handleSubstituteChange}
                className="form-input"
                placeholder="Kovács Anna"
                required
              />
            </div> */}

            <div className="form-group">
              <label htmlFor="qualification" className="form-label">
                Végzettség
              </label>
              <select
                id="qualification"
                name="qualification"
                value={substituteProfile.qualification}
                onChange={handleSubstituteChange}
                className="form-select"
                required
              >
                <option value="">Válassz...</option>
                <option value="GYÓGYSZERÉSZ">Gyógyszerész</option>
                <option value="SZAKASSZISZTENS">Szakasszisztens</option>
                <option value="ASSZISZTENS">Asszisztens</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="experienceYears" className="form-label">
                Tapasztalat (év)
              </label>
              <input
                type="number"
                id="experienceYears"
                name="experienceYears"
                value={substituteProfile.experienceYears}
                onChange={handleSubstituteChange}
                className="form-input"
                placeholder="pl. 3"
                min="0"
                max="50"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Hol keresel munkát?</label>
              <div className="regions-grid">
                {REGIONS.map((region) => (
                  <label key={region} className="region-checkbox">
                    <input
                      type="checkbox"
                      checked={substituteProfile.availableRegions.includes(
                        region,
                      )}
                      onChange={() => handleRegionToggle(region)}
                    />
                    <span>{region}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="bio" className="form-label">
                Rövid bemutatkozás
              </label>
              <textarea
                id="bio"
                name="bio"
                value={substituteProfile.bio}
                onChange={handleSubstituteChange}
                className="form-textarea"
                placeholder="Írj magadról néhány mondatot..."
                rows={3}
              />
            </div>

            <div className="form-group">
              <label htmlFor="sub-phone" className="form-label">
                Telefonszám (opcionális)
              </label>
              <input
                type="tel"
                id="sub-phone"
                name="phone"
                value={substituteProfile.phone}
                onChange={handleSubstituteChange}
                className="form-input"
                placeholder="+36 30 123 4567"
              />
            </div>

            <div className="form-group">
              <label htmlFor="sub-email" className="form-label">
                Kapcsolati email (opcionális)
              </label>
              <input
                type="email"
                id="sub-email"
                name="email"
                value={substituteProfile.email}
                onChange={handleSubstituteChange}
                className="form-input"
                placeholder="helyettes@email.hu"
              />
              <small className="form-hint">
                Ha eltér a bejelentkezési email címedtől
              </small>
            </div>

            <div className="form-actions-auth">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setStep("credentials")}
                disabled={isLoading}
              >
                Vissza
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isLoading}
              >
                {isLoading ? "Regisztráció..." : "Regisztráció"}
              </button>
            </div>
          </form>
        )}

        {step !== "select-type" && (
          <div className="auth-footer">
            <p>
              Már van fiókod? <Link href="/login">Jelentkezz be</Link>
            </p>
          </div>
        )}

        {step === "select-type" && (
          <div className="auth-footer">
            <p>
              Már van fiókod? <Link href="/login">Jelentkezz be</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="auth-page">
          <div className="auth-container">
            <div className="auth-header">
              <Link href="/" className="auth-logo">
                patikaihelyettes.hu
              </Link>
              <h1>Regisztráció</h1>
              <p>Betöltés...</p>
            </div>
          </div>
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
