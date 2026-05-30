import { Link } from "react-router-dom";
import { Logo, ThemeToggle } from "../components/Brand";

/**
 * Landing pública del dominio de app / apex (`aura3d.com`).
 *
 * Placeholder enrutado: la landing de marketing definitiva se construye en un paso
 * posterior sobre esta misma URL. Lo importante es que `/` en el dominio de app ya
 * NO muestra la vitrina del tenant "default" — la vitrina vive en `<slug>.aura3d.com`.
 */
export default function LandingPage() {
  return (
    <div className="landing">
      <header className="landing__header">
        <Logo size={34} subtitle="Tiendas 3D" />
        <ThemeToggle />
      </header>

      <main className="landing__hero">
        <span className="landing__badge">Landing en construcción</span>
        <h1 className="landing__title">
          Tu catálogo 3D, hecho vitrina
        </h1>
        <p className="landing__lead">
          Aura3D arma tu tienda de impresión 3D: catálogo público, back-office comercial
          y un asistente para gestionar tu negocio. Cada tienda con su propia vitrina.
        </p>
        <div className="landing__cta">
          <Link to="/signup" className="btn btn--primary landing__cta-btn">
            Crear mi tienda
          </Link>
          <Link to="/login" className="btn landing__cta-btn">
            Ingresar
          </Link>
        </div>
      </main>
    </div>
  );
}
