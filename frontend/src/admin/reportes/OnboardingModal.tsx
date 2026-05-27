import { Modal } from "../../components/Modal";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function OnboardingModal({ open, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} size="md" labelledBy="reportes-onb-title">
      <Modal.Header onClose={onClose} id="reportes-onb-title">
        Qué son los Reportes
      </Modal.Header>
      <Modal.Body>
        <div className="onboarding">
          <div className="onboarding__avatar" aria-hidden>
            <svg viewBox="0 0 64 64" width="40" height="40" fill="none">
              <circle cx="32" cy="32" r="30" fill="rgba(79,134,255,0.18)" />
              <rect x="14" y="36" width="8" height="14" rx="1" fill="#4f86ff" />
              <rect x="26" y="26" width="8" height="24" rx="1" fill="#4f86ff" />
              <rect x="38" y="18" width="8" height="32" rx="1" fill="#4f86ff" />
            </svg>
          </div>
          <div className="onboarding__copy">
            <h4>Tu termómetro del negocio</h4>
            <p>
              Vista panorámica de todo lo que hace el sistema: facturación,
              costos, rentabilidad por producto y por cliente, evolución
              mensual y comparación contra el período anterior. Cruzá los
              datos de los demás módulos en un solo lugar.
            </p>

            <section className="onboarding__section">
              <header>
                <span className="onboarding__dot" /> DE DÓNDE SALEN LOS DATOS
              </header>
              <p>
                <strong>Caja</strong>: facturación, gastos por categoría,
                evolución mensual y balance neto vienen de los
                movimientos.
              </p>
              <p>
                <strong>Pedidos</strong>: cantidad de ventas, valor
                pendiente de cobro, ticket promedio y tiempo de
                producción.
              </p>
              <p>
                <strong>Clientes</strong>: ranking por compras, deuda
                pendiente y mejores compradores del período.
              </p>
              <p>
                <strong>Calculadora + Inventario</strong>: el costo real
                de cada producto sale del cruce entre lo cotizado y el
                costo actual de materiales.
              </p>
            </section>

            <section className="onboarding__section">
              <header>
                <span className="onboarding__dot" /> RANGO DE FECHAS
              </header>
              <p>
                El selector de rango (arriba a la derecha) determina todo
                el dashboard. Los reportes comparan automáticamente el
                rango elegido contra el período inmediatamente anterior
                para ver tendencias.
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
