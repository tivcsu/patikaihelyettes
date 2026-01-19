import Link from "next/link";
import { Icons } from "@/components/ui/Icons";

export default function Hero() {
  return (
    <section className="hero-section">
      {/* Background decoration */}
      <div className="hero-bg-pattern" />

      <div className="hero-content">
        <div className="hero-badge">
          <Icons.Pill />
          <span>Magyar patikák platformja</span>
        </div>

        <h1 className="hero-title">
          Patikai <span className="hero-highlight">helyettesítőt</span> keresel
          vagy <span className="hero-highlight">munkát vállalnál?</span>
        </h1>

        <p className="hero-subtitle">
          Gyógyszerészek, szakasszisztensek és asszisztensek számára készült
          platform, amely összeköti a patikákat a helyettesítőkkel.
        </p>

        <div className="hero-cta-primary">
          <Link href="/ads" className="btn btn-primary btn-lg">
            <Icons.Search />
            <span>Hirdetések böngészése</span>
          </Link>
          <Link
            href="/register?type=pharmacy"
            className="btn btn-secondary btn-lg"
          >
            <span>Hirdetést adok fel</span>
            <Icons.ArrowRight />
          </Link>
        </div>

        <div className="hero-cta-secondary">
          <Link href="/register?type=substitute" className="link-secondary">
            Helyettesítőként regisztrálok
          </Link>
          <span className="hero-divider">•</span>
          <Link href="/register?type=pharmacy" className="link-secondary">
            Patikaként regisztrálok
          </Link>
        </div>

        {/* <div className="hero-stats">
          <div className="hero-stat">
            <span className="hero-stat-number">500+</span>
            <span className="hero-stat-label">Aktív patika</span>
          </div>
          <div className="hero-stat-divider" />
          <div className="hero-stat">
            <span className="hero-stat-number">1200+</span>
            <span className="hero-stat-label">Regisztrált helyettesítő</span>
          </div>
          <div className="hero-stat-divider" />
          <div className="hero-stat">
            <span className="hero-stat-number">3000+</span>
            <span className="hero-stat-label">Sikeres egyeztetés</span>
          </div>
        </div> */}
      </div>
    </section>
  );
}
