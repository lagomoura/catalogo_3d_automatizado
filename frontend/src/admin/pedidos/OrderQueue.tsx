import { useMemo, useState } from "react";
import {
  resolveStorageUrl,
  type OrderCostItemInput,
  type OrderUpdatePayload,
} from "../../api/client";
import { formatARS } from "../../utils/format";
import { computeProfitability } from "../calculadora/calc";
import type {
  CatalogItem,
  Contact,
  Order,
  OrderPriority,
  OrderStatus,
} from "../../types";
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
}

const PRIORITIES: (OrderPriority | null)[] = [null, 1, 2, 3];

const STATUS_LABEL: Record<OrderStatus, string> = {
  CREADO: "En cola",
  EJECUTANDO: "En producción",
  EJECUTADO: "Listo",
  ENTREGADO: "Entregado",
};

function buyer(o: Order): string {
  return o.contact?.name ?? o.person_label ?? "—";
}

function advanceLabel(status: OrderStatus): string | null {
  if (status === "EJECUTANDO") return "Marcar listo →";
  if (status === "EJECUTADO") return "Entregar →";
  return null;
}

function OrderCard({
  order,
  isFront,
  onStart,
  onAdvance,
  onPayment,
  onPriority,
  onEdit,
  onExtraCost,
  onDelete,
}: {
  order: Order;
  isFront: boolean;
  onEdit: (order: Order) => void;
  onExtraCost: (order: Order) => void;
} & Pick<
  Props,
  "onStart" | "onAdvance" | "onPayment" | "onPriority" | "onDelete"
>) {
  const paid = order.payment_status === "PAGADO";
  const running = order.order_status === "EJECUTANDO";
  const creado = order.order_status === "CREADO";
  const adv = advanceLabel(order.order_status);
  const prof =
    order.cost_items.length > 0 && order.value != null
      ? computeProfitability(
          order.cost_items.map((c) => ({
            amount: c.amount,
            per_unit: c.per_unit,
          })),
          order.quantity,
          order.value,
        )
      : null;

  return (
    <article
      className="ticket"
      data-status={order.order_status}
      data-front={creado && isFront ? "true" : undefined}
      data-paid={paid ? "true" : "false"}
    >
      <span className="ticket__spine" aria-hidden="true" />

      <div className="ticket__photo">
        {order.catalog_cover_url ? (
          <img
            src={resolveStorageUrl(order.catalog_cover_url)}
            alt={order.catalog_item?.name ?? "Producto"}
            loading="lazy"
          />
        ) : (
          <div className="ticket__photo-ph">s/imagen</div>
        )}
        {running && (
          <span className="ticket__live">
            <i aria-hidden="true" />
            EN VIVO
          </span>
        )}
        {creado && isFront && <span className="ticket__next">PRÓXIMO</span>}
      </div>

      <div className="ticket__main">
        <header className="ticket__head">
          <div className="ticket__titlewrap">
            <h4 className="ticket__product">
              {order.catalog_item?.name ?? "(producto eliminado)"}
            </h4>
            <span className="ticket__sub">
              <span className="ticket__id">#{order.id}</span>
              <span className="chip chip--status">
                <i className="chip__dot" aria-hidden="true" />
                {STATUS_LABEL[order.order_status]}
              </span>
              <span className="chip chip--pay">
                {paid ? "✓ Pagado" : "⏳ Sin pagar"}
              </span>
            </span>
          </div>
          {order.priority != null && (
            <span
              className="ticket__prio"
              data-prio={order.priority}
              title={`Prioridad ${order.priority}`}
            >
              P{order.priority}
            </span>
          )}
        </header>

        <div className="ticket__meta">
          <span className="ticket__buyer">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-5 0-9 2.5-9 6v2h18v-2c0-3.5-4-6-9-6Z" />
            </svg>
            {buyer(order)}
          </span>
          <span className="ticket__qty">×{order.quantity}</span>
          {order.value != null && (
            <span className="ticket__value">{formatARS(order.value)}</span>
          )}
          {prof && (
            <span
              className="ticket__profit"
              data-tone={prof.profit >= 0 ? "ok" : "bad"}
              title={`Costo total ${formatARS(prof.totalCost)} · Ganancia ${formatARS(prof.profit)}`}
            >
              {prof.profit >= 0 ? "▲" : "▼"} {formatARS(prof.profit)}
              {prof.marginPct != null && ` (${prof.marginPct}%)`}
            </span>
          )}
          {order.note && <span className="ticket__note">“{order.note}”</span>}
        </div>

        {creado && (
          <div
            className="priority-seg priority-seg--ticket"
            role="group"
            aria-label="Prioridad"
          >
            <span className="priority-seg__label">Prioridad</span>
            {PRIORITIES.map((p) => (
              <button
                type="button"
                key={p ?? "none"}
                className={`priority-seg__btn ${
                  order.priority === p ? "is-active" : ""
                }`}
                data-prio={p ?? "none"}
                onClick={() => onPriority(order.id, p)}
              >
                {p === null ? "—" : `#${p}`}
              </button>
            ))}
          </div>
        )}

        <div className="ticket__actions">
          {creado && (
            <button
              type="button"
              className="tbtn tbtn--go"
              disabled={!isFront}
              onClick={() => onStart(order.id)}
              title={isFront ? "" : "Esperando turno en la cola"}
            >
              {isFront ? "▶ Iniciar" : "Esperando"}
            </button>
          )}
          {adv && (
            <button
              type="button"
              className="tbtn tbtn--advance"
              onClick={() => onAdvance(order.id)}
            >
              {adv}
            </button>
          )}
          <button
            type="button"
            className="tbtn tbtn--pay"
            disabled={!paid && order.value == null}
            onClick={() => onPayment(order.id, !paid)}
            title={
              paid
                ? "Revertir el cobro (elimina el ingreso de caja)"
                : order.value == null
                  ? "Cargá el valor del pedido para poder cobrarlo"
                  : "Cobrar y registrar el ingreso en caja"
            }
          >
            {paid ? "↺ Pago" : "$ Cobrar"}
          </button>
          <button
            type="button"
            className="tbtn tbtn--edit"
            onClick={() => onEdit(order)}
            title="Editar pedido"
          >
            ✎ Editar
          </button>
          <button
            type="button"
            className="tbtn tbtn--edit"
            onClick={() => onExtraCost(order)}
            title="Agregar costo extra / reimpresión"
          >
            ＋ Costo extra
          </button>
          <button
            type="button"
            className="tbtn tbtn--del"
            disabled={running}
            title={running ? "No se puede borrar en ejecución" : "Borrar"}
            onClick={() => {
              if (window.confirm("¿Borrar este pedido?")) onDelete(order.id);
            }}
          >
            ✕
          </button>
        </div>
      </div>
    </article>
  );
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
  const unpaid = orders.filter((o) => o.payment_status === "PENDIENTE").length;
  const delivered = orders.filter(
    (o) => o.order_status === "ENTREGADO",
  ).length;
  const frontId = queue[0]?.id ?? null;
  const activeName = running[0]?.catalog_item?.name ?? null;

  return (
    <div className="board">
      <div className="board__bar">
        <div className="stats">
          <div className="stat" data-tone="run">
            <span className="stat__num">{running.length}</span>
            <span className="stat__lbl">
              En producción
              {activeName && (
                <em className="stat__hint" title={activeName}>
                  {activeName}
                </em>
              )}
            </span>
          </div>
          <div className="stat" data-tone="queue">
            <span className="stat__num">{queue.length}</span>
            <span className="stat__lbl">En cola</span>
          </div>
          <div className="stat" data-tone="warn">
            <span className="stat__num">{unpaid}</span>
            <span className="stat__lbl">Sin pagar</span>
          </div>
          <div className="stat" data-tone="done">
            <span className="stat__num">{delivered}</span>
            <span className="stat__lbl">Entregados</span>
          </div>
        </div>

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
          {running.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              isFront={false}
              onEdit={setEditing}
              onExtraCost={setExtraFor}
              {...handlers}
            />
          ))}
        </section>
      )}

      {queue.length > 0 && (
        <section className="rail" data-rail="queue">
          <header className="rail__head">
            Cola <span className="rail__count">{queue.length}</span>
          </header>
          <div className="board__grid">
            {queue.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                isFront={o.id === frontId}
                onEdit={setEditing}
                onExtraCost={setExtraFor}
                {...handlers}
              />
            ))}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section className="rail" data-rail="done">
          <header className="rail__head">
            Listos / Entregados <span className="rail__count">{done.length}</span>
          </header>
          <div className="board__grid">
            {done.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                isFront={false}
                onEdit={setEditing}
                onExtraCost={setExtraFor}
                {...handlers}
              />
            ))}
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
