import type { Printer } from "../../../types";

interface EmptyPrinterStateProps {
  printer: Printer;
  /** Run PENDENTE más próxima asignada a esta impresora (si la hay). */
  hasNext: boolean;
  onStartNext: () => void;
}

export function EmptyPrinterState({
  printer,
  hasNext,
  onStartNext,
}: EmptyPrinterStateProps) {
  return (
    <article className="pb-hero pb-hero--idle">
      <header className="pb-hero__printer">
        <span className="pb-hero__printer-name">🖨 {printer.name}</span>
        <span className="pb-hero__idle-tag">Libre</span>
      </header>
      <div className="pb-hero__empty">
        <p className="pb-hero__empty-title">Impresora libre</p>
        <p className="pb-hero__empty-sub">
          {hasNext
            ? "Iniciá el próximo de la cola."
            : "Asigná un trabajo a esta impresora desde la cola."}
        </p>
        <button
          type="button"
          className="btn-primary"
          disabled={!hasNext}
          onClick={onStartNext}
        >
          ▶ Iniciar próximo
        </button>
      </div>
    </article>
  );
}
