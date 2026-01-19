import Link from "next/link";
import { Icons } from "@/components/ui/Icons";

export default function FooterCTA() {
  return (
    <section className="footer-cta-section">
      <div className="footer-cta-content">
        <h2 className="footer-cta-title">
          Ne maradjon üres műszak – és ne maradjon ki jó lehetőség
        </h2>
        <p className="footer-cta-subtitle">
          Csatlakozz a patikák és helyettesítők növekvő közösségéhez még ma
        </p>

        <div className="footer-cta-buttons">
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
      </div>
    </section>
  );
}
