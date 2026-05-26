import { Modal } from "../../components/Modal";

interface Props {
  open: boolean;
  onClose: () => void;
  onAdvance: () => void;
}

/**
 * "Como preencher" modal — patrón Lunaro. Se muestra una vez, antes del form,
 * para explicar por qué importan los campos de la impresora.
 *
 * El padre decide cuándo abrirlo (típicamente al hacer click en
 * "+ Adicionar impressora" la primera vez; persiste un flag en localStorage
 * para no volver a mostrarlo).
 */
export function OnboardingModal({ open, onClose, onAdvance }: Props) {
  return (
    <Modal open={open} onClose={onClose} size="md" labelledBy="onboarding-title">
      <Modal.Header onClose={onClose} id="onboarding-title">
        Como preencher
      </Modal.Header>
      <Modal.Body>
        <div className="onboarding">
          <div className="onboarding__avatar" aria-hidden>
            🤖
          </div>
          <div className="onboarding__copy">
            <h4>Registrar una impressora</h4>
            <p>
              En el próximo paso completás el formulario. Esta información se
              usa para estimar el costo por hora real en la calculadora y para
              llevar el tracking de producción.
            </p>

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
                impressoras en distintos lugares.
              </p>
            </section>

            <section className="onboarding__section">
              <header>
                <span className="onboarding__dot" /> COSTO POR HORA
              </header>
              <p>
                Te lo calculamos solo si cargás <strong>consumo (W)</strong>,
                <strong> vida útil (h)</strong> y{" "}
                <strong>costo de repuestos</strong>. Si ya sabés tu costo/hora,
                podés tocar "Ingresar manualmente" y escribirlo directo.
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
          Avanzar para el cadastro
        </button>
      </Modal.Footer>
    </Modal>
  );
}
