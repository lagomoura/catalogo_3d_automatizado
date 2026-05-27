import { Modal } from "../../components/Modal";

interface Props {
  open: boolean;
  onClose: () => void;
  onAdvance: () => void;
}

/**
 * Modal explicativo del apartado Impresoras. Se muestra automáticamente
 * la primera vez (flag en localStorage) y queda accesible desde el
 * botón "?" del header. Combina "qué es la sección + cómo encaja con
 * el resto" con la guía de campos del formulario.
 */
export function OnboardingModal({ open, onClose, onAdvance }: Props) {
  return (
    <Modal open={open} onClose={onClose} size="md" labelledBy="impresoras-onb-title">
      <Modal.Header onClose={onClose} id="impresoras-onb-title">
        Qué es Impresoras
      </Modal.Header>
      <Modal.Body>
        <div className="onboarding">
          <div className="onboarding__avatar" aria-hidden>
            <svg viewBox="0 0 64 64" width="40" height="40" fill="none">
              <circle cx="32" cy="32" r="30" fill="rgba(79,134,255,0.18)" />
              <rect x="14" y="18" width="36" height="22" rx="3" fill="#4f86ff" />
              <rect x="20" y="40" width="24" height="10" rx="2" fill="#3b6fe0" />
              <rect x="22" y="24" width="20" height="3" rx="1" fill="#fff" />
              <rect x="22" y="30" width="14" height="3" rx="1" fill="#fff" />
            </svg>
          </div>
          <div className="onboarding__copy">
            <h4>Tu parque de máquinas</h4>
            <p>
              Es el registro de tus impresoras: cada una con su consumo,
              vida útil y costo de repuestos. De acá sale el{" "}
              <strong>costo por hora</strong> que el resto del sistema usa
              para presupuestar y producir.
            </p>

            <section className="onboarding__section">
              <header>
                <span className="onboarding__dot" /> CÓMO ENCAJA CON EL RESTO
              </header>
              <p>
                <strong>Calculadora</strong>: al elegir una impresora en
                una cotización, sus valores (watts, vida útil, repuestos)
                reemplazan a los globales y se desglosan en el costo de la
                pieza — energía y desgaste por separado.
              </p>
              <p>
                <strong>Producción</strong>: cada corrida de impresión
                referencia una impresora; te permite acumular horas reales
                por máquina y ver cuánto le falta a cada una para llegar
                al fin de su vida útil.
              </p>
              <p>
                <strong>Caja / Reportes</strong>: el costo/hora es el
                insumo base para que los reportes de rentabilidad sepan
                cuánto te cuesta producir cada pieza.
              </p>
            </section>

            <section className="onboarding__section">
              <header>
                <span className="onboarding__dot" /> NOMBRE / MARCA / MODELO
              </header>
              <p>
                El nombre te permite distinguir si tenés varias del mismo
                modelo (ej. "Bambu X1C taller", "Bambu X1C casa"). Marca y
                modelo son opcionales.
              </p>
            </section>

            <section className="onboarding__section">
              <header>
                <span className="onboarding__dot" /> AMBIENTE
              </header>
              <p>
                Texto libre (taller, casa, oficina…). Ayuda cuando tenés
                impresoras en distintos lugares.
              </p>
            </section>

            <section className="onboarding__section">
              <header>
                <span className="onboarding__dot" /> COSTO POR HORA
              </header>
              <p>
                Te lo calculamos solo si cargás <strong>consumo (W)</strong>,
                <strong> vida útil (h)</strong> y{" "}
                <strong>costo de repuestos</strong>. Si ya sabés tu
                costo/hora, podés tocar "Ingresar manualmente" y
                escribirlo directo.
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
