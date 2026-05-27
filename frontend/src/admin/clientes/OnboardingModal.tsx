import { Modal } from "../../components/Modal";

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Modal informativo del apartado Clientes — análogo al de Estoque /
 * Impressoras. Explica qué es la sección y cómo se conecta con el resto.
 * Se abre con el botón "?" del header.
 */
export function OnboardingModal({ open, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} size="md" labelledBy="clientes-onb-title">
      <Modal.Header onClose={onClose} id="clientes-onb-title">
        Qué es Clientes
      </Modal.Header>
      <Modal.Body>
        <div className="onboarding">
          <div className="onboarding__avatar" aria-hidden>
            <svg viewBox="0 0 64 64" width="40" height="40" fill="none">
              <circle cx="32" cy="32" r="30" fill="rgba(79,134,255,0.18)" />
              <circle cx="32" cy="26" r="10" fill="#4f86ff" />
              <path
                d="M14 52c2-9 10-14 18-14s16 5 18 14"
                fill="#4f86ff"
              />
            </svg>
          </div>
          <div className="onboarding__copy">
            <h4>Tu agenda de personas</h4>
            <p>
              Acá guardás a quien le vendés: nombre, contacto, documento y
              dirección. Cada cliente es la pieza que conecta tus pedidos,
              cobranzas e historial comercial.
            </p>

            <section className="onboarding__section">
              <header>
                <span className="onboarding__dot" /> CÓMO ENCAJA CON EL RESTO
              </header>
              <p>
                <strong>Pedidos</strong>: al crear un pedido elegís el
                cliente desde acá. Eso te deja ver el historial completo de
                compras de cada persona y a quién pertenece cada producción
                en curso.
              </p>
              <p>
                <strong>Caja / Reportes</strong>: los movimientos de cobro
                quedan asociados al cliente, así sabés cuánto te debe cada
                uno y cuáles son tus mejores compradores.
              </p>
              <p>
                <strong>Presupuestos</strong>: al generar una cotización para
                un cliente, sus datos (nombre, email, teléfono) precargan el
                presupuesto.
              </p>
            </section>

            <section className="onboarding__section">
              <header>
                <span className="onboarding__dot" /> NOMBRE Y CONTACTO
              </header>
              <p>
                El nombre es lo único obligatorio. Email y teléfono te
                ayudan a contactar al cliente desde el pedido o la
                cotización con un toque.
              </p>
            </section>

            <section className="onboarding__section">
              <header>
                <span className="onboarding__dot" /> DOCUMENTO Y DIRECCIÓN
              </header>
              <p>
                Documento (DNI / CUIT / Otro) y dirección sirven para
                facturación y envíos. Son opcionales — completalos cuando
                los necesites para una venta concreta.
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
