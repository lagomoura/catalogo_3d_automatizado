import type { SavedQuote } from "./storage";

interface Props {
  editing: SavedQuote;
  isDirty: boolean;
  onDiscard: () => void;
  onNew: () => void;
}

/**
 * Banner sticky entre el header y el form-grid que indica al usuario qué
 * cotización tiene abierta y si hay cambios sin guardar. Sigue el principio
 * de Krug de "self-evident": el estado del sistema siempre visible.
 */
export function EditingBanner({ editing, isDirty, onDiscard, onNew }: Props) {
  const name = editing.piece.pieceName?.trim() || "Cotización sin nombre";
  const createdAt = new Date(editing.createdAt).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const updatedAt = editing.updatedAt
    ? new Date(editing.updatedAt).toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div
      className={`calc__editing-banner${isDirty ? " calc__editing-banner--dirty" : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className="calc__editing-banner__main">
        <span className="calc__editing-banner__label">
          {isDirty ? "● Editando" : "✎ Editando"}
        </span>
        <strong className="calc__editing-banner__name">{name}</strong>
        <span className="hint">
          creada {createdAt}
          {updatedAt && ` · editada ${updatedAt}`}
        </span>
        <span
          className={`calc__editing-banner__status calc__editing-banner__status--${isDirty ? "dirty" : "synced"}`}
        >
          {isDirty ? "● Cambios sin guardar" : "✓ Sincronizada"}
        </span>
      </div>
      <div className="calc__editing-banner__actions">
        {isDirty && (
          <button
            type="button"
            className="btn btn--sm btn--ghost"
            onClick={onDiscard}
            title="Volver al estado original de esta cotización"
          >
            Descartar cambios
          </button>
        )}
        <button
          type="button"
          className="btn btn--sm btn--ghost"
          onClick={onNew}
          title="Cerrar esta cotización y empezar una nueva (Ctrl+N)"
        >
          Nueva cotización
        </button>
      </div>
    </div>
  );
}
