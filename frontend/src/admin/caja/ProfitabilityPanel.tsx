import { useCallback, useEffect, useState } from "react";
import { getProfitability } from "../../api/client";
import type { ProfitabilitySummary } from "../../types";
import { formatARS } from "../../utils/format";
import type { Range } from "./periods";
import { RangePicker } from "./RangePicker";

export function ProfitabilityPanel() {
  const [range, setRange] = useState<Range>({ start: "", end: "" });
  const [data, setData] = useState<ProfitabilitySummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setData(
        await getProfitability({
          start: range.start || undefined,
          end: range.end || undefined,
        }),
      );
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    }
  }, [range]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const profitClass = (n: number) => (n >= 0 ? "is-credit" : "is-debit");

  return (
    <section className="txn-section">
      {error && <p className="error-banner">{error}</p>}

      <div className="caja-dash__head">
        <RangePicker range={range} onChange={setRange} />
      </div>

      <div className="stat-grid">
        <div className="stat-card stat-card--credit">
          <span className="stat-card__label">Facturado</span>
          <span className="stat-card__value">{formatARS(data?.revenue ?? 0)}</span>
          <span className="stat-card__sub">
            {data?.orders_count ?? 0} pedidos
          </span>
        </div>
        <div className="stat-card stat-card--debit">
          <span className="stat-card__label">Costo estimado</span>
          <span className="stat-card__value">{formatARS(data?.cost ?? 0)}</span>
          <span className="stat-card__sub">según calculadora</span>
        </div>
        <div
          className={`stat-card ${
            (data?.profit ?? 0) >= 0 ? "stat-card--credit" : "stat-card--debit"
          }`}
        >
          <span className="stat-card__label">Ganancia</span>
          <span className="stat-card__value">{formatARS(data?.profit ?? 0)}</span>
          <span className="stat-card__sub">
            Margen {data?.margin_pct ?? 0}%
          </span>
        </div>
      </div>

      {data && data.orders_without_cost > 0 && (
        <p className="hint hint--warn">
          ⚠ {data.orders_without_cost} pedido(s) sin costo cargado: la ganancia
          de esos pedidos está sobreestimada (costo = 0).
        </p>
      )}

      <div className="txn-toolbar">
        <h3>Rentabilidad por producto</h3>
      </div>

      {!data || data.by_product.length === 0 ? (
        <p className="txn-empty">Sin pedidos con valor en el período.</p>
      ) : (
        <div className="txn-table txn-table--prof" role="table">
          <div className="txn-row txn-row--head" role="row">
            <span>Producto</span>
            <span>Pedidos</span>
            <span>Unid.</span>
            <span className="txn-amount-col">Facturado</span>
            <span className="txn-amount-col">Costo</span>
            <span className="txn-amount-col">Ganancia</span>
            <span className="txn-amount-col">Margen</span>
          </div>
          {data.by_product.map((r) => (
            <div className="txn-row" role="row" key={r.label}>
              <span data-label="Producto">{r.label}</span>
              <span data-label="Pedidos">{r.orders_count}</span>
              <span data-label="Unid.">{r.units}</span>
              <span data-label="Facturado" className="txn-amount-col">
                {formatARS(r.revenue)}
              </span>
              <span data-label="Costo" className="txn-amount-col">
                {formatARS(r.cost)}
              </span>
              <span
                data-label="Ganancia"
                className={`txn-amount-col txn-amount ${profitClass(r.profit)}`}
              >
                {formatARS(r.profit)}
              </span>
              <span
                data-label="Margen"
                className={`txn-amount-col ${profitClass(r.profit)}`}
              >
                {r.margin_pct}%
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
