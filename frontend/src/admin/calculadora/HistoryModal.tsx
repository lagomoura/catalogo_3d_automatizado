import { useEffect, useMemo, useState } from "react";
import { Modal } from "../../components/Modal";
import { formatARS } from "../../utils/format";
import { round2 } from "./calc";
import type { SavedQuote } from "./storage";

interface Props {
  open: boolean;
  onClose: () => void;
  quotes: SavedQuote[];
  archived: SavedQuote[];
  editingQuoteId: string | null;
  onOpenQuote: (q: SavedQuote) => void;
  onDuplicateQuote: (q: SavedQuote) => void;
  onCreateOrderFromQuote: (q: SavedQuote) => void;
  onArchiveQuote: (q: SavedQuote) => void;
  onRestoreArchived: (q: SavedQuote) => void;
  onDeleteArchived: (q: SavedQuote) => void;
}

type Tab = "active" | "archived";

function formatTs(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Modal con dos cubetas: activas (hasta 20) + archivadas (hasta 20).
 * Eliminar de activas mueve al archivo; eliminar del archivo es definitivo.
 */
export function HistoryModal({
  open,
  onClose,
  quotes,
  archived,
  editingQuoteId,
  onOpenQuote,
  onDuplicateQuote,
  onCreateOrderFromQuote,
  onArchiveQuote,
  onRestoreArchived,
  onDeleteArchived,
}: Props) {
  const [tab, setTab] = useState<Tab>("active");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedQuery(query), 150);
    return () => window.clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setDebouncedQuery("");
      setTab("active");
    }
  }, [open]);

  const source = tab === "active" ? quotes : archived;
  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return source;
    return source.filter((quote) =>
      (quote.piece.pieceName ?? "").toLowerCase().includes(q),
    );
  }, [source, debouncedQuery]);

  return (
    <Modal open={open} onClose={onClose} size="lg" labelledBy="calc-history-title">
      <Modal.Header onClose={onClose} id="calc-history-title">
        Cotizaciones guardadas
      </Modal.Header>
      <Modal.Body>
        <div className="history-modal">
          <div className="history-modal__tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "active"}
              className={`history-modal__tab${
                tab === "active" ? " history-modal__tab--active" : ""
              }`}
              onClick={() => setTab("active")}
            >
              Activas ({quotes.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "archived"}
              className={`history-modal__tab${
                tab === "archived" ? " history-modal__tab--active" : ""
              }`}
              onClick={() => setTab("archived")}
            >
              Archivadas ({archived.length})
            </button>
          </div>

          <div className="history-modal__search">
            <input
              type="search"
              placeholder="Buscar por nombre de pieza…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>

          {source.length === 0 ? (
            <p className="hint">
              {tab === "active"
                ? "Tu historial está vacío. Guardá una cotización para que aparezca acá."
                : "No tenés cotizaciones archivadas. Las que archives desde la lista activa van a aparecer acá."}
            </p>
          ) : filtered.length === 0 ? (
            <p className="hint">Ningún resultado para «{debouncedQuery}».</p>
          ) : (
            <ul className="history-modal__list">
              {filtered.map((q) => {
                const isOpen = tab === "active" && q.id === editingQuoteId;
                const wasEdited = !!q.updatedAt;
                const total =
                  q.chargeOverride ?? round2(q.breakdown.total * q.quantity);
                const ts = formatTs(q.updatedAt ?? q.createdAt);
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
                        {tab === "archived" && q.archivedAt
                          ? ` · archivada ${formatTs(q.archivedAt)}`
                          : ""}
                      </span>
                    </div>
                    <span className="history-modal__total">{formatARS(total)}</span>
                    <div className="history-modal__actions">
                      {tab === "active" ? (
                        <>
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
                            aria-label="Archivar"
                            title="Archivar (podés restaurarla luego)"
                            onClick={() => onArchiveQuote(q)}
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn btn--sm btn--ghost"
                            onClick={() => onRestoreArchived(q)}
                            title="Restaurar a la lista activa"
                          >
                            ↺ Restaurar
                          </button>
                          <button
                            type="button"
                            className="btn btn--sm btn--danger-ghost"
                            aria-label="Eliminar definitivamente"
                            title="Eliminar definitivamente"
                            onClick={() => onDeleteArchived(q)}
                          >
                            ✕
                          </button>
                        </>
                      )}
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
