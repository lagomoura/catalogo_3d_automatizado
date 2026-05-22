import { Modal } from "../../components/Modal";

interface Props {
  open: boolean;
  onClose: () => void;
  onAdvance: () => void;
}

/** "Como preencher" modal para Materiales — patrón Lunaro. */
export function OnboardingModal({ open, onClose, onAdvance }: Props) {
  return (
    <Modal open={open} onClose={onClose} size="md" labelledBy="estoque-onb-title">
      <Modal.Header onClose={onClose} id="estoque-onb-title">
        Como preencher
      </Modal.Header>
      <Modal.Body>
        <div className="onboarding">
          <div className="onboarding__avatar" aria-hidden>
            🧵
          </div>
          <div className="onboarding__copy">
            <h4>Registrar un material</h4>
            <p>
              El estoque alimenta el costo real por gramo de la calculadora y
              te permite saber cuánto filamento te queda en cada momento.
            </p>

            <section className="onboarding__section">
              <header>
                <span className="onboarding__dot" /> NOMBRE Y CANTIDAD
              </header>
              <p>
                Elegí un nombre que identifique la bobina puntual (marca + color
                + tipo). El stock inicial se carga al alta como un IN de
                auditoría.
              </p>
            </section>

            <section className="onboarding__section">
              <header>
                <span className="onboarding__dot" /> MARCA, COLOR Y TIPO
              </header>
              <p>
                Marca + color + tipo identifican la línea del filamento. El
                tipo (PLA / PETG / ABS / TPU / RESIN / OTRO) clasifica para
                filtrar y reportar.
              </p>
            </section>

            <section className="onboarding__section">
              <header>
                <span className="onboarding__dot" /> COSTO POR GRAMO
              </header>
              <p>
                Dividí el precio que pagaste por el peso neto de la bobina
                (1000 g típico). Si compraste varias en la misma factura, podés
                usar el precio promedio.
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
