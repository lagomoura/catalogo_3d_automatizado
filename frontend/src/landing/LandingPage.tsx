import { useEffect } from "react";
import "./landing.css";
import { useScrollReveal } from "./useScrollReveal";
import { LandingNav } from "./sections/LandingNav";
import { Hero } from "./sections/Hero";
import { Stats } from "./sections/Stats";
import { HowItWorks } from "./sections/HowItWorks";
import { Features } from "./sections/Features";
import { FeatureGrid } from "./sections/FeatureGrid";
import { CtaBand } from "./sections/CtaBand";
import { LandingFooter } from "./sections/LandingFooter";
import { MobileCtaBar } from "./sections/MobileCtaBar";

const PAGE_TITLE = "Aura3D · Tu impresión 3D, convertida en tienda";

/**
 * Landing de marketing del dominio de app / apex (`aura3d.com`).
 *
 * En subdominios de tienda (`<slug>.aura3d.com`) `RootRoute` muestra la vitrina,
 * no esta página. Acá vendemos el producto y empujamos a /signup.
 */
export default function LandingPage() {
  useScrollReveal();

  // Título por ruta: el de `index.html` es genérico/admin-leaning. Como es una
  // SPA sin SSR, lo ajustamos en cliente para esta página de marketing.
  useEffect(() => {
    const prev = document.title;
    document.title = PAGE_TITLE;
    return () => {
      document.title = prev;
    };
  }, []);

  return (
    <div className="landing">
      <LandingNav />
      <main>
        <Hero />
        <Stats />
        <HowItWorks />
        <Features />
        <FeatureGrid />
        <CtaBand />
      </main>
      <LandingFooter />
      <MobileCtaBar />
    </div>
  );
}
