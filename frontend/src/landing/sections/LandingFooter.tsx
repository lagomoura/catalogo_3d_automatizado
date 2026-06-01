import { Link } from "react-router-dom";
import { Logo } from "../../components/Brand";

export function LandingFooter() {
  return (
    <footer className="landing__footer">
      <div className="landing__container landing__footer-inner">
        <div className="landing__footer-brand">
          <Logo size={32} subtitle="Tiendas 3D" />
          <p className="landing__footer-tagline">
            Tu impresión 3D, convertida en tienda.
          </p>
        </div>

        <div className="landing__footer-cols">
          <div className="landing__footer-col">
            <span className="landing__footer-heading">Producto</span>
            <a href="#como-funciona">Cómo funciona</a>
            <a href="#funciones">Funciones</a>
          </div>
          <div className="landing__footer-col">
            <span className="landing__footer-heading">Cuenta</span>
            <Link to="/login">Ingresar</Link>
            <Link to="/signup">Crear mi tienda</Link>
          </div>
          <div className="landing__footer-col">
            <span className="landing__footer-heading">Legal</span>
            <span className="landing__footer-soon">
              Términos <em>· pronto</em>
            </span>
            <span className="landing__footer-soon">
              Privacidad <em>· pronto</em>
            </span>
          </div>
        </div>
      </div>
      <div className="landing__footer-bottom">
        <div className="landing__container">
          © 2026 Aura3D · Hecho para impresores 3D.
        </div>
      </div>
    </footer>
  );
}
