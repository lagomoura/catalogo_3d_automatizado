import { useEffect, useMemo, useState } from "react";
import {
  getCashSummary,
  getCatalog,
  getMaterials,
  getOrders,
  getOrdersSummary,
  getProductionSummary,
  getProfitability,
  getReceivables,
} from "../../api/client";
import { KpiCard } from "../../components/KpiCard";
import type {
  CashSummary,
  Material,
  Order,
  OrderSummary,
  ProductionSummary,
  ProfitabilitySummary,
  ReceivablesSummary,
} from "../../types";
import { presetRange, type Range } from "../caja/periods";
import { RangePicker } from "../caja/RangePicker";
import "./reportes.css";

const fmtMoney = (n: number) =>
  n.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const fmtPct = (n: number) =>
  `${n.toLocaleString("es-AR", { maximumFractionDigits: 1 })}%`;

const fmtInt = (n: number) => n.toLocaleString("es-AR");

const fmtAvgMin = (minutes: number): string => {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes - h * 60);
    return `${h}h ${m}m`;
  }
  return `${Math.round(minutes)}m`;
};

/**
 * Pantalla de KPIs unificados inspirada en el "Relatórios" de Lunaro.
 * Reutiliza endpoints existentes (cash + orders + catalog) — no requiere
 * backend nuevo. Funciona como mockup vivo para validar la dirección.
 */
export function ReportesPage() {
  const [range, setRange] = useState<Range>(() => presetRange("mes"));
  const [profit, setProfit] = useState<ProfitabilitySummary | null>(null);
  const [cash, setCash] = useState<CashSummary | null>(null);
  const [receivables, setReceivables] = useState<ReceivablesSummary | null>(
    null,
  );
  const [orders, setOrders] = useState<Order[]>([]);
  const [catalogCount, setCatalogCount] = useState<number>(0);
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);
  const [prodSummary, setProdSummary] = useState<ProductionSummary | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getProfitability({ start: range.start, end: range.end }),
      getCashSummary({ start: range.start, end: range.end }),
      getReceivables(),
      getOrders(),
      getCatalog(null),
      getOrdersSummary({ start: range.start, end: range.end }).catch(() => null),
      getProductionSummary({ start: range.start, end: range.end }).catch(
        () => null,
      ),
      getMaterials().catch(() => []),
    ])
      .then(([p, c, r, o, cat, os, ps, mats]) => {
        if (cancelled) return;
        setProfit(p);
        setCash(c);
        setReceivables(r);
        setOrders(o);
        setCatalogCount(cat.length);
        setOrderSummary(os);
        setProdSummary(ps);
        setMaterials(mats);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Error cargando datos");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range.start, range.end]);

  const orderKpis = useMemo(() => {
    const inRange = orders.filter((o) => {
      const created = o.created_at.slice(0, 10);
      return created >= range.start && created <= range.end;
    });
    const enProduccion = orders.filter((o) => o.order_status === "EJECUTANDO")
      .length;
    const prontosEntrega = orders.filter((o) => o.order_status === "EJECUTADO")
      .length;
    const entregadosMes = inRange.filter(
      (o) => o.order_status === "ENTREGADO",
    ).length;
    return {
      emProduccion: enProduccion,
      prontosEntrega,
      entregadosMes,
      totalDelMes: inRange.length,
    };
  }, [orders, range.start, range.end]);

  const ticketMedio = profit && profit.orders_count > 0
    ? profit.revenue / profit.orders_count
    : 0;

  return (
    <div className="reportes">
      <header className="reportes__header">
        <div>
          <p className="reportes__eyebrow">Panel</p>
          <h2 className="reportes__title">Reportes</h2>
          <p className="reportes__subtitle">
            Visión completa de tu operación: financiero, producción, costos y
            catálogo.
          </p>
        </div>
        <div className="reportes__filters">
          <RangePicker range={range} onChange={setRange} />
        </div>
      </header>

      {error ? <div className="reportes__error">{error}</div> : null}

      <section className="reportes__kpi-grid">
        <KpiCard
          label="Facturación total"
          value={fmtMoney(profit?.revenue ?? 0)}
          tone="green"
          icon={<span aria-hidden>💰</span>}
          hint={loading ? "Cargando…" : `${profit?.orders_count ?? 0} pedidos`}
        />
        <KpiCard
          label="Lucro líquido"
          value={fmtMoney(profit?.profit ?? 0)}
          tone="blue"
          icon={<span aria-hidden>📈</span>}
          hint={
            profit && profit.orders_without_cost > 0
              ? `${profit.orders_without_cost} pedidos sin costo cargado`
              : undefined
          }
        />
        <KpiCard
          label="Margen"
          value={fmtPct(profit?.margin_pct ?? 0)}
          tone="purple"
          icon={<span aria-hidden>%</span>}
        />
        <KpiCard
          label="Ticket medio"
          value={fmtMoney(ticketMedio)}
          tone="neutral"
          icon={<span aria-hidden>🎫</span>}
        />
        <KpiCard
          label="Valor pendiente"
          value={fmtMoney(receivables?.total ?? 0)}
          tone="orange"
          icon={<span aria-hidden>⏳</span>}
          hint={
            receivables ? `${receivables.count} cuentas por cobrar` : undefined
          }
        />
        <KpiCard
          label="Productos en catálogo"
          value={fmtInt(catalogCount)}
          tone="purple"
          icon={<span aria-hidden>📦</span>}
        />
      </section>

      <section className="reportes__kpi-grid reportes__kpi-grid--secondary">
        <KpiCard
          label="Pedidos del mes"
          value={fmtInt(orderKpis.totalDelMes)}
          tone="neutral"
          icon={<span aria-hidden>🧾</span>}
        />
        <KpiCard
          label="Atrasados"
          value={fmtInt(orderSummary?.atrasados ?? 0)}
          tone="red"
          icon={<span aria-hidden>⚠️</span>}
          hint={
            orderSummary
              ? `Próximos del prazo: ${orderSummary.prazo_proximo}`
              : undefined
          }
        />
        <KpiCard
          label="En producción"
          value={fmtInt(orderKpis.emProduccion)}
          tone="orange"
          icon={<span aria-hidden>🛠</span>}
        />
        <KpiCard
          label="Listos para entrega"
          value={fmtInt(orderKpis.prontosEntrega)}
          tone="blue"
          icon={<span aria-hidden>📤</span>}
        />
        <KpiCard
          label="Entregados en el mes"
          value={fmtInt(orderKpis.entregadosMes)}
          tone="green"
          icon={<span aria-hidden>✅</span>}
        />
        <KpiCard
          label="Horas impresas"
          value={
            prodSummary
              ? `${prodSummary.horas_concluidas.toLocaleString("es-AR", {
                  maximumFractionDigits: 1,
                })}h`
              : "—"
          }
          tone="purple"
          icon={<span aria-hidden>⏱</span>}
          hint={
            prodSummary && prodSummary.concluida > 0
              ? `Tempo médio: ${fmtAvgMin(
                  (prodSummary.horas_concluidas * 60) / prodSummary.concluida,
                )}`
              : undefined
          }
        />
      </section>

      <section className="reportes__panels">
        <div className="reportes__panel">
          <header className="reportes__panel-head">
            <h3>Facturación y lucro</h3>
            <p>Evolución en el período filtrado</p>
          </header>
          <div className="reportes__chart-placeholder">
            {cash && cash.daily.length > 0 ? (
              <DailyMiniChart daily={cash.daily} />
            ) : (
              <p className="reportes__empty">
                Sin datos financieros para el período seleccionado.
              </p>
            )}
          </div>
        </div>

        <div className="reportes__panel">
          <header className="reportes__panel-head">
            <h3>Estado de pedidos</h3>
            <p>Distribución en el período</p>
          </header>
          <div className="reportes__chart-placeholder">
            <OrdersStatusBars orders={orders} range={range} />
          </div>
        </div>
      </section>

      <section className="reportes__panels">
        <div className="reportes__panel">
          <header className="reportes__panel-head">
            <h3>Top productos por margen</h3>
            <p>Mayor lucro acumulado en el rango</p>
          </header>
          <ProfitTable profit={profit} loading={loading} />
        </div>

        <div className="reportes__panel">
          <header className="reportes__panel-head">
            <h3>Stock por material</h3>
            <p>Gramos acumulados por tipo de filamento</p>
          </header>
          <StockByMaterial materials={materials} />
        </div>
      </section>
    </div>
  );
}

function DailyMiniChart({
  daily,
}: {
  daily: { day: string; credit: number; debit: number; net: number }[];
}) {
  const max = Math.max(1, ...daily.map((d) => Math.max(d.credit, d.debit)));
  return (
    <div className="mini-chart">
      {daily.map((d) => (
        <div className="mini-chart__col" key={d.day} title={`${d.day}\n+${d.credit}\n-${d.debit}`}>
          <div
            className="mini-chart__bar mini-chart__bar--credit"
            style={{ height: `${(d.credit / max) * 100}%` }}
          />
          <div
            className="mini-chart__bar mini-chart__bar--debit"
            style={{ height: `${(d.debit / max) * 100}%` }}
          />
        </div>
      ))}
    </div>
  );
}

function OrdersStatusBars({
  orders,
  range,
}: {
  orders: Order[];
  range: Range;
}) {
  const inRange = orders.filter((o) => {
    const created = o.created_at.slice(0, 10);
    return created >= range.start && created <= range.end;
  });
  const counts: Record<string, number> = {
    CREADO: 0,
    EJECUTANDO: 0,
    EJECUTADO: 0,
    ENTREGADO: 0,
  };
  for (const o of inRange) counts[o.order_status] = (counts[o.order_status] ?? 0) + 1;
  const max = Math.max(1, ...Object.values(counts));
  const labels: Record<string, { label: string; tone: string }> = {
    CREADO: { label: "Creados", tone: "neutral" },
    EJECUTANDO: { label: "En producción", tone: "orange" },
    EJECUTADO: { label: "Listos", tone: "blue" },
    ENTREGADO: { label: "Entregados", tone: "green" },
  };
  return (
    <div className="status-bars">
      {Object.entries(counts).map(([k, v]) => {
        const meta = labels[k];
        return (
          <div className="status-bars__row" key={k}>
            <span className="status-bars__label">{meta.label}</span>
            <div className="status-bars__track">
              <div
                className={`status-bars__fill status-bars__fill--${meta.tone}`}
                style={{ width: `${(v / max) * 100}%` }}
              />
            </div>
            <span className="status-bars__value">{v}</span>
          </div>
        );
      })}
    </div>
  );
}

function ProfitTable({
  profit,
  loading,
}: {
  profit: ProfitabilitySummary | null;
  loading: boolean;
}) {
  if (loading) {
    return <p className="reportes__empty">Cargando…</p>;
  }
  if (!profit || profit.by_product.length === 0) {
    return (
      <p className="reportes__empty">
        Sin datos de rentabilidad por producto para el período.
      </p>
    );
  }
  const rows = [...profit.by_product]
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 8);
  return (
    <div className="profit-table">
      <div className="profit-table__head">
        <span>Producto</span>
        <span>Pedidos</span>
        <span>Facturación</span>
        <span>Costo</span>
        <span>Lucro</span>
        <span>Margen</span>
      </div>
      {rows.map((r) => (
        <div className="profit-table__row" key={r.label}>
          <span className="profit-table__name">{r.label}</span>
          <span>{r.orders_count}</span>
          <span>{fmtMoney(r.revenue)}</span>
          <span>{fmtMoney(r.cost)}</span>
          <span className="profit-table__profit">{fmtMoney(r.profit)}</span>
          <span>{fmtPct(r.margin_pct)}</span>
        </div>
      ))}
    </div>
  );
}

function StockByMaterial({ materials }: { materials: Material[] }) {
  const active = materials.filter((m) => !m.archived);
  if (active.length === 0) {
    return (
      <p className="reportes__empty">
        Sin materiales cargados. Subí al menos uno desde Estoque.
      </p>
    );
  }
  // Agrupar por tipo.
  const byType = new Map<string, number>();
  for (const m of active) {
    byType.set(m.type, (byType.get(m.type) ?? 0) + m.stock_g);
  }
  const rows = Array.from(byType.entries())
    .map(([type, stock]) => ({ type, stock }))
    .sort((a, b) => b.stock - a.stock);
  const max = Math.max(1, ...rows.map((r) => r.stock));

  return (
    <div className="status-bars">
      {rows.map((r) => (
        <div className="status-bars__row" key={r.type}>
          <span className="status-bars__label">{r.type}</span>
          <div className="status-bars__track">
            <div
              className="status-bars__fill status-bars__fill--blue"
              style={{ width: `${(r.stock / max) * 100}%` }}
            />
          </div>
          <span className="status-bars__value">
            {r.stock.toLocaleString("es-AR", { maximumFractionDigits: 0 })}g
          </span>
        </div>
      ))}
    </div>
  );
}
