import { useMemo } from "react";
import type { Order, Printer, ProductionRun } from "../../../types";
import { EmptyPrinterState } from "./EmptyPrinterState";
import { PrinterHeroCard, type HeroOrderActions } from "./PrinterHeroCard";

interface PrinterHeroGridProps {
  printers: Printer[];
  runs: ProductionRun[];
  ordersById: Map<number, Order>;
  runsByOrder: Map<number, ProductionRun[]>;
  now: number;
  /** ¿Hay alguna pieza pendiente en el sistema? Habilita "Iniciar próximo". */
  hasQueue: boolean;
  onPause: (runId: number) => void;
  onResume: (runId: number) => void;
  onFinish: (runId: number) => void;
  /** Inicia el próximo run PENDENTE en la impresora dada (auto-assign). */
  onStartNext: (printerId: number) => void;
  orderActions: HeroOrderActions;
}

const LIVE = new Set<ProductionRun["status"]>(["EM_PRODUCAO", "PAUSADA"]);

export function PrinterHeroGrid({
  printers,
  runs,
  ordersById,
  runsByOrder,
  now,
  hasQueue,
  onPause,
  onResume,
  onFinish,
  onStartNext,
  orderActions,
}: PrinterHeroGridProps) {
  const activeByPrinter = useMemo(() => {
    const m = new Map<number, ProductionRun>();
    for (const r of runs) {
      if (LIVE.has(r.status) && r.printer?.id != null && !m.has(r.printer.id)) {
        m.set(r.printer.id, r);
      }
    }
    return m;
  }, [runs]);

  if (printers.length === 0) {
    return (
      <section className="pb-heroes pb-heroes--none">
        <p className="pb-heroes__empty">
          Registrá una impresora en <strong>Impresoras</strong> para empezar a producir.
        </p>
      </section>
    );
  }

  return (
    <section className="pb-heroes" aria-label="Impresoras">
      {printers.map((printer) => {
        const run = activeByPrinter.get(printer.id);
        if (!run) {
          return (
            <EmptyPrinterState
              key={printer.id}
              printer={printer}
              hasNext={hasQueue}
              onStartNext={() => onStartNext(printer.id)}
            />
          );
        }
        const orderId = run.order?.id ?? null;
        const order = orderId != null ? ordersById.get(orderId) ?? null : null;
        const siblings = orderId != null ? runsByOrder.get(orderId) ?? [] : [];
        const idx = siblings.findIndex((r) => r.id === run.id);
        return (
          <PrinterHeroCard
            key={printer.id}
            printer={printer}
            run={run}
            order={order}
            pieceIndex={idx >= 0 ? idx + 1 : 1}
            pieceTotal={siblings.length || 1}
            now={now}
            onPause={onPause}
            onResume={onResume}
            onFinish={onFinish}
            orderActions={orderActions}
          />
        );
      })}
    </section>
  );
}
