import { useEffect, useMemo, useState } from "react";
import { Modal } from "../../components/Modal";
import { formatARS } from "../../utils/format";
import { round2 } from "./calc";
import type { SavedQuote } from "./storage";

interface Props {
  open: boolean;
  onClose: () => void;
  quotes: SavedQuote[];
  editingQuoteId: string | null;
  onOpenQuote: (q: SavedQuote) => void;
  onDuplicateQuote: (q: SavedQuote) => void;
  onCreateOrderFromQuote: (q: SavedQuote) => void;
  onDeleteQuote: (id: string) => void;
}

/**
 * Modal con la lista completa de hasta 20 cotizaciones guardadas + buscador
 * por nombre. Sigue el patrón de Modal genérico del proyecto.
 */
export function HistoryModal({
  open,
  onClose,
  quotes,
  editingQuoteId,
  onOpenQuote,
  onDuplicateQuote,
  onCreateOrderFromQuote,
  onDeleteQuote,
}: Props) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce 150ms para que el filtro no re-renderice en cada keystroke.
  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedQuery(query), 150);
    return () => window.clearTimeout(handle);
  }, [query]);

  // Reset del search cuando el modal se cierra
  useEffect(() => {
    if (!open) {
      setQuery("");
      setDebouncedQuery("");
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return quotes;
    return quotes.filter((quote) =>
      (quote.piece.pieceName ?? "").toLowerCase().includes(q),
    );
  }, [quotes, debouncedQuery]);

  return (
    <Modal open={open} onClose={onClose} size="lg" labelledBy="calc-history-title">
      <Modal.Header onClose={onClose} id="calc-history-title">
        Todas las cotizaciones ({quotes.length})
      </Modal.Header>
      <Modal.Body>
        <div className="history-modal">
          <div className="history-modal__search">
            <input
              type="search"
              placeholder="Buscar por nombre de pieza…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>

          {quotes.length === 0 ? (
            <p className="hint">
              Tu historial está vacío. Guardá una cotización para que aparezca acá.
            </p>
          ) : filtered.length === 0 ? (
            <p className="hint">
              Ningún resultado para «{debouncedQuery}».
            </p>
          ) : (
            <ul className="history-modal__list">
              {filtered.map((q) => {
                const isOpen = q.id === editingQuoteId;
                const wasEdited = !!q.updatedAt;
                const total =
                  q.chargeOverride ?? round2(q.breakdown.total * q.quantity);
                const ts = new Date(q.updatedAt ?? q.createdAt).toLocaleString(
                  "es-AR",
                  {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                );
                return (
                  <li
                    key={q.id}
                    className={`history-modal__item${
                      isOpen ? " history-modal__item--editing" : ""
                    }`}
                  >
                    <div className="history-modal__main">
                      <strong>
                        {q.piece.pieceName || "Sin nombre"}
                        {isOpen && (
                          <span className="calc__history-badge">Abierta</span>
                        )}
                      </strong>
                      <span className="hint">
                        {ts}
                        {wasEdited ? " · editada" : ""} · {q.quantity} u · ×
                        {q.piece.profitMultiplier}
                        {q.piece.materials && q.piece.materials.length > 1
                          ? ` · ${q.piece.materials.length} filamentos`
                          : ""}
                        {q.chargeOverride != null && " · ✎ manual"}
                      </span>
                    </div>
                    <span className="history-modal__total">{formatARS(total)}</span>
                    <div className="history-modal__actions">
                      <button
                        type="button"
                        className="btn btn--sm btn--ghost"
                        onClick={() => {
                          onOpenQuote(q);
                          onClose();
                        }}
                        disabled={isOpen}
                      >
                        {isOpen ? "Abierta" : "Abrir"}
                      </button>
                      <button
                        type="button"
                        className="btn btn--sm btn--ghost"
                        onClick={() => {
                          onDuplicateQuote(q);
                          onClose();
                        }}
                      >
                        Duplicar
                      </button>
                      <button
                        type="button"
                        className="btn btn--sm btn--ghost"
                        onClick={() => {
                          onCreateOrderFromQuote(q);
                          onClose();
                        }}
                      >
                        Pedido →
                      </button>
                      <button
                        type="button"
                        className="btn btn--sm btn--ghost"
                        aria-label="Eliminar"
                        onClick={() => onDeleteQuote(q.id)}
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          Cerrar
        </button>
      </Modal.Footer>
    </Modal>
  );
}
