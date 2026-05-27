import { Modal } from "../../components/Modal";

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Modal informativo de la Calculadora — explica para qué sirve y cómo se
 * conecta con las otras secciones. Se abre con el botón "?" del header.
 */
export function OnboardingModal({ open, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} size="md" labelledBy="calc-onb-title">
      <Modal.Header onClose={onClose} id="calc-onb-title">
        Qué es la Calculadora
      </Modal.Header>
      <Modal.Body>
        <div className="onboarding">
          <div className="onboarding__avatar" aria-hidden>
            <svg viewBox="0 0 64 64" width="40" height="40" fill="none">
              <circle cx="32" cy="32" r="30" fill="rgba(79,134,255,0.18)" />
              <rect x="18" y="14" width="28" height="36" rx="3" fill="#4f86ff" />
              <rect x="22" y="18" width="20" height="8" rx="2" fill="#fff" />
              <circle cx="26" cy="32" r="2.4" fill="#fff" />
              <circle cx="32" cy="32" r="2.4" fill="#fff" />
              <circle cx="38" cy="32" r="2.4" fill="#fff" />
              <circle cx="26" cy="40" r="2.4" fill="#fff" />
              <circle cx="32" cy="40" r="2.4" fill="#fff" />
              <circle cx="38" cy="40" r="2.4" fill="#fff" />
            </svg>
          </div>
          <div className="onboarding__copy">
            <h4>Tu motor de precios</h4>
            <p>
              Estimás el costo real de una pieza (material + energía +
              desgaste + margen de error) y sumás el margen comercial y la
              comisión del marketplace para llegar al precio final de
              venta. Es el puente entre tu inventario / impresoras y los
              pedidos.
            </p>

            <section className="onboarding__section">
              <header>
                <span className="onboarding__dot" /> CÓMO ENCAJA CON EL RESTO
              </header>
              <p>
                <strong>Inventario</strong>: los materiales que cargás como
                líneas vienen del inventario; al confirmar un pedido se
                descuenta el consumo automáticamente.
              </p>
              <p>
                <strong>Impresoras</strong>: si seleccionás una impresora,
                sus valores (consumo, vida útil, repuestos) reemplazan a
                los globales y se desglosan en el costo de la pieza.
              </p>
              <p>
                <strong>Pedidos</strong>: con un click podés convertir la
                cotización en un pedido — sus costos y materiales se
                "snapshotean" para que después no cambien si tocás los
                valores de inventario.
              </p>
            </section>

            <section className="onboarding__section">
              <header>
                <span className="onboarding__dot" /> CONFIGURACIÓN GLOBAL
              </header>
              <p>
                El precio del kWh, el margen de error y la comisión del
                marketplace se configuran una sola vez (pestaña{" "}
                <em>Configuración</em>) y aplican a todas las cotizaciones
                hasta que las cambies.
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
