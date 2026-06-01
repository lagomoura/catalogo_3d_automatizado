import type { Order } from "../../../types";
import { formatARS, formatDate } from "../../../utils/format";
import { PaymentPill } from "./PaymentPill";

interface CanceladosPanelProps {
  orders: Order[];
  /** Reactivar = volver el pedido a la cola (CREADO). Resembra su producción. */
  onReactivate: (id: number) => void;
  onDelete: (id: number) => void;
}

function buyer(o: Order): string {
  return o.contact?.name ?? o.person_label ?? "—";
}

export function CanceladosPanel({
  orders,
  onReactivate,
  onDelete,
}: CanceladosPanelProps) {
  if (orders.length === 0) {
    return <p className="pb-col__empty">No hay pedidos cancelados.</p>;
  }
  return (
    <div className="pb-entregados">
      {orders.map((o) => (
        <article key={o.id} className="pb-erow" data-cancelled="true">
          <span className="pb-erow__id">#{o.id}</span>
          <span className="pb-erow__product">
            {o.catalog_item?.name ?? "(producto eliminado)"}
          </span>
          <span className="pb-erow__client">{buyer(o)}</span>
          <span className="pb-badge pb-badge--cancelled">Cancelado</span>
          {o.note && (
            <span className="pb-erow__note" title={o.note}>
              📝 {o.note}
            </span>
          )}
          <span className="pb-erow__spacer" />
          <span className="pb-erow__date" title="Fecha de cancelación (aprox.)">
            📅 {formatDate(o.updated_at)}
          </span>
          {o.value != null && (
            <span className="pb-erow__price">{formatARS(o.value)}</span>
          )}
          {o.payment_status === "PAGADO" && <PaymentPill status="PAGADO" />}
          <button
            type="button"
            className="tbtn"
            onClick={() => onReactivate(o.id)}
            title="Reactivar: vuelve el pedido a la cola y resembra su producción"
          >
            ↩ Reactivar
          </button>
          <button
            type="button"
            className="tbtn tbtn--del"
            onClick={() => onDelete(o.id)}
            title="Eliminar definitivamente"
            aria-label={`Eliminar pedido #${o.id}`}
          >
            🗑
          </button>
        </article>
      ))}
    </div>
  );
}
