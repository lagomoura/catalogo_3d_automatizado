import { Modal } from "../../components/Modal";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function OnboardingModal({ open, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} size="md" labelledBy="pedidos-onb-title">
      <Modal.Header onClose={onClose} id="pedidos-onb-title">
        Qué es Pedidos
      </Modal.Header>
      <Modal.Body>
        <div className="onboarding">
          <div className="onboarding__avatar" aria-hidden>
            <svg viewBox="0 0 64 64" width="40" height="40" fill="none">
              <circle cx="32" cy="32" r="30" fill="rgba(79,134,255,0.18)" />
              <rect x="14" y="14" width="36" height="36" rx="4" fill="#4f86ff" />
              <rect x="20" y="22" width="24" height="3" rx="1" fill="#fff" />
              <rect x="20" y="30" width="20" height="3" rx="1" fill="#fff" />
              <rect x="20" y="38" width="16" height="3" rx="1" fill="#fff" />
            </svg>
          </div>
          <div className="onboarding__copy">
            <h4>El corazón del flujo comercial</h4>
            <p>
              Cada venta vive acá como un pedido: a quién, qué, cuánto,
              cuándo, en qué estado. Los pedidos atraviesan los demás
              módulos — son la unidad que conecta cliente, producción,
              cobro y stock.
            </p>

            <section className="onboarding__section">
              <header>
                <span className="onboarding__dot" /> CÓMO ENCAJA CON EL RESTO
              </header>
              <p>
                <strong>Clientes</strong>: cada pedido apunta a un
                cliente. Su historial completo se ve desde la ficha.
              </p>
              <p>
                <strong>Calculadora</strong>: una cotización se convierte
                en pedido con un click. Materiales y costos quedan
                congelados al momento de crear.
              </p>
              <p>
                <strong>Producción</strong>: cuando arrancás un pedido,
                pasa al tablero de Producción. Cada corrida real se
                vincula al pedido.
              </p>
              <p>
                <strong>Inventario</strong>: al crearse el pedido se
                descuenta automáticamente el material que listaste en la
                cotización (líneas × cantidad).
              </p>
              <p>
                <strong>Caja</strong>: el cobro asociado al pedido
                aparece en Caja como movimiento de crédito vinculado al
                cliente.
              </p>
            </section>

            <section className="onboarding__section">
              <header>
                <span className="onboarding__dot" /> ESTADOS Y PRIORIDAD
              </header>
              <p>
                Un pedido recorre: <em>Creado → Ejecutando → Ejecutado →
                Entregado</em>. Marcalo como pago al cobrar y subí la
                prioridad cuando el cliente apura. Los "Próximos del
                plazo" y "Atrasados" usan la fecha de entrega que
                cargaste.
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
