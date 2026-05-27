import { Modal } from "../../components/Modal";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function OnboardingModal({ open, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} size="md" labelledBy="presup-onb-title">
      <Modal.Header onClose={onClose} id="presup-onb-title">
        Qué son los Presupuestos
      </Modal.Header>
      <Modal.Body>
        <div className="onboarding">
          <div className="onboarding__avatar" aria-hidden>
            <svg viewBox="0 0 64 64" width="40" height="40" fill="none">
              <circle cx="32" cy="32" r="30" fill="rgba(79,134,255,0.18)" />
              <rect x="18" y="12" width="28" height="40" rx="3" fill="#4f86ff" />
              <rect x="22" y="18" width="20" height="3" rx="1" fill="#fff" />
              <rect x="22" y="25" width="20" height="3" rx="1" fill="#fff" />
              <rect x="22" y="32" width="14" height="3" rx="1" fill="#fff" />
              <rect x="22" y="42" width="10" height="6" rx="1.5" fill="#fff" />
            </svg>
          </div>
          <div className="onboarding__copy">
            <h4>Tu generador de cotizaciones</h4>
            <p>
              Armás un PDF profesional para mandarle al cliente: tu logo
              y datos de marca, items con precios, total y validez de 30
              días. Cada presupuesto tiene un número y un link público
              que el cliente puede abrir sin necesidad de cuenta.
            </p>

            <section className="onboarding__section">
              <header>
                <span className="onboarding__dot" /> CÓMO ENCAJA CON EL RESTO
              </header>
              <p>
                <strong>Clientes</strong>: cargás el cliente y precarga
                nombre, email y teléfono en el presupuesto.
              </p>
              <p>
                <strong>Calculadora</strong>: los precios que ponés acá
                pueden salir de las cotizaciones de la calculadora (las
                pasás a mano o copiando el total).
              </p>
              <p>
                <strong>Pedidos</strong>: cuando el cliente acepta el
                presupuesto, podés crear un pedido desde Pedidos
                usando los mismos valores que ya cotizaste.
              </p>
            </section>

            <section className="onboarding__section">
              <header>
                <span className="onboarding__dot" /> BRANDING Y LINK PÚBLICO
              </header>
              <p>
                Configurá una vez el logo, nombre de marca, slogan y
                contacto — quedan guardados como default para los
                próximos presupuestos. El link público es el camino más
                rápido: el cliente lo abre en el celular y ve el
                presupuesto sin descargar nada.
              </p>
            </section>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <button type="button" className="btn-primary" onClick={onClose}>
          Entendido
        </button>
      </Modal.Footer>
    </Modal>
  );
}
