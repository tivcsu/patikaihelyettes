import { Icons } from "@/components/ui/Icons";

export default function HowItWorks() {
  const steps = [
    {
      icon: <Icons.Search />,
      title: "Böngéssz vagy hirdess",
      description:
        "Patikák hirdetést adnak fel, helyettesítők böngészhetik őket – akár regisztráció nélkül is.",
    },
    {
      icon: <Icons.Target />,
      title: "Találd meg a megfelelőt",
      description:
        "Szűrd a hirdetéseket pozíció, helyszín és időpont szerint, vagy várd a jelentkezőket.",
    },
    {
      icon: <Icons.Handshake />,
      title: "Lépj kapcsolatba",
      description:
        "Jelentkezz a hirdetésre, vagy válaszolj a jelentkezőknek – egyszerűen és gyorsan.",
    },
  ];

  return (
    <section className="how-it-works-section section">
      <div className="section-header">
        <span className="section-label">Egyszerű folyamat</span>
        <h2 className="section-title">Hogyan működik?</h2>
        <p className="section-subtitle">
          Három egyszerű lépésben összekapcsoljuk a patikákat és a
          helyettesítőket
        </p>
      </div>

      <div className="steps-container">
        {steps.map((step, index) => (
          <div key={index} className="step-card">
            <div className="step-icon-wrapper">
              <div className="step-icon">{step.icon}</div>
              <span className="step-number">{index + 1}</span>
            </div>
            <h3 className="step-title">{step.title}</h3>
            <p className="step-description">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
