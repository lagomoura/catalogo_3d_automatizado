import { Modal } from "../../components/Modal";

interface Props {
  open: boolean;
  onClose: () => void;
  onAdvance: () => void;
}

/**
 * "Como preencher" — estilo Lunaro. Explica el formulario de carga de
 * materiales antes de que el usuario lo abra. Se muestra una vez por default
 * (flag en localStorage) y se puede reabrir manualmente desde el botón "?".
 */
export function OnboardingModal({ open, onClose, onAdvance }: Props) {
  return (
    <Modal open={open} onClose={onClose} size="md" labelledBy="estoque-onb-title">
      <Modal.Header onClose={onClose} id="estoque-onb-title">
        Como preencher
      </Modal.Header>
      <Modal.Body>
        <div className="onboarding">
          <div className="onboarding__avatar" aria-hidden>
            <svg viewBox="0 0 64 64" width="40" height="40" fill="none">
              <circle cx="32" cy="32" r="30" fill="rgba(79,134,255,0.18)" />
              <circle cx="32" cy="28" r="11" fill="#4f86ff" />
              <rect x="14" y="40" width="36" height="14" rx="7" fill="#4f86ff" />
              <circle cx="27" cy="27" r="2.2" fill="#fff" />
              <circle cx="37" cy="27" r="2.2" fill="#fff" />
              <rect
                x="29.5"
                y="14"
                width="5"
                height="6"
                rx="2"
                fill="#4f86ff"
              />
            </svg>
          </div>
          <div className="onboarding__copy">
            <h4>Como preencher</h4>
            <p>
              Na próxima etapa, o formulário cadastra ou ajusta uma bobina.
              Cada campo entra no custo por kg e na lista do estoque.
            </p>

            <section className="onboarding__section">
              <header>
                <span className="onboarding__dot" /> NOMBRE Y SUGESTÕES
              </header>
              <p>
                Si elegís <strong>Filamento</strong>, el nombre se arma
                automáticamente con el tipo y el color (ej.{" "}
                <em>"PLA blanco"</em>). Podés sobrescribirlo si querés algo más
                específico. En <strong>Otros materiales</strong> el nombre se
                carga a mano.
              </p>
            </section>

            <section className="onboarding__section">
              <header>
                <span className="onboarding__dot" /> MARCA, COR Y MATERIAL / TIPO
              </header>
              <p>
                Marca + color + tipo identifican la línea del filamento. El
                tipo (PLA / PETG / ABS / TPU) clasifica para filtrar, reportar
                y para los cálculos de la calculadora. Cadastros con los
                mismos datos quedan como <strong>una línea</strong> en la
                tabla.
              </p>
            </section>

            <section className="onboarding__section">
              <header>
                <span className="onboarding__dot" /> PESO Y PREÇO
              </header>
              <p>
                Usá <strong>gramos</strong> para el stock inicial (una bobina
                típica son 1000 g). El costo se carga{" "}
                <strong>por kilo</strong> — tal cual lo pagaste — y el sistema
                lo prorratea por gramo cuando calcula el costo de una
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
          Avanzar para el cadastro
        </button>
      </Modal.Footer>
    </Modal>
  );
}
