import type { ReactNode } from "react";

/* Iconos de trazo, heredan currentColor (tinte de acento vía CSS). */
const Icon = ({ children }: { children: ReactNode }) => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const TILES = [
  {
    title: "Vitrina pública",
    body: "Tu catálogo en <tu-tienda>.aura3d.com con visor 3D.",
    icon: (
      <Icon>
        <path d="M3 9l1-5h16l1 5" />
        <path d="M4 9v11h16V9" />
        <path d="M9 20v-6h6v6" />
      </Icon>
    ),
  },
  {
    title: "Calculadora de precios",
    body: "Material multicolor, amortización de impresora, fees de marketplace y markup, calculados solos.",
    icon: (
      <Icon>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M8 7h8M8 11h2M12 11h2M8 15h2M12 15h2" />
      </Icon>
    ),
  },
  {
    title: "Auto-registro de clientes",
    body: "Compartís un link y tus clientes se cargan solos.",
    icon: (
      <Icon>
        <circle cx="9" cy="8" r="3" />
        <path d="M4 20c0-3 2.5-5 5-5s5 2 5 5" />
        <path d="M17 9h4M19 7v4" />
      </Icon>
    ),
  },
  {
    title: "Presupuestos con PDF",
    body: "Presupuestos públicos numerados, con validez y PDF.",
    icon: (
      <Icon>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5" />
        <path d="M9 14h6M9 17h4" />
      </Icon>
    ),
  },
  {
    title: "Producción en vivo",
    body: "Timers por impresora para saber qué se está imprimiendo y cuánto falta.",
    icon: (
      <Icon>
        <circle cx="12" cy="13" r="7" />
        <path d="M12 13V9M12 6V3M10 3h4" />
      </Icon>
    ),
  },
  {
    title: "Multi-tenant seguro",
    body: "Cada negocio aislado, con su propia vitrina y acceso protegido.",
    icon: (
      <Icon>
        <path d="M12 3l7 3v5c0 4-3 7-7 8-4-1-7-4-7-8V6z" />
        <path d="M9.5 12l1.8 1.8L15 10" />
      </Icon>
    ),
  },
];

export function FeatureGrid() {
  return (
    <section className="landing__grid-section">
      <div className="landing__container">
        <h2 className="landing__section-title reveal">
          Y todo lo demás que tu taller necesita
        </h2>
        <div className="landing__grid">
          {TILES.map((t) => (
            <div className="landing__tile reveal" key={t.title}>
              <span className="landing__tile-icon">{t.icon}</span>
              <h3 className="landing__tile-title">{t.title}</h3>
              <p className="landing__tile-body">{t.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
