import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Order, OrderStatus } from "../../../types";
import { formatARS } from "../../../utils/format";
import { KebabMenu, type KebabItem } from "./KebabMenu";
import { statusKebabItems } from "./statusActions";

interface QueueCardProps {
  order: Order;
  pieceTotal: number;
  /** ¿Se puede iniciar ahora? (hay impresora libre o la asignada está libre). */
  canStart: boolean;
  /** Las piezas pendientes no tienen impresora asignada (se auto-asigna al iniciar). */
  noPrinter: boolean;
  /** ¿El pedido tiene al menos una pieza PENDENTE para iniciar? (false = sin piezas). */
  hasPending: boolean;
  isNext: boolean;
  etaStart: Date | null;
  onStart: (orderId: number) => void;
  onGestionarPiezas: (order: Order) => void;
  onEditar: (order: Order) => void;
  onCostoExtra: (order: Order) => void;
  onDelete: (orderId: number) => void;
  onChangeStatus: (id: number, target: OrderStatus) => void;
  onCancel: (id: number) => void;
}

export function QueueCard({
  order,
  pieceTotal,
  canStart,
  noPrinter,
  hasPending,
  isNext,
  etaStart,
  onStart,
  onGestionarPiezas,
  onEditar,
  onCostoExtra,
  onDelete,
  onChangeStatus,
  onCancel,
}: QueueCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: order.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const etaTxt = etaStart
    ? etaStart.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
    : null;

  const kebabItems: KebabItem[] = [
    { label: "🖨 Gestionar piezas", onClick: () => onGestionarPiezas(order) },
    { label: "✎ Editar pedido", onClick: () => onEditar(order) },
    { label: "＋ Costo extra", onClick: () => onCostoExtra(order) },
    ...statusKebabItems(order, onChangeStatus, onCancel),
    { label: "Eliminar pedido", danger: true, onClick: () => onDelete(order.id) },
  ];

  return (
    <article
      ref={setNodeRef}
      style={style}
      className="pb-qcard"
      data-next={isNext ? "true" : "false"}
      data-dragging={isDragging ? "true" : "false"}
    >
      {/* Zona de arrastre: todo menos el botón Iniciar y el kebab. */}
      <div className="pb-qcard__grab" {...attributes} {...listeners}>
        <div className="pb-qcard__row1">
          <span className="pb-qcard__tag" data-next={isNext ? "true" : "false"}>
            {isNext ? "PRÓXIMO" : "EN ESPERA"}
          </span>
          <span className="pb-qcard__spacer" />
          {order.value != null && (
            <span className="pb-qcard__price">{formatARS(order.value)}</span>
          )}
        </div>

        <div className="pb-qcard__row2">
          <span className="pb-qcard__id">#{order.id}</span>
          <span className="pb-qcard__product">
            {order.catalog_item?.name ?? "(producto eliminado)"}
          </span>
        </div>

        {order.note && (
          <p className="pb-note" title={order.note}>
            📝 {order.note}
          </p>
        )}

        <div className="pb-qcard__row3">
          {isNext && etaTxt ? (
            <span className="pb-qcard__meta">🕐 empieza ~{etaTxt}</span>
          ) : (
            <span className="pb-qcard__meta">
              ❏ {pieceTotal} {pieceTotal === 1 ? "pieza" : "piezas"}
            </span>
          )}
          {noPrinter && (
            <span
              className="pb-chip"
              title="Se asignará una impresora libre al iniciar (o elegila en Gestionar piezas)"
            >
              🖨 auto
            </span>
          )}
        </div>
      </div>

      <div className="pb-qcard__foot">
        <button
          type="button"
          className="pb-qcard__start"
          disabled={!canStart}
          title={
            canStart
              ? "Iniciar producción"
              : !hasPending
                ? "Este pedido no tiene piezas — agregá una en «Gestionar piezas»"
                : "No hay impresora libre — esperá a que una termine"
          }
          onClick={() => onStart(order.id)}
        >
          ▶ Iniciar
        </button>
        <KebabMenu items={kebabItems} />
      </div>
    </article>
  );
}
