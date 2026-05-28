import { useAssistant } from "./AssistantProvider";
import type { PendingAction } from "./types";

interface Props {
  action: PendingAction;
  state: "pending" | "confirming" | "done" | "canceled";
  error?: string;
}

export function ActionCard({ action, state, error }: Props) {
  const { confirmAction } = useAssistant();
  const { preview } = action;

  const disabled = state !== "pending";

  return (
    <div
      className={`assistant-action assistant-action--${state}`}
      role="group"
      aria-label={preview.titulo}
    >
      <div className="assistant-action__head">
        <span className="assistant-action__icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
        <span className="assistant-action__title">{preview.titulo}</span>
        {state === "done" && (
          <span className="assistant-action__badge assistant-action__badge--ok">
            Confirmado
          </span>
        )}
        {state === "canceled" && (
          <span className="assistant-action__badge assistant-action__badge--cancel">
            Cancelado
          </span>
        )}
      </div>

      <dl className="assistant-action__fields">
        {preview.campos.map((c) => (
          <div key={c.label} className="assistant-action__field">
            <dt>{c.label}</dt>
            <dd>{c.value || "—"}</dd>
          </div>
        ))}
      </dl>

      {error && state === "done" && (
        <div className="assistant-action__error">{error}</div>
      )}

      {state === "pending" && (
        <div className="assistant-action__buttons">
          <button
            type="button"
            className="btn btn--small btn--ghost"
            onClick={() => void confirmAction(action.confirmation_id, false)}
            disabled={disabled}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--small btn--primary"
            onClick={() => void confirmAction(action.confirmation_id, true)}
            disabled={disabled}
          >
            Confirmar
          </button>
        </div>
      )}

      {state === "confirming" && (
        <div className="assistant-action__buttons">
          <span className="assistant-action__spinner" aria-label="Procesando" />
        </div>
      )}
    </div>
  );
}
