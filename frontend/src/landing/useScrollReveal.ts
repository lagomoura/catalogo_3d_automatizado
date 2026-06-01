import { useEffect } from "react";

/**
 * Revela con un fade/slide sutil los elementos `.reveal` cuando entran al
 * viewport. Un único IntersectionObserver compartido para toda la landing.
 *
 * Fallback crítico de accesibilidad: si el usuario pidió menos movimiento o el
 * navegador no soporta IntersectionObserver, revela todo de inmediato — el
 * contenido NUNCA queda invisible.
 */
export function useScrollReveal() {
  useEffect(() => {
    // Acotado al árbol de la landing (no a todo el documento): evita observar
    // `.reveal` de otras superficies y no depende del DOM global.
    const root = document.querySelector(".landing");
    const nodes = Array.from(
      root?.querySelectorAll<HTMLElement>(".reveal") ?? [],
    );
    if (nodes.length === 0) return;

    const prefersReduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced || typeof IntersectionObserver === "undefined") {
      nodes.forEach((n) => n.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 },
    );

    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, []);
}
