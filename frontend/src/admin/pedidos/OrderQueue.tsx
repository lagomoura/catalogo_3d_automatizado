import { useMemo } from "react";
import { resolveStorageUrl } from "../../api/client";
import type { CatalogItem, Order, OrderPriority } from "../../types";

interface Props {
  orders: Order[];
  catalog: CatalogItem[];
  filterProductId: number | null;
  onFilterChange: (id: number | null) => void;
  onStart: (id: number) => void;
  onAdvance: (id: number) => void;
  onPayment: (id: number, paid: boolean) => void;
  onPriority: (id: number, priority: OrderPriority | null) => void;
  onDelete: (id: number) => void;
}

const PRIORITIES: (OrderPriority | null)[] = [null, 1, 2, 3];

function buyer(o: Order): string {
  return o.contact?.name ?? o.person_label ?? "—";
}

function advanceLabel(status: Order["order_status"]): string | null {
  if (status === "EJECUTANDO") return "Marcar ejecutado";
  if (status === "EJECUTADO") return "Marcar entregado";
  return null;
}

function OrderCard({
  order,
  isFront,
  onStart,
  onAdvance,
  onPayment,
  onPriority,
  onDelete,
}: {
  order: Order;
  isFront: boolean;
} & Pick<
  Props,
  "onStart" | "onAdvance" | "onPayment" | "onPriority" | "onDelete"
>) {
  const paid = order.payment_status === "PAGADO";
  const running = order.order_status === "EJECUTANDO";
  const adv = advanceLabel(order.order_status);

  return (
    <div
      className={`card order-card ${running ? "is-running" : ""} ${
        isFront ? "is-front" : ""
      }`}
    >
      <div className="order-card__media">
        {order.catalog_cover_url ? (
          <img
            src={resolveStorageUrl(order.catalog_cover_url)}
            alt={order.catalog_item?.name ?? "Producto"}
            loading="lazy"
          />
        ) : (
          <div className="order-card__ph">Sin imagen</div>
        )}
      </div>
      <div className="order-card__body">
        <div className="order-card__top">
          <strong>{order.catalog_item?.name ?? "(producto eliminado)"}</strong>
          <div className="order-card__badges">
            <span className={`badge badge--${order.order_status.toLowerCase()}`}>
              {order.order_status}
            </span>
            <span
              className={`badge ${paid ? "badge--pagado" : "badge--pendiente"}`}
            >
              {order.payment_status}
            </span>
            {order.priority != null && (
              <span className="badge badge--prio">#{order.priority}</span>
            )}
          </div>
        </div>

        <div className="order-card__meta">
          <span>👤 {buyer(order)}</span>
          <span>✕{order.quantity}</span>
        </div>
        {order.note && <p className="order-card__note">{order.note}</p>}

        {order.order_status === "CREADO" && (
          <div className="priority-seg" role="group" aria-label="Prioridad">
            {PRIORITIES.map((p) => (
              <button
                type="button"
                key={p ?? "none"}
                className={`priority-seg__btn ${
                  order.priority === p ? "is-active" : ""
                }`}
                onClick={() => onPriority(order.id, p)}
              >
                {p === null ? "—" : `#${p}`}
              </button>
            ))}
          </div>
        )}

        <div className="order-card__actions">
          {order.order_status === "CREADO" && (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              disabled={!isFront}
              onClick={() => onStart(order.id)}
              title={isFront ? "" : "Esperando turno en la cola"}
            >
              {isFront ? "Iniciar" : "Esperando turno"}
            </button>
          )}
          {adv && (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => onAdvance(order.id)}
            >
              {adv}
            </button>
          )}
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => onPayment(order.id, !paid)}
          >
            {paid ? "Marcar PENDIENTE" : "Marcar PAGADO"}
          </button>
          <button
            type="button"
            className="btn btn--danger btn--sm"
            disabled={running}
            title={running ? "No se puede borrar en ejecución" : ""}
            onClick={() => {
              if (window.confirm("¿Borrar este pedido?")) onDelete(order.id);
            }}
          >
            Borrar
          </button>
        </div>
      </div>
    </div>
  );
}

export function OrderQueue({
  orders,
  catalog,
  filterProductId,
  onFilterChange,
  ...handlers
}: Props) {
  const sortedCatalog = useMemo(
    () => [...catalog].sort((a, b) => a.name.localeCompare(b.name)),
    [catalog],
  );

  const running = orders.filter((o) => o.order_status === "EJECUTANDO");
  const queue = orders.filter((o) => o.order_status === "CREADO");
  const done = orders.filter(
    (o) => o.order_status === "EJECUTADO" || o.order_status === "ENTREGADO",
  );
  const frontId = queue[0]?.id ?? null;

  return (
    <div className="pedidos-list">
      <div className="pedidos-filter">
        <label htmlFor="pedidos-prod-filter">Filtrar por producto</label>
        <select
          id="pedidos-prod-filter"
          value={filterProductId == null ? "" : String(filterProductId)}
          onChange={(e) =>
            onFilterChange(e.target.value ? Number(e.target.value) : null)
          }
        >
          <option value="">— Todos —</option>
          {sortedCatalog.map((it) => (
            <option key={it.id} value={String(it.id)}>
              {it.name}
            </option>
          ))}
        </select>
        {filterProductId != null && (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => onFilterChange(null)}
          >
            Limpiar
          </button>
        )}
      </div>

      <section className="pedidos-section">
        <h3>En ejecución</h3>
        {running.length === 0 ? (
          <p className="hint">Ningún pedido en ejecución.</p>
        ) : (
          running.map((o) => (
            <OrderCard key={o.id} order={o} isFront={false} {...handlers} />
          ))
        )}
      </section>

      <section className="pedidos-section">
        <h3>Cola ({queue.length})</h3>
        {queue.length === 0 ? (
          <p className="hint">La cola está vacía.</p>
        ) : (
          queue.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              isFront={o.id === frontId}
              {...handlers}
            />
          ))
        )}
      </section>

      <section className="pedidos-section">
        <h3>Listos / Entregados ({done.length})</h3>
        {done.length === 0 ? (
          <p className="hint">Todavía no hay pedidos finalizados.</p>
        ) : (
          done.map((o) => (
            <OrderCard key={o.id} order={o} isFront={false} {...handlers} />
          ))
        )}
      </section>
    </div>
  );
}
