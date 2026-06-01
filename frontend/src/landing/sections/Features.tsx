import type { ComponentType } from "react";
import { CatalogMockup } from "../mockups/CatalogMockup";
import { BeforeAfterMockup } from "../mockups/BeforeAfterMockup";
import { ChatMockup } from "../mockups/ChatMockup";
import { DashboardMockup } from "../mockups/DashboardMockup";

type Feature = {
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  Mockup: ComponentType;
  reverse?: boolean;
};

const FEATURES: Feature[] = [
  {
    eyebrow: "Catálogo automático",
    title: "Catálogo 3D en minutos, no en tardes",
    body: "Pegás una URL de MakerWorld y obtenés, en minutos, imágenes estilizadas y un modelo 3D listo para tu vitrina. Sin sesiones de fotos, sin render manual.",
    bullets: [
      "Imágenes generadas con Flux",
      "Modelo 3D navegable con Trellis",
      "Ficha y categorías cargadas solas",
    ],
    Mockup: CatalogMockup,
  },
  {
    eyebrow: "Identidad de marca",
    title: "Tus productos con la cara de tu marca",
    body: "Gemini reestiliza cada imagen con tu paleta y tu estilo. Tu catálogo se ve consistente y profesional, sin contratar a un diseñador.",
    bullets: [
      "Misma identidad en todo el catálogo",
      "Reestilizás cuando quieras",
      "Cero costo de diseño",
    ],
    Mockup: BeforeAfterMockup,
    reverse: true,
  },
  {
    eyebrow: "Asistente IA",
    title: "Preguntale a tu negocio",
    body: "El Gerente Bot vive en tu back-office y responde en lenguaje natural sobre pedidos, stock y métricas. Es como tener un encargado que conoce todos los números.",
    bullets: [
      "“¿Cuánto vendí esta semana?”",
      "“¿Qué pedidos están en producción?”",
      "“¿Qué filamento me falta?”",
    ],
    Mockup: ChatMockup,
  },
  {
    eyebrow: "Back-office",
    title: "Tu negocio entero en una sola pantalla",
    body: "Caja, pedidos, clientes, presupuestos y producción dejan de estar en cinco lugares distintos. Todo conectado, todo al día.",
    bullets: ["Caja y pedidos", "Clientes y presupuestos", "Seguimiento de producción"],
    Mockup: DashboardMockup,
    reverse: true,
  },
];

function FeatureBlock({ eyebrow, title, body, bullets, Mockup, reverse }: Feature) {
  return (
    <div className={`landing__feature${reverse ? " landing__feature--reverse" : ""}`}>
      <div className="landing__feature-body reveal">
        <span className="landing__feature-eyebrow">{eyebrow}</span>
        <h3 className="landing__feature-title">{title}</h3>
        <p className="landing__feature-text">{body}</p>
        <ul className="landing__feature-bullets">
          {bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </div>
      <div className="landing__feature-media reveal">
        <Mockup />
      </div>
    </div>
  );
}

export function Features() {
  return (
    <section className="landing__features" id="funciones">
      <div className="landing__container">
        <h2 className="landing__section-title reveal">
          Las funciones que mueven tu taller
        </h2>
        <p className="landing__section-sub reveal">
          Del catálogo a la entrega, cada paso automatizado.
        </p>
        {FEATURES.map((f) => (
          <FeatureBlock key={f.title} {...f} />
        ))}
      </div>
    </section>
  );
}
