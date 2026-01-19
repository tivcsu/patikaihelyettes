import AdForm from "@/components/ads/NewAdForm";
import { PlusIcon } from "@/components/ui/Icons";

export default function NewAdPage() {
  return (
    <div className="new-ad-page">
      <div className="page-header-hero">
        <div className="page-header-icon">
          <PlusIcon />
        </div>
        <h1 className="page-header-title">Új hirdetés feladása</h1>
        <p className="page-header-subtitle">
          Kövesd az alábbi lépéseket, hogy megtaláld a tökéletes helyettesítőt
        </p>
      </div>
      <AdForm />
    </div>
  );
}
