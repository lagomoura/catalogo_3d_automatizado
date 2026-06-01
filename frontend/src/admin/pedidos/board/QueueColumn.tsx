import { useMemo } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Order, ProductionRun } from "../../../types";
import { computeRemainingSeconds } from "../useProductionTicker";
import { QueueCard } from "./QueueCard";

interface QueueColumnProps {
  /** Pedidos CREADO en orden de cola. */
  queueOrders: Order[];
  /** Runs por pedido (para conteo de piezas, impresora y ETA). */
  runsByOrder: Map<number, ProductionRun[]>;
  /** Todas las runs (para el tiempo restante del run en vivo de cada impresora). */
  allRuns: ProductionRun[];
  /** ¿Se puede iniciar cada pedido ahora? (hay impresora libre / asignada libre). */
  canStartByOrder: Map<number, boolean>;
  now: number;
  onReorder: (orderedOrderIds: number[]) => void;
  onStart: (orderId: number) => void;
  onGestionarPiezas: (order: Order) => void;
  onEditar: (order: Order) => void;
  onCostoExtra: (order: Order) => void;
  onDelete: (orderId: number) => void;
}

export function QueueColumn({
  queueOrders,
  runsByOrder,
  allRuns,
  canStartByOrder,
  now,
  onReorder,
  onStart,
  onGestionarPiezas,
  onEditar,
  onCostoExtra,
  onDelete,
}: QueueColumnProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // ETA de inicio por pedido: acumulamos por impresora el tiempo restante del
  // run en vivo + la producción de los pedidos que van antes en la cola.
  const etaByOrder = useMemo(() => {
    const accSec = new Map<number, number>();
    for (const r of allRuns) {
      if (
        (r.status === "EM_PRODUCAO" || r.status === "PAUSADA") &&
        r.printer?.id != null
      ) {
        const rem = Math.max(0, computeRemainingSeconds(r, now) ?? 0);
        accSec.set(r.printer.id, (accSec.get(r.printer.id) ?? 0) + rem);
      }
    }
    const out = new Map<number, Date | null>();
    for (const o of queueOrders) {
      const rs = (runsByOrder.get(o.id) ?? []).filter((r) => r.status === "PENDENTE");
      const pid = rs.find((r) => r.printer?.id != null)?.printer?.id ?? null;
      if (pid == null) {
        out.set(o.id, null);
        continue;
      }
      const base = accSec.get(pid) ?? 0;
      out.set(o.id, new Date(now + base * 1000));
      const add = rs
        .filter((r) => r.printer?.id === pid)
        .reduce((s, r) => s + (r.estimated_minutes ?? 0) * 60, 0);
      accSec.set(pid, base + add);
    }
    return out;
  }, [queueOrders, runsByOrder, allRuns, now]);

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = queueOrders.map((o) => o.id);
    const from = ids.indexOf(Number(active.id));
    const to = ids.indexOf(Number(over.id));
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(ids, from, to));
  };

  return (
    <section className="pb-col" aria-label="En cola">
      <header className="pb-col__head">
        <span className="pb-col__icon" aria-hidden="true">❏</span>
        En cola <span className="pb-col__count">{queueOrders.length}</span>
      </header>
      {queueOrders.length === 0 ? (
        <p className="pb-col__empty">No hay pedidos en cola.</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={queueOrders.map((o) => o.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="pb-col__list">
              {queueOrders.map((order, i) => {
                const rs = runsByOrder.get(order.id) ?? [];
                const noPrinter = rs
                  .filter((r) => r.status === "PENDENTE")
                  .every((r) => r.printer?.id == null);
                return (
                  <QueueCard
                    key={order.id}
                    order={order}
                    pieceTotal={rs.length || order.quantity}
                    canStart={canStartByOrder.get(order.id) ?? false}
                    noPrinter={noPrinter}
                    hasPending={rs.some((r) => r.status === "PENDENTE")}
                    isNext={i === 0}
                    etaStart={etaByOrder.get(order.id) ?? null}
                    onStart={onStart}
                    onGestionarPiezas={onGestionarPiezas}
                    onEditar={onEditar}
                    onCostoExtra={onCostoExtra}
                    onDelete={onDelete}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}
