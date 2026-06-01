import type { Order } from "../../../types";
import { computeProfitability } from "../../calculadora/calc";

export function MarginPill({
  order,
}: {
  order: Pick<Order, "cost_items" | "value" | "quantity">;
}) {
  if (order.cost_items.length === 0 || order.value == null) return null;
  const prof = computeProfitability(
    order.cost_items.map((c) => ({ amount: c.amount, per_unit: c.per_unit })),
    order.quantity,
    order.value,
  );
  const ok = prof.profit >= 0;
  const pct = prof.marginPct;
  return (
    <span className="pb-pill pb-pill--margin" data-tone={ok ? "ok" : "bad"}>
      {ok ? "↗" : "↘"} {pct != null ? `${pct > 0 ? "+" : ""}${pct}% margen` : "margen —"}
    </span>
  );
}
