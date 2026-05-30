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
import { OnboardingModal } from "./OnboardingModal";
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

/** dd/mm/aa, TZ-safe (no construye Date a partir del ISO). */
const fmtDate = (iso: string): string => {
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso.slice(0, 10);
  return `${d}/${m}/${y.slice(2)}`;
};

/** Símbolo de unidad para mostrar junto a un valor de stock. */
const unitSuffix = (unit: string): string =>
  unit === "un" ? " u" : unit === "ml" ? " ml" : "g";

const fmtStock = (qty: number, unit: string): string =>
  `${qty.toLocaleString("es-AR", { maximumFractionDigits: 0 })}${unitSuffix(unit)}`;

// Umbral de "agotándose": stock dentro del 20% por encima del mínimo.
const ALERT_FACTOR = 1.2;

/**
 * Pantalla principal de KPIs — el primer módulo al ingresar al admin.
 * Reutiliza endpoints existentes (cash + orders + catalog + materials) y los
 * organiza en una jerarquía clara: financiero destacado → operativo → stock y
 * catálogo → alertas accionables → últimas ventas → análisis.
 */
export function ReportesPage() {
  const [range, setRange] = useState<Range>(() => presetRange("mes"));
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [profit, setProfit] = useState<ProfitabilitySummary | null>(null);
  const [cash, setCash] = useState<CashSummary | null>(null);
  const [receivables, setReceivables] = useState<ReceivablesSummary | null>(
    null,
  );
  const [orders, setOrders] = useState<Order[]>([]);
  const [catalogVisible, setCatalogVisible] = useState<number>(0);
  const [catalogTotal, setCatalogTotal] = useState<number>(0);
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
      getCatalog(null, { include_archived: true }),
      getOrdersSummary({ start: range.start, end: range.end }).catch(() => null),
      getProductionSummary({ start: range.start, end: range.end }).catch(
        () => null,
      ),
      getMaterials().catch(() => []),
    ])
      .then(([p, c, r, o, catVisible, catAll, os, ps, mats]) => {
        if (cancelled) return;
        setProfit(p);
        setCash(c);
        setReceivables(r);
        setOrders(o);
        setCatalogVisible(catVisible.length);
        setCatalogTotal(catAll.length);
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

  // Stock y catálogo: valor en estoque, materiales activos y críticos.
  const stockStats = useMemo(() => {
    const active = materials.filter((m) => !m.archived);
    const stockValue = active.reduce(
      (acc, m) => acc + m.stock_g * m.cost_per_g,
      0,
    );
    const critical = active.filter(
      (m) => m.min_stock > 0 && m.stock_g <= m.min_stock,
    ).length;
    return { activeCount: active.length, stockValue, critical };
  }, [materials]);

  // Materiales bajo el mínimo o agotándose, ordenados por criticidad.
  const materialAlerts = useMemo(() => {
    return materials
      .filter((m) => !m.archived && m.min_stock > 0)
      .map((m) => ({
        material: m,
        ratio: m.min_stock > 0 ? m.stock_g / m.min_stock : Infinity,
      }))
      .filter((x) => x.ratio <= ALERT_FACTOR)
      .sort((a, b) => a.ratio - b.ratio);
  }, [materials]);

  // Últimas ventas: pedidos entregados, más recientes primero.
  const ultimasVentas = useMemo(() => {
    const saleKey = (o: Order) => o.sale_date ?? o.created_at;
    return orders
      .filter((o) => o.order_status === "ENTREGADO")
      .sort((a, b) => saleKey(b).localeCompare(saleKey(a)))
      .slice(0, 8);
  }, [orders]);

  return (
    <div className="reportes">
      <header className="reportes__header">
        <div>
          <p className="reportes__eyebrow">Panel de control</p>
          <h2 className="reportes__title">Reportes</h2>
          <p className="reportes__subtitle">
            Visión completa de tu operación: financiero, producción, stock y
            catálogo — todo en un solo lugar.
          </p>
        </div>
        <button
          type="button"
          className="help-btn"
          onClick={() => setOnboardingOpen(true)}
          aria-label="Qué son los Reportes y cómo se conectan"
          title="¿Qué es esto?"
        >
          ?
        </button>
      </header>

      <div className="reportes__toolbar">
        <RangePicker range={range} onChange={setRange} />
      </div>

      <OnboardingModal
        open={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
      />

      {error ? <div className="reportes__error">{error}</div> : null}

      {/* Banda hero — los números que importan, en grande. */}
      <section className="reportes__hero">
        <KpiCard
          label="Facturación total"
          value={fmtMoney(profit?.revenue ?? 0)}
          tone="green"
          icon={<span aria-hidden>💰</span>}
          hint={loading ? "Cargando…" : `${profit?.orders_count ?? 0} pedidos en el período`}
        />
        <KpiCard
          label="Lucro líquido"
          value={fmtMoney(profit?.profit ?? 0)}
          tone="blue"
          icon={<span aria-hidden>📈</span>}
          hint={
            profit && profit.orders_without_cost > 0
              ? `${profit.orders_without_cost} pedidos sin costo cargado`
              : "Ganancia después de costos"
          }
        />
        <KpiCard
          label="Margen"
          value={fmtPct(profit?.margin_pct ?? 0)}
          tone="purple"
          icon={<span aria-hidden>%</span>}
          hint="Lucro sobre facturación"
        />
      </section>

      {/* KPIs operativos */}
      <SectionHead
        eyebrow="Operación"
        title="Pedidos y producción"
        subtitle="Cómo viene el flujo de trabajo en el período seleccionado."
      />
      <section className="reportes__kpi-grid reportes__kpi-grid--secondary">
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

      {/* Stock y catálogo */}
      <SectionHead
        eyebrow="Inventario"
        title="Stock y catálogo"
        subtitle="Cuánto vale lo que tenés guardado y qué tan grande es tu vitrina."
      />
      <section className="reportes__kpi-grid reportes__kpi-grid--secondary">
        <KpiCard
          label="Valor en stock"
          value={fmtMoney(stockStats.stockValue)}
          tone="green"
          icon={<span aria-hidden>🏷️</span>}
          hint="Estimado (stock × costo)"
        />
        <KpiCard
          label="Materiales activos"
          value={fmtInt(stockStats.activeCount)}
          tone="blue"
          icon={<span aria-hidden>🧵</span>}
          hint="Filamentos e insumos"
        />
        <KpiCard
          label="Stock crítico"
          value={fmtInt(stockStats.critical)}
          tone={stockStats.critical > 0 ? "red" : "green"}
          icon={<span aria-hidden>🚨</span>}
          hint={
            stockStats.critical > 0
              ? "Bajo el mínimo definido"
              : "Todo por encima del mínimo"
          }
        />
        <KpiCard
          label="Catálogo (total)"
          value={fmtInt(catalogTotal)}
          tone="purple"
          icon={<span aria-hidden>📦</span>}
          hint="Productos cargados"
        />
        <KpiCard
          label="Visibles en vitrina"
          value={fmtInt(catalogVisible)}
          tone="neutral"
          icon={<span aria-hidden>🛍️</span>}
          hint={
            catalogTotal > catalogVisible
              ? `${catalogTotal - catalogVisible} archivados`
              : "Sin archivar"
          }
        />
      </section>

      {/* Material en alerta */}
      <SectionHead
        eyebrow="Acción requerida"
        title="Material en alerta"
        subtitle="Lo que está por debajo del mínimo o agotándose — reponé antes de frenar la producción."
      />
      <section className="reportes__panels">
        <div className="reportes__panel reportes__panel--full">
          <MaterialAlerts alerts={materialAlerts} loading={loading} />
        </div>
      </section>

      {/* Últimas ventas */}
      <SectionHead
        eyebrow="Comercial"
        title="Últimas ventas"
        subtitle="Los pedidos entregados más recientes."
      />
      <section className="reportes__panels">
        <div className="reportes__panel reportes__panel--full">
          <UltimasVentas ventas={ultimasVentas} loading={loading} />
        </div>
      </section>

      {/* Análisis */}
      <SectionHead
        eyebrow="Análisis"
        title="Tendencias y rentabilidad"
        subtitle="Evolución del período y productos que más aportan."
      />
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
            <p>Cantidad acumulada por tipo</p>
          </header>
          <StockByMaterial materials={materials} />
        </div>
      </section>
    </div>
  );
}

function SectionHead({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="reportes__section-head">
      <p className="reportes__section-eyebrow">{eyebrow}</p>
      <h3 className="reportes__section-title">{title}</h3>
      {subtitle ? <p className="reportes__section-sub">{subtitle}</p> : null}
    </div>
  );
}

function MaterialAlerts({
  alerts,
  loading,
}: {
  alerts: { material: Material; ratio: number }[];
  loading: boolean;
}) {
  if (loading) {
    return <p className="reportes__empty">Cargando…</p>;
  }
  if (alerts.length === 0) {
    return (
      <div className="alert-empty">
        <span className="alert-empty__icon" aria-hidden>
          ✅
        </span>
        <p className="alert-empty__title">Todo en orden</p>
        <p className="alert-empty__sub">
          Ningún material está por debajo de su mínimo. Definí un “stock mínimo”
          en cada material desde Inventario para recibir alertas acá.
        </p>
      </div>
    );
  }
  return (
    <div className="alert-list">
      {alerts.map(({ material: m }) => {
        const critical = m.stock_g <= m.min_stock;
        const tone = critical ? "red" : "orange";
        // Barra: el mínimo queda a ~66% del ancho (refMax = min × 1.5).
        const refMax = m.min_stock * 1.5;
        const width = Math.max(
          4,
          Math.min(100, (m.stock_g / refMax) * 100),
        );
        return (
          <div className="alert-row" key={m.id}>
            <div className="alert-row__main">
              <span className={`alert-row__dot alert-row__dot--${tone}`} />
              <div className="alert-row__id">
                <span className="alert-row__name">{m.name}</span>
                <span className="alert-row__meta">
                  {m.type}
                  {m.color ? ` · ${m.color}` : ""}
                </span>
              </div>
            </div>
            <div className="alert-row__bar">
              <div className="alert-row__track">
                <div
                  className={`alert-row__fill alert-row__fill--${tone}`}
                  style={{ width: `${width}%` }}
                />
              </div>
              <span className="alert-row__nums">
                {fmtStock(m.stock_g, m.unit)}
                <span className="alert-row__min">
                  {" "}
                  / mín {fmtStock(m.min_stock, m.unit)}
                </span>
              </span>
            </div>
            <span className={`alert-badge alert-badge--${tone}`}>
              {critical ? "Crítico" : "Bajo"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function UltimasVentas({
  ventas,
  loading,
}: {
  ventas: Order[];
  loading: boolean;
}) {
  if (loading) {
    return <p className="reportes__empty">Cargando…</p>;
  }
  if (ventas.length === 0) {
    return (
      <p className="reportes__empty">
        Todavía no hay pedidos entregados. Cuando marques uno como “Entregado”
        aparecerá acá.
      </p>
    );
  }
  return (
    <div className="sales-table">
      <div className="sales-table__head">
        <span>Producto</span>
        <span>Cliente</span>
        <span className="sales-table__right">Precio</span>
        <span className="sales-table__right">Fecha</span>
      </div>
      {ventas.map((o) => (
        <div className="sales-table__row" key={o.id}>
          <span className="sales-table__name">
            {o.catalog_item?.name ?? "—"}
            {o.quantity > 1 ? (
              <span className="sales-table__qty"> ×{o.quantity}</span>
            ) : null}
          </span>
          <span className="sales-table__client">
            {o.contact?.name ?? o.person_label ?? "—"}
          </span>
          <span className="sales-table__right sales-table__price">
            {o.value != null ? fmtMoney(o.value) : "—"}
          </span>
          <span className="sales-table__right sales-table__date">
            {fmtDate(o.sale_date ?? o.created_at)}
          </span>
        </div>
      ))}
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
