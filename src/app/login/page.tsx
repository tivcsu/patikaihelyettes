"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../../firebase.config";
import { doc, getDoc } from "firebase/firestore";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      const user = auth.currentUser;
      if (!user) throw new Error("User not found");
      const userData = await getDoc(doc(db, "users", user.uid));
      if (!userData.exists()) throw new Error("User data not found");
      const userRole = userData.data().role;

      // TODO: Redirect based on user role
      router.push(`/dashboard/${userRole.toLowerCase()}`);
    } catch (err) {
      setError("Hibás email cím vagy jelszó.");
      console.error("Login error:", err);
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
          <h1>Bejelentkezés</h1>
          <p>Üdvözöljük újra!</p>
        </div>

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
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              placeholder="pelda@email.hu"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Jelszó
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="form-input"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <div className="auth-forgot">
            <Link href="/forgot-password">Elfelejtetted a jelszavad?</Link>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={isLoading}
          >
            {isLoading ? "Bejelentkezés..." : "Bejelentkezés"}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Még nincs fiókod? <Link href="/register">Regisztrálj itt</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
