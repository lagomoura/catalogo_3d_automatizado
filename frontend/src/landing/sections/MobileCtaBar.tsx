import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

/**
 * Barra CTA sticky inferior, solo en mobile. Aparece cuando el Hero deja de
 * verse, para que "Crear mi tienda" esté siempre a un toque durante el scroll
 * largo (el CTA del nav está oculto tras el hamburguesa en mobile).
 *
 * Usa el mismo patrón de IntersectionObserver que `useScrollReveal`. Se oculta
 * sola (CSS) en desktop ≥960px. Respeta safe-area-inset-bottom (notch/home-bar).
 */
export function MobileCtaBar() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hero = document.querySelector(".landing__hero");
    if (!hero || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setShow(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`landing__mobile-cta${show ? " is-visible" : ""}`}
      aria-hidden={!show}
    >
      <Link
        to="/signup"
        className="btn btn--primary landing__btn landing__btn--lg landing__mobile-cta-btn"
        tabIndex={show ? 0 : -1}
      >
        Crear mi tienda
      </Link>
    </div>
  );
}
