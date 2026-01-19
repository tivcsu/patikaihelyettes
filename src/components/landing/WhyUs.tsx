import { Icons } from "@/components/ui/Icons";

export default function WhyUs() {
  const pharmacyBenefits = [
    {
      icon: <Icons.Zap />,
      title: "Gyorsabban találsz helyettesítőt",
      description:
        "Nem kell Facebook-csoportokban posztolni és várni. A hirdetésed azonnal olyan szakemberekhez jut el, akik tényleg helyettesíteni akarnak.",
    },
    {
      icon: <Icons.Target />,
      title: "Célzott jelentkezők",
      description:
        "Csak olyan helyettesítők jelentkeznek, akik az adott térségben elérhetők és nyitottak munkára. Kevesebb üres kör, több valódi megoldás.",
    },
    {
      icon: <Icons.Handshake />,
      title: "Közvetlen kapcsolat",
      description:
        "Nem közvetítünk, nem szűrünk helyetted. Közvetlenül kapcsolatba léphetsz a jelentkezőkkel.",
    },
  ];

  const substituteBenefits = [
    {
      icon: <Icons.Eye />,
      title: "Böngészés regisztráció nélkül",
      description:
        "Megnézheted az aktuális hirdetéseket anélkül, hogy azonnal elköteleződnél.",
    },
    {
      icon: <Icons.Search />,
      title: "Nem neked kell keresni – megtalálnak",
      description:
        "Ha jelzed, hogy nyitott vagy helyettesítésre, a patikák megkereshetnek téged. Te döntöd el mikor, hol és milyen feltételekkel dolgozol.",
    },
    {
      icon: <Icons.CalendarCheck />,
      title: "Rugalmas, átlátható munkák",
      description:
        "Egy napos beugrás vagy több napos helyettesítés? Te választod ki a számodra megfelelő lehetőségeket.",
    },
  ];

  return (
    <section className="why-us-section section">
      <div className="section-header">
        <span className="section-label">Előnyök</span>
        <h2 className="section-title">Miért válassz minket?</h2>
        <p className="section-subtitle">
          Mindkét fél számára egyszerű és hatékony megoldás
        </p>
      </div>

      <div className="benefits-container">
        {/* Pharmacy Benefits */}
        <div className="benefits-card">
          <div className="benefits-card-header">
            <div className="benefits-card-icon">
              <Icons.Building />
            </div>
            <h3 className="benefits-title">Patikáknak</h3>
          </div>
          <div className="benefits-items">
            {pharmacyBenefits.map((benefit, index) => (
              <div key={index} className="benefit-item">
                <div className="benefit-item-icon">{benefit.icon}</div>
                <div className="benefit-item-content">
                  <h4 className="benefit-item-title">{benefit.title}</h4>
                  <p className="benefit-item-description">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Substitute Benefits */}
        <div className="benefits-card">
          <div className="benefits-card-header">
            <div className="benefits-card-icon substitute">
              <Icons.UserCheck />
            </div>
            <h3 className="benefits-title">Helyettesítőknek</h3>
          </div>
          <div className="benefits-items">
            {substituteBenefits.map((benefit, index) => (
              <div key={index} className="benefit-item">
                <div className="benefit-item-icon">{benefit.icon}</div>
                <div className="benefit-item-content">
                  <h4 className="benefit-item-title">{benefit.title}</h4>
                  <p className="benefit-item-description">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="why-us-tagline">
        <Icons.Pill />
        <span>Magyar patikák és helyettesítők számára készült</span>
      </div>
    </section>
  );
}
