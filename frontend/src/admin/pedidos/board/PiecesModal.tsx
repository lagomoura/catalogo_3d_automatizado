import { useState } from "react";
import type {
  Order,
  Printer,
  ProductionRun,
  ProductionRunCreatePayload,
  ProductionRunUpdatePayload,
  ProductionStatus,
} from "../../../types";

const STATUS_LABEL: Record<ProductionStatus, string> = {
  PENDENTE: "En cola",
  EM_PRODUCAO: "En vivo",
  PAUSADA: "Pausada",
  CONCLUIDA: "Terminada",
  CANCELADA: "Cancelada",
};

interface PiecesModalProps {
  order: Order;
  runs: ProductionRun[];
  printers: Printer[];
  onClose: () => void;
  onUpdate: (id: number, payload: ProductionRunUpdatePayload) => Promise<void>;
  onCreate: (orderId: number, payload: ProductionRunCreatePayload) => Promise<void>;
  onCancel: (id: number) => void;
  onStart: (id: number) => void;
  onRequeue: (id: number) => void;
  onReopen: (id: number) => void;
  onDeleteRun: (id: number) => void;
  onRetry: (id: number) => void;
}

/**
 * Gestión de piezas (ProductionRun) de un pedido: asignar impresora, minutos
 * estimados, agregar/cancelar piezas. Reemplaza la vieja sub-lista inline
 * manteniendo el tablero limpio (el detalle vive en este modal).
 */
export function PiecesModal({
  order,
  runs,
  printers,
  onClose,
  onUpdate,
  onCreate,
  onCancel,
  onStart,
  onRequeue,
  onReopen,
  onDeleteRun,
  onRetry,
}: PiecesModalProps) {
  const [busy, setBusy] = useState(false);
  const activePrinters = printers.filter((p) => !p.archived);

  const setPrinter = async (run: ProductionRun, printerId: number | null) => {
    setBusy(true);
    try {
      await onUpdate(
        run.id,
        printerId == null ? { clear_printer: true } : { printer_id: printerId },
      );
    } finally {
      setBusy(false);
    }
  };

  const setEstimated = async (run: ProductionRun, value: string) => {
    const n = value.trim() === "" ? null : Number(value);
    if (n != null && (!Number.isFinite(n) || n < 1)) return;
    setBusy(true);
    try {
      await onUpdate(
        run.id,
        n == null ? { clear_estimated: true } : { estimated_minutes: Math.round(n) },
      );
    } finally {
      setBusy(false);
    }
  };

  const addPiece = async () => {
    setBusy(true);
    try {
      const n = runs.length + 1;
      await onCreate(order.id, {
        piece_name: `${order.catalog_item?.name ?? "Pieza"} #${n}`,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-panel modal-panel--md pb-pieces"
        role="dialog"
        aria-modal="true"
        aria-label={`Piezas del pedido #${order.id}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="pb-pieces__head">
          <h3>
            Piezas · #{order.id} {order.catalog_item?.name ?? ""}
          </h3>
          <button type="button" className="tbtn" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>

        {runs.length === 0 ? (
          <p className="pb-col__empty">Sin piezas todavía.</p>
        ) : (
          <ol className="pb-pieces__list">
            {runs.map((run, i) => {
              const pending = run.status === "PENDENTE";
              return (
                <li key={run.id} className="pb-pieces__row" data-status={run.status}>
                  <div className="pb-pieces__row-top">
                    <span className="pb-pieces__idx">Pieza {i + 1}</span>
                    <span className="pb-pieces__status" data-status={run.status}>
                      {STATUS_LABEL[run.status]}
                    </span>
                  </div>
                  <div className="pb-pieces__row-fields">
                    <label className="pb-pieces__field">
                      <span>Impresora</span>
                      <select
                        value={run.printer?.id ?? ""}
                        disabled={busy || !pending}
                        onChange={(e) =>
                          void setPrinter(
                            run,
                            e.target.value ? Number(e.target.value) : null,
                          )
                        }
                      >
                        <option value="">Sin asignar</option>
                        {activePrinters.map((p) => (
                          <option key={p.id} value={String(p.id)}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="pb-pieces__field pb-pieces__field--sm">
                      <span>Min. est.</span>
                      <input
                        type="number"
                        min={1}
                        defaultValue={run.estimated_minutes ?? ""}
                        disabled={busy || !pending}
                        onBlur={(e) => void setEstimated(run, e.target.value)}
                      />
                    </label>
                    <div className="pb-pieces__row-actions">
                      {pending && (
                        <button
                          type="button"
                          className="tbtn tbtn--go"
                          disabled={busy || run.printer?.id == null}
                          title={
                            run.printer?.id == null
                              ? "Asigná una impresora primero"
                              : "Iniciar pieza"
                          }
                          onClick={() => onStart(run.id)}
                        >
                          ▶ Iniciar
                        </button>
                      )}
                      {(run.status === "EM_PRODUCAO" ||
                        run.status === "PAUSADA") && (
                        <button
                          type="button"
                          className="tbtn"
                          disabled={busy}
                          title="Devolver a la cola (descarta el progreso)"
                          onClick={() => onRequeue(run.id)}
                        >
                          ↩ Volver a la cola
                        </button>
                      )}
                      {(run.status === "PENDENTE" ||
                        run.status === "EM_PRODUCAO" ||
                        run.status === "PAUSADA") && (
                        <button
                          type="button"
                          className="tbtn tbtn--danger"
                          disabled={busy}
                          onClick={() => onCancel(run.id)}
                        >
                          Cancelar
                        </button>
                      )}
                      {(run.status === "CONCLUIDA" ||
                        run.status === "CANCELADA") && (
                        <button
                          type="button"
                          className="tbtn"
                          disabled={busy}
                          title="Reabrir la pieza (vuelve al estado previo)"
                          onClick={() => onReopen(run.id)}
                        >
                          ↺ Reabrir
                        </button>
                      )}
                      {(run.status === "CONCLUIDA" ||
                        run.status === "CANCELADA") && (
                        <button
                          type="button"
                          className="tbtn"
                          disabled={busy}
                          title="Reintentar: crea una pieza nueva en la cola (deja esta como histórico)"
                          onClick={() => onRetry(run.id)}
                        >
                          ⟳ Reintentar
                        </button>
                      )}
                      {(run.status === "CONCLUIDA" ||
                        run.status === "CANCELADA") && (
                        <button
                          type="button"
                          className="tbtn tbtn--del"
                          disabled={busy}
                          title="Borrar la pieza definitivamente (no devuelve material)"
                          onClick={() => onDeleteRun(run.id)}
                        >
                          🗑 Borrar
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <button
          type="button"
          className="tbtn pb-pieces__add"
          disabled={busy}
          onClick={() => void addPiece()}
        >
          ＋ Agregar pieza
        </button>
      </div>
    </div>
  );
}
