import type { Printer } from "../../../types";

interface StartPrinterModalProps {
  /** Impresoras libres entre las que elegir (hay 2+, por eso preguntamos). */
  printers: Printer[];
  pieceName: string;
  onPick: (printerId: number) => void;
  onClose: () => void;
}

/**
 * Selector de impresora al iniciar la cola. Solo se muestra cuando hay 2+
 * impresoras libres: con una sola, la pieza se asigna automáticamente sin
 * preguntar. Mantiene el flujo "Iniciar" obvio (una decisión clara por click).
 */
export function StartPrinterModal({
  printers,
  pieceName,
  onPick,
  onClose,
}: StartPrinterModalProps) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-panel modal-panel--sm"
        role="dialog"
        aria-modal="true"
        aria-label="Elegir impresora"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="pb-pieces__head">
          <h3>¿En qué impresora?</h3>
          <button type="button" className="tbtn" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>
        <p className="pb-col__empty" style={{ textAlign: "left", margin: "0 0 0.75rem" }}>
          Iniciar <strong>{pieceName}</strong> en:
        </p>
        <div className="pb-printer-pick">
          {printers.map((p) => (
            <button
              key={p.id}
              type="button"
              className="btn-primary pb-printer-pick__btn"
              onClick={() => onPick(p.id)}
            >
              🖨 {p.name}
              {p.environment ? (
                <span className="pb-printer-pick__env"> · {p.environment}</span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
