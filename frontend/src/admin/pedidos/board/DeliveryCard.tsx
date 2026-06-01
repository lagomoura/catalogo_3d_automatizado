import { resolveStorageUrl } from "../../../api/client";
import type { Order } from "../../../types";
import { formatARS } from "../../../utils/format";
import { KebabMenu, type KebabItem } from "./KebabMenu";
import { MarginPill } from "./MarginPill";
import { PaymentPill } from "./PaymentPill";

interface DeliveryCardProps {
  order: Order;
  /** true: producción terminada pero pedido aún EJECUTANDO → "Marcar listo". */
  awaitingReady: boolean;
  onAdvance: (id: number) => void;
  onPayment: (id: number, paid: boolean) => void;
  onEditar: (order: Order) => void;
  onCostoExtra: (order: Order) => void;
  onDelete: (id: number) => void;
}

function buyer(o: Order): string {
  return o.contact?.name ?? o.person_label ?? "—";
}

export function DeliveryCard({
  order,
  awaitingReady,
  onAdvance,
  onPayment,
  onEditar,
  onCostoExtra,
  onDelete,
}: DeliveryCardProps) {
  const paid = order.payment_status === "PAGADO";

  const kebabItems: KebabItem[] = [
    { label: "✎ Editar pedido", onClick: () => onEditar(order) },
    {
      label: paid ? "↺ Revertir pago" : "$ Cobrar",
      onClick: () => onPayment(order.id, !paid),
      disabled: !paid && order.value == null,
    },
    { label: "＋ Costo extra", onClick: () => onCostoExtra(order) },
    { label: "Eliminar pedido", danger: true, onClick: () => onDelete(order.id) },
  ];

  return (
    <article className="pb-dcard" data-awaiting={awaitingReady ? "true" : "false"}>
      <div className="pb-dcard__status-row">
        <span
          className="pb-dcard__status"
          data-awaiting={awaitingReady ? "true" : "false"}
        >
          {awaitingReady ? "◷ Producción lista" : "✓ Listo"}
        </span>
      </div>

      <div className="pb-dcard__top">
        {order.catalog_cover_url ? (
          <img
            className="pb-dcard__thumb"
            src={resolveStorageUrl(order.catalog_cover_url)}
            alt=""
            loading="lazy"
          />
        ) : (
          <div className="pb-dcard__thumb pb-dcard__thumb--ph">s/img</div>
        )}
        <div className="pb-dcard__titles">
          <span className="pb-dcard__id">#{order.id}</span>
          <span className="pb-dcard__product">
            {order.catalog_item?.name ?? "(producto eliminado)"}
          </span>
          <span className="pb-dcard__client">
            {buyer(order)} · ×{order.quantity}
          </span>
        </div>
        <span className="pb-dcard__spacer" />
        <KebabMenu items={kebabItems} />
      </div>

      <div className="pb-dcard__meta">
        {order.value != null && (
          <span className="pb-dcard__price">{formatARS(order.value)}</span>
        )}
        <MarginPill order={order} />
        <PaymentPill status={order.payment_status} />
      </div>

      <div className="pb-dcard__actions">
        {awaitingReady ? (
          <button
            type="button"
            className="btn-primary"
            onClick={() => onAdvance(order.id)}
            title="Producción terminada — marcar pedido listo para entrega"
          >
            Marcar listo →
          </button>
        ) : (
          <button
            type="button"
            className="pb-btn-deliver"
            onClick={() => onAdvance(order.id)}
            title="Entregar al cliente"
          >
            Entregar →
          </button>
        )}
      </div>
    </article>
  );
}
