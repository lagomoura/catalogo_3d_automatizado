import { Link } from "react-router-dom";

export function CtaBand() {
  return (
    <section className="landing__cta-band">
      <div className="landing__container landing__cta-band-inner reveal">
        <h2 className="landing__cta-band-title">
          Tu próxima venta arranca en un link
        </h2>
        <div className="landing__cta-band-actions">
          <Link to="/signup" className="btn btn--primary landing__btn landing__btn--lg">
            Crear mi tienda
          </Link>
          <Link to="/login" className="landing__cta-band-link">
            Ya tengo cuenta → Ingresar
          </Link>
        </div>
      </div>
    </section>
  );
}
