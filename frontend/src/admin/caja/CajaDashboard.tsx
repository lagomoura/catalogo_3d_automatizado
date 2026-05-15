import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CashSummary } from "../../types";
import { formatARS, formatMonth } from "../../utils/format";

interface Props {
  summary: CashSummary | null;
  range: { start: string; end: string };
  onRangeChange: (r: { start: string; end: string }) => void;
}

const CREDIT = "#059669";
const DEBIT = "#dc2626";
const PIE = ["#2563eb", "#059669", "#d97706", "#7c3aed", "#dc2626", "#0891b2", "#db2777"];

export function CajaDashboard({ summary, range, onRangeChange }: Props) {
  const s = summary;
  const monthly =
    s?.monthly.map((m) => ({ ...m, label: formatMonth(m.month) })) ?? [];
  const topProducts = (s?.by_product ?? [])
    .map((p) => ({ name: p.label, value: p.credit + p.debit }))
    .filter((p) => p.value > 0)
    .slice(0, 7);

  return (
    <section className="caja-dash">
      <div className="caja-dash__head">
        <div className="caja-range">
          <label>
            Desde
            <input
              type="date"
              value={range.start}
              onChange={(e) =>
                onRangeChange({ ...range, start: e.target.value })
              }
            />
          </label>
          <label>
            Hasta
            <input
              type="date"
              value={range.end}
              onChange={(e) => onRangeChange({ ...range, end: e.target.value })}
            />
          </label>
          {(range.start || range.end) && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => onRangeChange({ start: "", end: "" })}
            >
              Todo
            </button>
          )}
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card stat-card--balance">
          <span className="stat-card__label">Saldo</span>
          <span className="stat-card__value">
            {formatARS(s?.balance ?? 0)}
          </span>
          <span className="stat-card__sub">{s?.count ?? 0} movimientos</span>
        </div>
        <div className="stat-card stat-card--credit">
          <span className="stat-card__label">Ingresos</span>
          <span className="stat-card__value">
            {formatARS(s?.total_credit ?? 0)}
          </span>
          <span className="stat-card__sub">Pagos recibidos</span>
        </div>
        <div className="stat-card stat-card--debit">
          <span className="stat-card__label">Egresos</span>
          <span className="stat-card__value">
            {formatARS(s?.total_debit ?? 0)}
          </span>
          <span className="stat-card__sub">Pagos realizados</span>
        </div>
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h4>Ingresos vs Egresos por mes</h4>
          {monthly.length === 0 ? (
            <p className="txn-empty">Sin datos en el período.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="label" fontSize={12} />
                <YAxis
                  fontSize={12}
                  width={70}
                  tickFormatter={(v) => formatARS(Number(v))}
                />
                <Tooltip
                  formatter={(v) => formatARS(Number(v))}
                  cursor={{ fill: "rgba(0,0,0,0.04)" }}
                />
                <Legend />
                <Bar
                  dataKey="credit"
                  name="Ingresos"
                  fill={CREDIT}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="debit"
                  name="Egresos"
                  fill={DEBIT}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-card">
          <h4>Top productos (volumen)</h4>
          {topProducts.length === 0 ? (
            <p className="txn-empty">Sin datos en el período.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={topProducts}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={45}
                  paddingAngle={2}
                >
                  {topProducts.map((_, i) => (
                    <Cell key={i} fill={PIE[i % PIE.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatARS(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
}
