"use client";

import { useState } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../../firebase.config";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess(false);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (err: unknown) {
      console.error("Password reset error:", err);

      // Handle specific Firebase errors
      if (err && typeof err === "object" && "code" in err) {
        const firebaseError = err as { code: string };
        switch (firebaseError.code) {
          case "auth/user-not-found":
            setError("Ezzel az email címmel nincs regisztrált felhasználó.");
            break;
          case "auth/invalid-email":
            setError("Érvénytelen email cím.");
            break;
          case "auth/too-many-requests":
            setError("Túl sok próbálkozás. Kérjük, próbálja újra később.");
            break;
          default:
            setError("Hiba történt. Kérjük, próbálja újra.");
        }
      } else {
        setError("Hiba történt. Kérjük, próbálja újra.");
      }
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
          <h1>Elfelejtett jelszó</h1>
          <p>
            Add meg az email címedet és küldünk egy linket a jelszó
            visszaállításához.
          </p>
        </div>

        {success ? (
          <div className="auth-success">
            <div className="success-icon">✓</div>
            <h2>Email elküldve!</h2>
            <p>
              Ellenőrizd az email fiókodat ({email}) és kövesd a levélben
              található utasításokat a jelszó visszaállításához.
            </p>
            <p className="success-note">
              Ha nem találod az emailt, ellenőrizd a spam mappát is.
            </p>
            <Link href="/login" className="btn btn-primary btn-full">
              Vissza a bejelentkezéshez
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="auth-error">{error}</div>}

            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email cím
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                className="form-input"
                placeholder="pelda@email.hu"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={isLoading}
            >
              {isLoading ? "Küldés..." : "Jelszó visszaállítása"}
            </button>
          </form>
        )}

        <div className="auth-footer">
          <p>
            <Link href="/login">Vissza a bejelentkezéshez</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
