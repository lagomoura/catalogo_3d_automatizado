import { Modal } from "../../components/Modal";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function OnboardingModal({ open, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} size="md" labelledBy="pedidos-onb-title">
      <Modal.Header onClose={onClose} id="pedidos-onb-title">
        Qué es Pedidos & Producción
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
            <h4>El corazón del flujo comercial — con su taller adentro</h4>
            <p>
              Cada venta vive acá como un pedido: a quién, qué, cuánto,
              cuándo, en qué estado. Y dentro de cada pedido están sus
              piezas en producción, con el reloj corriendo en vivo.
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
                <strong>Impresoras</strong>: cada corrida elige una
                máquina. Las horas concluidas se suman para estimar la
                vida útil restante de cada impresora.
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
                <span className="onboarding__dot" /> PRODUCCIÓN DENTRO DEL PEDIDO
              </header>
              <p>
                Expandí un pedido en curso para ver sus corridas reales:
                qué pieza, en qué impresora, cuántos minutos restantes.
                Iniciá, pausá, finalizá o cancelá cada corrida sin salir
                del pedido. El sistema descuenta los tiempos pausados
                para que las horas reales por máquina sean fieles a lo
                trabajado, no al reloj de pared.
              </p>
              <p>
                Las corridas pasan por <em>Pendiente → Imprimiendo →
                Pausada → Terminada / Cancelada</em>. Esto es ortogonal
                al estado contractual del pedido: avanzar una corrida no
                avanza el pedido — eso lo decidís vos cuando marcás
                "Listo" o "Entregar".
              </p>
            </section>

            <section className="onboarding__section">
              <header>
                <span className="onboarding__dot" /> ESTADOS DEL PEDIDO Y PRIORIDAD
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
