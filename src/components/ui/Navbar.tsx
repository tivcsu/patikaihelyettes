"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/ui/Icons";
import { useAuth } from "@/contexts/AuthContext";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, substitute, loading, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    setIsMenuOpen(false);
    router.push("/");
  };

  const dashboardLink =
    user?.role === "PHARMACY" ? "/dashboard/pharmacy" : "/dashboard/substitute";

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo - always visible */}
        <Link
          href={user ? dashboardLink : "/"}
          className="navbar-logo"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <Icons.PharmacyLogo />
          <span>patikaihelyettes.hu</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="navbar-links">
          {user && (
            <Link href={dashboardLink} className="navbar-link">
              <Icons.Home />
              Irányítópult
            </Link>
          )}
          <Link href="/ads" className="navbar-link">
            <Icons.List />
            Hirdetések
          </Link>

          {loading ? (
            <span className="navbar-link">...</span>
          ) : user ? (
            <>
              <Link href="/profile" className="navbar-link">
                <Icons.User />
                <span className="navbar-user-name">Profil</span>
              </Link>
              {user?.role === "PHARMACY" && (
                <Link href="/ads/new" className="btn btn-primary btn-nav">
                  <Icons.Plus />
                  Új hirdetés
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="btn btn-primary btn-nav"
              >
                <Icons.LogOut />
                Kijelentkezés
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="navbar-link">
                Bejelentkezés
              </Link>
              <Link href="/register" className="btn btn-primary btn-nav">
                Regisztráció
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="navbar-menu-btn"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <Icons.X /> : <Icons.Menu />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <>
          <div
            className="navbar-overlay"
            onClick={() => setIsMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="navbar-mobile">
            {user && (
              <Link
                href={dashboardLink}
                className="navbar-mobile-link"
                onClick={() => setIsMenuOpen(false)}
              >
                <Icons.Home />
                Irányítópult
              </Link>
            )}
            <Link
              href="/ads"
              className="navbar-mobile-link"
              onClick={() => setIsMenuOpen(false)}
            >
              <Icons.List />
              Hirdetések
            </Link>

            {loading ? null : user ? (
              <>
                <Link
                  href="/profile"
                  className="navbar-mobile-link"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Icons.User />
                  Profil
                </Link>
                {user?.role === "PHARMACY" && (
                  <Link
                    href="/ads/new"
                    className="btn btn-primary btn-full"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Icons.Plus />
                    Új hirdetés
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="btn btn-primary btn-full"
                >
                  <Icons.LogOut />
                  Kijelentkezés
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="navbar-mobile-link"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Bejelentkezés
                </Link>
                <Link
                  href="/register"
                  className="btn btn-primary btn-full"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Regisztráció
                </Link>
              </>
            )}
          </div>
        </>
      )}
    </nav>
  );
}
