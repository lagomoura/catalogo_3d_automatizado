import { Modal } from "../../components/Modal";

interface Props {
  open: boolean;
  onClose: () => void;
  onAdvance: () => void;
}

/**
 * Modal explicativo del apartado Inventario — patrón compartido con
 * Impresoras / Clientes / etc. Explica qué es la sección, cómo encaja
 * con el resto y cómo completar el formulario. Se muestra una vez por
 * default (flag en localStorage) y se puede reabrir desde el botón "?".
 */
export function OnboardingModal({ open, onClose, onAdvance }: Props) {
  return (
    <Modal open={open} onClose={onClose} size="md" labelledBy="estoque-onb-title">
      <Modal.Header onClose={onClose} id="estoque-onb-title">
        Qué es Inventario
      </Modal.Header>
      <Modal.Body>
        <div className="onboarding">
          <div className="onboarding__avatar" aria-hidden>
            <svg viewBox="0 0 64 64" width="40" height="40" fill="none">
              <circle cx="32" cy="32" r="30" fill="rgba(79,134,255,0.18)" />
              <rect x="14" y="20" width="36" height="28" rx="3" fill="#4f86ff" />
              <rect x="20" y="14" width="24" height="8" rx="2" fill="#3b6fe0" />
              <rect x="20" y="30" width="10" height="3" rx="1" fill="#fff" />
              <rect x="20" y="36" width="16" height="3" rx="1" fill="#fff" />
            </svg>
          </div>
          <div className="onboarding__copy">
            <h4>Tu stock real</h4>
            <p>
              Acá vive cada material que usás: filamentos, resinas, imanes,
              pintura, tornillería. Cada uno con su unidad propia (gramos,
              unidades o mililitros) y su costo real. Es la fuente de la
              que se sirven el resto de los módulos para calcular y
              descontar consumo.
            </p>

            <section className="onboarding__section">
              <header>
                <span className="onboarding__dot" /> CÓMO ENCAJA CON EL RESTO
              </header>
              <p>
                <strong>Calculadora</strong>: cuando armás una cotización,
                elegís materiales desde acá. Su <em>costo por unidad</em>{" "}
                alimenta el costo de material de la pieza.
              </p>
              <p>
                <strong>Pedidos / Producción</strong>: al confirmar un
                pedido se descuenta automáticamente el material consumido
                (cantidad de la pieza × cantidad del pedido). Cada
                movimiento queda registrado para auditoría.
              </p>
              <p>
                <strong>Caja / Reportes</strong>: las compras de material
                (movimiento IN) y los consumos por venta (OUT) son la base
                del costo real de cada producto en los reportes.
              </p>
            </section>

            <section className="onboarding__section">
              <header>
                <span className="onboarding__dot" /> NOMBRE Y SUGERENCIAS
              </header>
              <p>
                Si elegís <strong>Filamento</strong>, el nombre se arma
                automáticamente con el tipo y el color (ej.{" "}
                <em>"PLA blanco"</em>). Podés sobrescribirlo si querés algo
                más específico. En <strong>Otros materiales</strong> el
                nombre se carga a mano.
              </p>
            </section>

            <section className="onboarding__section">
              <header>
                <span className="onboarding__dot" /> MARCA, COLOR Y TIPO
              </header>
              <p>
                Marca + color + tipo identifican la línea del filamento. El
                tipo (PLA / PETG / ABS / TPU) clasifica para filtrar y para
                los cálculos de la calculadora. Registros con los mismos
                datos quedan como <strong>una sola línea</strong> en la
                tabla.
              </p>
            </section>

            <section className="onboarding__section">
              <header>
                <span className="onboarding__dot" /> PESO Y PRECIO
              </header>
              <p>
                Usá <strong>gramos</strong> para el stock inicial (una
                bobina típica son 1000 g). El costo se carga{" "}
                <strong>por kilo</strong> — tal cual lo pagaste — y el
                sistema lo prorratea por gramo al calcular el costo de una
                impresión.
              </p>
            </section>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <button type="button" className="btn-ghost" onClick={onClose}>
          Cerrar
        </button>
        <button type="button" className="btn-primary" onClick={onAdvance}>
          Avanzar al registro
        </button>
      </Modal.Footer>
    </Modal>
  );
}
