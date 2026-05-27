import { Modal } from "../../components/Modal";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function OnboardingModal({ open, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} size="md" labelledBy="caja-onb-title">
      <Modal.Header onClose={onClose} id="caja-onb-title">
        Qué es Caja
      </Modal.Header>
      <Modal.Body>
        <div className="onboarding">
          <div className="onboarding__avatar" aria-hidden>
            <svg viewBox="0 0 64 64" width="40" height="40" fill="none">
              <circle cx="32" cy="32" r="30" fill="rgba(79,134,255,0.18)" />
              <rect x="12" y="22" width="40" height="22" rx="3" fill="#4f86ff" />
              <circle cx="32" cy="33" r="5" fill="#fff" />
              <rect x="16" y="26" width="6" height="3" rx="1" fill="#fff" />
              <rect x="42" y="38" width="6" height="3" rx="1" fill="#fff" />
            </svg>
          </div>
          <div className="onboarding__copy">
            <h4>Tu flujo de dinero</h4>
            <p>
              Acá registrás cada peso que entra y sale: ventas, compras,
              gastos fijos, retiros. Tiene un resumen visual y un detalle
              de movimientos buscable y filtrable. Sirve para entender la
              salud financiera del negocio.
            </p>

            <section className="onboarding__section">
              <header>
                <span className="onboarding__dot" /> CÓMO ENCAJA CON EL RESTO
              </header>
              <p>
                <strong>Pedidos</strong>: al cobrar un pedido, queda un
                movimiento de crédito asociado al cliente y al producto.
              </p>
              <p>
                <strong>Clientes</strong>: cada movimiento puede apuntar
                a un cliente. Eso alimenta el estado de cuenta y los
                "mejores clientes" en los reportes.
              </p>
              <p>
                <strong>Inventario / Impresoras</strong>: compras de
                materiales y repuestos se cargan acá como egresos. Los
                gastos fijos (luz, alquiler) son una entidad aparte que
                se carga automáticamente cada mes.
              </p>
              <p>
                <strong>Reportes</strong>: los movimientos clasificados
                por categoría alimentan los gráficos de rentabilidad y
                la torta de gastos.
              </p>
            </section>

            <section className="onboarding__section">
              <header>
                <span className="onboarding__dot" /> CATEGORÍAS Y GASTOS FIJOS
              </header>
              <p>
                Las categorías (ej. <em>Filamento/Insumos</em>,{" "}
                <em>Electricidad</em>) clasifican cada movimiento para
                analizarlos después. Los gastos fijos definen pagos
                recurrentes (alquiler, luz, sueldos) que se devengan
                automáticamente cada mes.
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
