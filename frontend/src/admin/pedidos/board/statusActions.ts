import type { Order, OrderStatus } from "../../../types";
import type { KebabItem } from "./KebabMenu";

// Estados que el usuario puede setear a mano. EJECUTANDO NO está: se deriva de
// tener piezas en curso (el backend lo reconcilia vía _resync_order_status), así
// que ofrecerlo como destino manual solo confundiría (rebotaría solo).
const MANUAL_TARGETS: { status: OrderStatus; label: string }[] = [
  { status: "CREADO", label: "↩ Volver a la cola" },
  { status: "EJECUTADO", label: "✓ Marcar como listo" },
  { status: "ENTREGADO", label: "📦 Marcar como entregado" },
];

/**
 * Ítems de kebab para cambiar el estado del pedido a mano (control total). Omite
 * el estado actual. Cada ítem es una acción directa (DMMT); las reversiones con
 * piezas en curso se confirman en el handler (changeOrderStatus).
 */
export function statusKebabItems(
  order: Order,
  onChangeStatus: (id: number, target: OrderStatus) => void,
): KebabItem[] {
  return MANUAL_TARGETS.filter((t) => t.status !== order.order_status).map((t) => {
    // Caso frecuente: deshacer una entrega vuelve a "listo".
    const label =
      order.order_status === "ENTREGADO" && t.status === "EJECUTADO"
        ? "↩ Deshacer entrega"
        : t.label;
    return { label, onClick: () => onChangeStatus(order.id, t.status) };
  });
}
