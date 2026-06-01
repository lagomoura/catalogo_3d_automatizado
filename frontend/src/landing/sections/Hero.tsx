import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { CatalogMockup } from "../mockups/CatalogMockup";

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);

  // Pausa la animación del aura cuando el hero sale del viewport (batería/GPU
  // en mobile). Solo anima `transform`, así que pausarla fuera de vista es gratis.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      el.classList.toggle("is-aura-paused", !entry.isIntersecting);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="landing__hero" ref={sectionRef}>
      <div className="landing__container landing__hero-inner">
        <div className="landing__hero-copy">
          <span className="landing__badge">Para impresores 3D que venden</span>
          <h1 className="landing__hero-title">
            Tu impresión 3D, convertida en{" "}
            <span className="landing__hero-accent">tienda</span>
          </h1>
          <p className="landing__hero-lead">
            Pegás un link de MakerWorld y Aura3D arma tu catálogo con imágenes
            con la identidad de tu marca, modelo 3D y precios calculados. Tu
            vitrina online y tu back-office, en un solo lugar.
          </p>
          <div className="landing__hero-cta">
            <Link to="/signup" className="btn btn--primary landing__btn landing__btn--lg">
              Crear mi tienda
            </Link>
            <a href="#como-funciona" className="btn landing__btn landing__btn--lg">
              Ver cómo funciona
            </a>
          </div>
          <p className="landing__hero-trust">
            Sin tarjeta · Configurás tu tienda en minutos · Pensado para
            operaciones de 1 o 2 personas
          </p>
        </div>
        <div className="landing__hero-art">
          <CatalogMockup />
        </div>
      </div>
    </section>
  );
}
