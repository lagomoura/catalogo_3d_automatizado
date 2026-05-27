import { useMemo, useState } from "react";
import type {
  OrderCostItemInput,
  OrderUpdatePayload,
} from "../../api/client";
import type {
  CatalogItem,
  Contact,
  Order,
  OrderPriority,
  ProductionRun,
} from "../../types";
import { OrderCard } from "./OrderCard";
import { OrderEditModal } from "./OrderEditModal";
import { ExtraCostModal } from "./ExtraCostModal";

interface Props {
  orders: Order[];
  catalog: CatalogItem[];
  contacts: Contact[];
  filterProductId: number | null;
  onFilterChange: (id: number | null) => void;
  onStart: (id: number) => void;
  onAdvance: (id: number) => void;
  onPayment: (id: number, paid: boolean) => void;
  onPriority: (id: number, priority: OrderPriority | null) => void;
  onUpdate: (id: number, payload: OrderUpdatePayload) => Promise<void>;
  onSaveCosts: (id: number, items: OrderCostItemInput[]) => Promise<void>;
  onAppendCost: (
    id: number,
    item: { concept: string; amount: number; per_unit?: boolean },
  ) => Promise<void>;
  onDelete: (id: number) => void;
  /** Conteo de ProductionRun vinculadas por id de pedido. */
  runsCountByOrder?: Map<number, number>;
  /** Runs vinculados por id de pedido (lista detallada para la sub-lista). */
  runsByOrder?: Map<number, ProductionRun[]>;
  /** Ids de pedidos actualmente expandidos (muestran sus runs inline). */
  expandedOrderIds?: Set<number>;
  /** Toggle visual de expansión de un pedido. */
  onToggleExpand?: (orderId: number) => void;
  /** Timestamp del ticker para calcular tiempo restante en vivo. */
  now: number;
  onRunStart: (id: number) => void;
  onRunPause: (id: number) => void;
  onRunResume: (id: number) => void;
  onRunFinish: (id: number) => void;
  onRunCancel: (id: number) => void;
  onRunReopen: (id: number) => void;
  onRunDelete: (id: number) => void;
  onRunEdit: (run: ProductionRun) => void;
  onRunCreate: (orderId: number) => void;
}

export function OrderQueue({
  orders,
  catalog,
  contacts,
  filterProductId,
  onFilterChange,
  onUpdate,
  onSaveCosts,
  onAppendCost,
  runsCountByOrder,
  runsByOrder,
  expandedOrderIds,
  onToggleExpand,
  now,
  onRunStart,
  onRunPause,
  onRunResume,
  onRunFinish,
  onRunCancel,
  onRunReopen,
  onRunDelete,
  onRunEdit,
  onRunCreate,
  ...handlers
}: Props) {
  const [editing, setEditing] = useState<Order | null>(null);
  const [extraFor, setExtraFor] = useState<Order | null>(null);
  const [extraBusy, setExtraBusy] = useState(false);

  const sortedCatalog = useMemo(
    () => [...catalog].sort((a, b) => a.name.localeCompare(b.name)),
    [catalog],
  );

  // Reflejar la versión más reciente del pedido que se está editando.
  const editingOrder = editing
    ? orders.find((o) => o.id === editing.id) ?? editing
    : null;
  const extraOrder = extraFor
    ? orders.find((o) => o.id === extraFor.id) ?? extraFor
    : null;

  const running = orders.filter((o) => o.order_status === "EJECUTANDO");
  const queue = orders.filter((o) => o.order_status === "CREADO");
  const done = orders.filter(
    (o) => o.order_status === "EJECUTADO" || o.order_status === "ENTREGADO",
  );
  const frontId = queue[0]?.id ?? null;

  const renderCard = (o: Order, isFront: boolean) => (
    <OrderCard
      key={o.id}
      order={o}
      isFront={isFront}
      onEdit={setEditing}
      onExtraCost={setExtraFor}
      runsCount={runsCountByOrder?.get(o.id)}
      runs={runsByOrder?.get(o.id)}
      expanded={expandedOrderIds?.has(o.id) ?? false}
      onToggleExpand={onToggleExpand}
      now={now}
      onRunStart={onRunStart}
      onRunPause={onRunPause}
      onRunResume={onRunResume}
      onRunFinish={onRunFinish}
      onRunCancel={onRunCancel}
      onRunReopen={onRunReopen}
      onRunDelete={onRunDelete}
      onRunEdit={onRunEdit}
      onRunCreate={onRunCreate}
      {...handlers}
    />
  );

  return (
    <div className="board">
      <div className="board__bar">
        <select
          aria-label="Filtrar por producto"
          className="board__filter"
          value={filterProductId == null ? "" : String(filterProductId)}
          onChange={(e) =>
            onFilterChange(e.target.value ? Number(e.target.value) : null)
          }
        >
          <option value="">Todos los productos</option>
          {sortedCatalog.map((it) => (
            <option key={it.id} value={String(it.id)}>
              {it.name}
            </option>
          ))}
        </select>
      </div>

      {orders.length === 0 && (
        <p className="board__empty">
          No hay pedidos{filterProductId != null ? " para este producto" : ""}.
          Creá uno arriba.
        </p>
      )}

      {running.length > 0 && (
        <section className="rail" data-rail="run">
          {running.map((o) => renderCard(o, false))}
        </section>
      )}

      {queue.length > 0 && (
        <section className="rail" data-rail="queue">
          <header className="rail__head">
            Cola <span className="rail__count">{queue.length}</span>
          </header>
          <div className="board__grid">
            {queue.map((o) => renderCard(o, o.id === frontId))}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section className="rail" data-rail="done">
          <header className="rail__head">
            Listos / Entregados <span className="rail__count">{done.length}</span>
          </header>
          <div className="board__grid">
            {done.map((o) => renderCard(o, false))}
          </div>
        </section>
      )}

      {editingOrder && (
        <OrderEditModal
          order={editingOrder}
          contacts={contacts}
          onClose={() => setEditing(null)}
          onSave={onUpdate}
          onSaveCosts={onSaveCosts}
        />
      )}

      {extraOrder && (
        <ExtraCostModal
          order={extraOrder}
          busy={extraBusy}
          onClose={() => setExtraFor(null)}
          onSubmit={async ({ concept, amount }) => {
            setExtraBusy(true);
            try {
              await onAppendCost(extraOrder.id, {
                concept,
                amount,
                per_unit: false,
              });
              setExtraFor(null);
            } finally {
              setExtraBusy(false);
            }
          }}
        />
      )}
    </div>
  );
}
