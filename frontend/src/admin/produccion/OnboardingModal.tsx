import { Modal } from "../../components/Modal";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function OnboardingModal({ open, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} size="md" labelledBy="prod-onb-title">
      <Modal.Header onClose={onClose} id="prod-onb-title">
        Qué es Producción
      </Modal.Header>
      <Modal.Body>
        <div className="onboarding">
          <div className="onboarding__avatar" aria-hidden>
            <svg viewBox="0 0 64 64" width="40" height="40" fill="none">
              <circle cx="32" cy="32" r="30" fill="rgba(79,134,255,0.18)" />
              <rect x="16" y="18" width="32" height="24" rx="3" fill="#4f86ff" />
              <rect x="22" y="42" width="20" height="8" rx="2" fill="#3b6fe0" />
              <circle cx="32" cy="30" r="6" fill="#fff" />
              <circle cx="32" cy="30" r="2.5" fill="#4f86ff" />
            </svg>
          </div>
          <div className="onboarding__copy">
            <h4>Tu taller en tiempo real</h4>
            <p>
              Cada corrida de impresión es una fila acá: qué pieza, en
              qué impresora, con qué material, cuántos minutos, en qué
              estado. Sirve para coordinar el día a día del taller, ver
              cuello de botella y acumular horas reales por máquina.
            </p>

            <section className="onboarding__section">
              <header>
                <span className="onboarding__dot" /> CÓMO ENCAJA CON EL RESTO
              </header>
              <p>
                <strong>Pedidos</strong>: cuando arrancás un pedido, sus
                piezas pueden registrarse como corridas en Producción.
                Eso te deja saber a qué cliente pertenece cada impresión
                en curso.
              </p>
              <p>
                <strong>Impresoras</strong>: cada corrida elige una
                máquina. Las horas concluidas se suman para estimar la
                vida útil restante de cada impresora.
              </p>
              <p>
                <strong>Inventario</strong>: el material elegido en la
                corrida te ayuda a llevar el seguimiento físico — si una
                impresión falla, queda anotado para ajustar stock.
              </p>
            </section>

            <section className="onboarding__section">
              <header>
                <span className="onboarding__dot" /> ESTADOS Y TIEMPOS
              </header>
              <p>
                <em>Pendiente → En producción → Pausada → Concluida /
                Cancelada</em>. El sistema descuenta los tiempos pausados
                para que las horas reales por máquina sean fieles a lo
                trabajado, no al reloj de pared.
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
