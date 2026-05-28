import type { Order, ProductionRun } from "../../types";
import {
  computeUrgency,
  formatProduction,
  formatSlack,
  URGENCY_LABEL,
  type Urgency,
} from "./urgency";

interface Props {
  order: Pick<Order, "deadline" | "order_status">;
  runs?: Pick<ProductionRun, "status" | "estimated_minutes">[];
  /** Tick para forzar recálculo (parent puede pasar `now` cada minuto). */
  now?: Date;
  /** Pedidos terminales no muestran badge — el caller puede usar este filtro. */
  hideForTerminal?: boolean;
}

/**
 * Badge compacto: nivel de urgencia + slack + tiempo de producción.
 *
 * Variantes (vía data-urgency):
 *   ⚡ crítico  · 2d para deadline · 6h producción     (rojo)
 *   🔥 apretado · 4d para deadline · 2h producción     (ámbar)
 *   ✅ holgado  · 2sem para deadline · 1h producción   (verde)
 *   · sin deadline                                      (gris)
 */
export function UrgencyBadge({ order, runs = [], now, hideForTerminal = true }: Props) {
  const { urgency, slackMinutes, productionMinutes } = computeUrgency(order, runs, now);

  if (
    hideForTerminal &&
    (order.order_status === "EJECUTADO" || order.order_status === "ENTREGADO")
  ) {
    return null;
  }

  const showDetails = urgency !== "sin-deadline";
  const slackText = formatSlack(slackMinutes);
  const prodText = formatProduction(productionMinutes);

  return (
    <span
      className="urgency-badge"
      data-urgency={urgency}
      title={tooltipFor(urgency, slackText, prodText)}
    >
      <strong>{URGENCY_LABEL[urgency]}</strong>
      {showDetails && (
        <>
          <span aria-hidden> · </span>
          <span className="urgency-badge__slack">{slackText}</span>
          {productionMinutes > 0 && (
            <>
              <span aria-hidden> · </span>
              <span className="urgency-badge__prod">{prodText} prod.</span>
            </>
          )}
        </>
      )}
    </span>
  );
}

function tooltipFor(urgency: Urgency, slack: string, prod: string): string {
  if (urgency === "sin-deadline") {
    return "Este pedido no tiene deadline cargado. Agregalo en 'Editar pedido' para que el sistema calcule la urgencia.";
  }
  return `${URGENCY_LABEL[urgency]} — slack ${slack}, producción estimada ${prod}.`;
}
