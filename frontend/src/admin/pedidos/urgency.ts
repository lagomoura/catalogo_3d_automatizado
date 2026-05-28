import type { Order, ProductionRun } from "../../types";

export type Urgency = "critico" | "apretado" | "holgado" | "sin-deadline";

export interface UrgencyResult {
  urgency: Urgency;
  /** Minutos restantes hasta el deadline (negativo si ya pasó). null si sin deadline. */
  slackMinutes: number | null;
  /** Minutos de producción estimados (suma de runs PENDENTE/EM_PRODUCAO/PAUSADA). */
  productionMinutes: number;
}

const MIN_PER_DAY = 24 * 60;

/**
 * Calcula la urgencia de un pedido a partir de su deadline vs. tiempo
 * estimado de producción.
 *
 * El "tiempo de producción" suma `estimated_minutes` de las runs todavía
 * no terminales del pedido (PENDENTE / EM_PRODUCAO / PAUSADA). Si no hay
 * runs o ninguna tiene estimación, devolvemos 0.
 *
 * Niveles:
 *   - "sin-deadline": no hay deadline → no se puede calcular, gris.
 *   - "critico": deadline < hoy o el tiempo de producción no entra (slack < 1.2× prod).
 *   - "apretado": entra justo (slack < 2× prod).
 *   - "holgado": sobra tiempo (slack >= 2× prod) — el caso normal.
 */
export function computeUrgency(
  order: Pick<Order, "deadline" | "order_status">,
  runs: Pick<ProductionRun, "status" | "estimated_minutes">[] = [],
  now: Date = new Date(),
): UrgencyResult {
  // Pedidos ya terminales no necesitan badge de urgencia — mostramos
  // "sin-deadline" como categoría neutra (la UI lo oculta o lo apaga).
  if (
    order.order_status === "EJECUTADO" ||
    order.order_status === "ENTREGADO"
  ) {
    return { urgency: "sin-deadline", slackMinutes: null, productionMinutes: 0 };
  }
  const productionMinutes = runs
    .filter((r) => r.status === "PENDENTE" || r.status === "EM_PRODUCAO" || r.status === "PAUSADA")
    .reduce((acc, r) => acc + (r.estimated_minutes ?? 0), 0);

  if (!order.deadline) {
    return { urgency: "sin-deadline", slackMinutes: null, productionMinutes };
  }

  // Comparamos contra el FINAL del día del deadline (operador tiene todo el día).
  const dl = new Date(order.deadline + "T23:59:59");
  const slackMinutes = Math.floor((dl.getTime() - now.getTime()) / 60000);

  if (slackMinutes < productionMinutes * 1.2) {
    return { urgency: "critico", slackMinutes, productionMinutes };
  }
  if (slackMinutes < productionMinutes * 2) {
    return { urgency: "apretado", slackMinutes, productionMinutes };
  }
  return { urgency: "holgado", slackMinutes, productionMinutes };
}

/** Texto humano del slack: "2d", "8h", "30m", "vencido hace 1d". */
export function formatSlack(slackMinutes: number | null): string {
  if (slackMinutes === null) return "sin deadline";
  const abs = Math.abs(slackMinutes);
  const prefix = slackMinutes < 0 ? "vencido hace " : "";
  if (abs >= MIN_PER_DAY) {
    const days = Math.floor(abs / MIN_PER_DAY);
    return `${prefix}${days}d`;
  }
  if (abs >= 60) {
    const hours = Math.floor(abs / 60);
    return `${prefix}${hours}h`;
  }
  return `${prefix}${abs}m`;
}

/** Texto humano del tiempo de producción: "6h", "45m", "—" si 0. */
export function formatProduction(productionMinutes: number): string {
  if (productionMinutes <= 0) return "—";
  if (productionMinutes >= 60) {
    const hours = (productionMinutes / 60).toFixed(productionMinutes >= 600 ? 0 : 1);
    return `${hours}h`;
  }
  return `${productionMinutes}m`;
}

export const URGENCY_LABEL: Record<Urgency, string> = {
  critico: "⚡ crítico",
  apretado: "🔥 apretado",
  holgado: "✅ holgado",
  "sin-deadline": "· sin deadline",
};
