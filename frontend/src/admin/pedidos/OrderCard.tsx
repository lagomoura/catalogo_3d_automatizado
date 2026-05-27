import { resolveStorageUrl } from "../../api/client";
import { formatARS } from "../../utils/format";
import { computeProfitability } from "../calculadora/calc";
import type {
  Order,
  OrderPriority,
  OrderStatus,
  ProductionRun,
} from "../../types";
import { RunSubList } from "./RunSubList";

export interface OrderCardHandlers {
  onStart: (id: number) => void;
  onAdvance: (id: number) => void;
  onPayment: (id: number, paid: boolean) => void;
  onPriority: (id: number, priority: OrderPriority | null) => void;
  onDelete: (id: number) => void;
}

interface OrderCardProps extends OrderCardHandlers {
  order: Order;
  isFront: boolean;
  onEdit: (order: Order) => void;
  onExtraCost: (order: Order) => void;
  runsCount?: number;
  /** Lista de runs vinculados a este pedido (para mostrar al expandir). */
  runs?: ProductionRun[];
  /** Si está expandido, se renderiza la sub-lista de runs. */
  expanded?: boolean;
  onToggleExpand?: (orderId: number) => void;
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

const PRIORITIES: (OrderPriority | null)[] = [null, 1, 2, 3];

const STATUS_LABEL: Record<OrderStatus, string> = {
  CREADO: "En cola",
  EJECUTANDO: "En curso",
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

export function OrderCard({
  order,
  isFront,
  onStart,
  onAdvance,
  onPayment,
  onPriority,
  onEdit,
  onExtraCost,
  onDelete,
  runsCount,
  runs,
  expanded = false,
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
}: OrderCardProps) {
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
              {runsCount != null && runsCount > 0 ? (
                onToggleExpand ? (
                  <button
                    type="button"
                    className="chip chip--prod"
                    onClick={() => onToggleExpand(order.id)}
                    aria-expanded={expanded}
                    title={
                      expanded
                        ? "Ocultar producciones"
                        : "Ver producciones de este pedido"
                    }
                  >
                    {expanded ? "▼" : "▶"} 🖨 {runsCount}{" "}
                    {runsCount === 1 ? "pieza" : "piezas"}
                  </button>
                ) : (
                  <span className="chip chip--prod">
                    🖨 {runsCount} {runsCount === 1 ? "pieza" : "piezas"}
                  </span>
                )
              ) : null}
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

        {expanded && (
          <RunSubList
            runs={runs ?? []}
            now={now}
            onRunStart={onRunStart}
            onRunPause={onRunPause}
            onRunResume={onRunResume}
            onRunFinish={onRunFinish}
            onRunCancel={onRunCancel}
            onRunReopen={onRunReopen}
            onRunEdit={onRunEdit}
            onRunDelete={onRunDelete}
            onRunCreate={() => onRunCreate(order.id)}
          />
        )}
      </div>
    </article>
  );
}
