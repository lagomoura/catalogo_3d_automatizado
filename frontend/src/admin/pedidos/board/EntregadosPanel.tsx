import type { Order, OrderStatus } from "../../../types";
import { formatARS, formatDate } from "../../../utils/format";
import { MarginPill } from "./MarginPill";
import { PaymentPill } from "./PaymentPill";

interface EntregadosPanelProps {
  orders: Order[];
  onPayment: (id: number, paid: boolean) => void;
  onEditar: (order: Order) => void;
  onDelete: (id: number) => void;
  onChangeStatus: (id: number, target: OrderStatus) => void;
}

function buyer(o: Order): string {
  return o.contact?.name ?? o.person_label ?? "—";
}

export function EntregadosPanel({
  orders,
  onPayment,
  onEditar,
  onDelete,
  onChangeStatus,
}: EntregadosPanelProps) {
  if (orders.length === 0) {
    return <p className="pb-col__empty">No hay pedidos entregados con este filtro.</p>;
  }
  return (
    <div className="pb-entregados">
      {orders.map((o) => {
        const paid = o.payment_status === "PAGADO";
        return (
          <article key={o.id} className="pb-erow" data-paid={paid ? "true" : "false"}>
            <span className="pb-erow__id">#{o.id}</span>
            <button
              type="button"
              className="pb-erow__product"
              onClick={() => onEditar(o)}
              title="Editar pedido"
            >
              {o.catalog_item?.name ?? "(producto eliminado)"}
            </button>
            <span className="pb-erow__client">{buyer(o)}</span>
            {o.note && (
              <span className="pb-erow__note" title={o.note}>
                📝 {o.note}
              </span>
            )}
            <span className="pb-erow__spacer" />
            <span className="pb-erow__date" title="Fecha de entrega">
              📅 {formatDate(o.updated_at)}
            </span>
            {o.value != null && (
              <span className="pb-erow__price">{formatARS(o.value)}</span>
            )}
            <MarginPill order={o} />
            <PaymentPill status={o.payment_status} />
            <button
              type="button"
              className="tbtn"
              disabled={!paid && o.value == null}
              onClick={() => onPayment(o.id, !paid)}
              title={paid ? "Revertir el cobro" : "Registrar cobro"}
            >
              {paid ? "↺ Pago" : "$ Cobrar"}
            </button>
            <button
              type="button"
              className="tbtn"
              onClick={() => onChangeStatus(o.id, "EJECUTADO")}
              title="Deshacer entrega (vuelve a 'listo')"
            >
              ↩ Reabrir
            </button>
            <button
              type="button"
              className="tbtn tbtn--del"
              onClick={() => onDelete(o.id)}
              title="Eliminar pedido"
              aria-label={`Eliminar pedido #${o.id}`}
            >
              🗑
            </button>
          </article>
        );
      })}
    </div>
  );
}
