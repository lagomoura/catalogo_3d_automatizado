import { formatARS } from "../../utils/format";
import { round2 } from "./calc";
import type { SavedQuote } from "./storage";

/**
 * Secciones de historial de la Calculadora (extraídas del monolito). Son
 * puramente presentacionales: reciben los datos y los callbacks; toda la
 * lógica de estado/storage sigue viviendo en CalculadoraPage.
 */

interface ActiveProps {
  quotes: SavedQuote[];
  editingQuoteId: string | null;
  isDirty: boolean;
  onShowAll: () => void;
  onLoad: (q: SavedQuote) => void;
  onDuplicate: (q: SavedQuote) => void;
  onCreateOrder: (q: SavedQuote) => void;
  onArchive: (q: SavedQuote) => void;
}

export function ActiveQuotesSection({
  quotes,
  editingQuoteId,
  isDirty,
  onShowAll,
  onLoad,
  onDuplicate,
  onCreateOrder,
  onArchive,
}: ActiveProps) {
  return (
    <section className="calc__history">
      <div className="calc__history-head">
        <h3>
          Últimas cotizaciones
          {quotes.length > 5 && (
            <span className="hint"> · mostrando 5 de {quotes.length}</span>
          )}
        </h3>
        {quotes.length > 5 && (
          <button
            type="button"
            className="btn btn--sm btn--ghost"
            onClick={onShowAll}
            title="Ver todas las cotizaciones guardadas con buscador"
          >
            Ver todas ({quotes.length})
          </button>
        )}
      </div>
      {quotes.length === 0 ? (
        <div className="calc__history-empty">
          <strong>Tu historial está vacío</strong>
          <p className="hint">
            Cuando guardes una cotización aparecerá acá — vas a poder re-abrirla,
            duplicarla para hacer variantes, o convertirla en pedido directamente.
          </p>
        </div>
      ) : (
        <ul className="calc__history-list">
          {quotes.slice(0, 5).map((q) => {
            const isOpen = q.id === editingQuoteId;
            const wasEdited = !!q.updatedAt;
            return (
              <li
                key={q.id}
                className={`calc__history-item${
                  isOpen ? " calc__history-item--editing" : ""
                }`}
              >
                <div className="calc__history-main">
                  <strong>
                    {q.piece.pieceName || "Sin nombre"}
                    {isOpen && (
                      <span className="calc__history-badge" title="Esta cotización está abierta en el form">
                        Abierta{isDirty ? " · ● sin guardar" : ""}
                      </span>
                    )}
                  </strong>
                  <span className="hint">
                    {new Date(q.updatedAt ?? q.createdAt).toLocaleString("es-AR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {wasEdited ? " · editada" : ""} · {q.quantity} u · ×
                    {q.piece.profitMultiplier} · {formatARS(q.breakdown.total)}/u
                    {q.piece.materials && q.piece.materials.length > 1
                      ? ` · ${q.piece.materials.length} filamentos`
                      : ""}
                    {q.chargeOverride != null && " · ✎ valor manual"}
                  </span>
                </div>
                <span className="calc__history-total">
                  {formatARS(
                    q.chargeOverride ?? round2(q.breakdown.total * q.quantity),
                  )}
                </span>
                <div className="calc__history-actions">
                  <button
                    type="button"
                    className="btn btn--sm btn--ghost"
                    onClick={() => onLoad(q)}
                    disabled={isOpen && !isDirty}
                    title={
                      isOpen
                        ? "Ya está abierta"
                        : "Abrir esta cotización en el form para editarla"
                    }
                  >
                    {isOpen ? "Abierta" : "Abrir"}
                  </button>
                  <button
                    type="button"
                    className="btn btn--sm btn--ghost"
                    onClick={() => onDuplicate(q)}
                    title="Cargar los datos como una cotización NUEVA (para hacer variantes)"
                  >
                    Duplicar
                  </button>
                  <button
                    type="button"
                    className="btn btn--sm btn--ghost"
                    onClick={() => onCreateOrder(q)}
                  >
                    Pedido →
                  </button>
                  <button
                    type="button"
                    className="btn btn--sm btn--ghost"
                    onClick={() => onArchive(q)}
                    aria-label="Archivar"
                    title="Archivar (podés restaurarla luego)"
                  >
                    ✕
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

interface ArchivedProps {
  archived: SavedQuote[];
  onShowAll: () => void;
  onRestore: (q: SavedQuote) => void;
  onDelete: (q: SavedQuote) => void;
}

export function ArchivedQuotesSection({
  archived,
  onShowAll,
  onRestore,
  onDelete,
}: ArchivedProps) {
  if (archived.length === 0) return null;
  return (
    <section className="calc__history">
      <div className="calc__history-head">
        <h3>
          Cotizaciones archivadas
          {archived.length > 5 && (
            <span className="hint"> · mostrando 5 de {archived.length}</span>
          )}
        </h3>
        {archived.length > 5 && (
          <button
            type="button"
            className="btn btn--sm btn--ghost"
            onClick={onShowAll}
            title="Ver todas las cotizaciones archivadas"
          >
            Ver todas ({archived.length})
          </button>
        )}
      </div>
      <ul className="calc__history-list">
        {archived.slice(0, 5).map((q) => (
          <li key={q.id} className="calc__history-item">
            <div className="calc__history-main">
              <strong>{q.piece.pieceName || "Sin nombre"}</strong>
              <span className="hint">
                archivada{" "}
                {new Date(q.archivedAt ?? q.updatedAt ?? q.createdAt).toLocaleString("es-AR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {" · "}
                {q.quantity} u · ×{q.piece.profitMultiplier} ·{" "}
                {formatARS(q.breakdown.total)}/u
                {q.piece.materials && q.piece.materials.length > 1
                  ? ` · ${q.piece.materials.length} filamentos`
                  : ""}
                {q.chargeOverride != null && " · ✎ valor manual"}
              </span>
            </div>
            <span className="calc__history-total">
              {formatARS(
                q.chargeOverride ?? round2(q.breakdown.total * q.quantity),
              )}
            </span>
            <div className="calc__history-actions">
              <button
                type="button"
                className="btn btn--sm btn--ghost"
                onClick={() => onRestore(q)}
                title="Restaurar a cotizaciones activas"
              >
                Restaurar
              </button>
              <button
                type="button"
                className="btn btn--sm btn--ghost"
                onClick={() => onDelete(q)}
                title="Eliminar permanentemente"
                aria-label="Eliminar permanentemente"
              >
                Eliminar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
