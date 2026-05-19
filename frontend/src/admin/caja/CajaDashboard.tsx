import {
  Area,
  AreaChart,
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
import { formatARS, formatDate, formatMonth } from "../../utils/format";
import type { Range } from "./periods";
import { RangePicker } from "./RangePicker";

interface Props {
  summary: CashSummary | null;
  range: Range;
  onRangeChange: (r: Range) => void;
}

const CREDIT = "#059669";
const DEBIT = "#dc2626";
const PIE = ["#2563eb", "#059669", "#d97706", "#7c3aed", "#dc2626", "#0891b2", "#db2777", "#65a30d"];

function Delta({ now, prev }: { now: number; prev: number }) {
  if (prev === 0) return null;
  const pct = ((now - prev) / Math.abs(prev)) * 100;
  const up = pct >= 0;
  return (
    <span className={`delta ${up ? "delta--up" : "delta--down"}`}>
      {up ? "▲" : "▼"} {Math.abs(pct).toFixed(0)}% vs período anterior
    </span>
  );
}

export function CajaDashboard({ summary, range, onRangeChange }: Props) {
  const s = summary;
  const monthly = s?.monthly.map((m) => ({ ...m, label: formatMonth(m.month) })) ?? [];
  const daily =
    s?.daily.map((d) => ({ ...d, label: formatDate(d.day) })) ?? [];
  const topProducts = (s?.by_product ?? [])
    .map((p) => ({ name: p.label, value: p.credit + p.debit }))
    .filter((p) => p.value > 0)
    .slice(0, 7);
  const expenseCats = (s?.by_category ?? [])
    .filter((c) => c.debit > 0)
    .map((c) => ({ name: c.category, value: c.debit }))
    .slice(0, 8);
  const topContacts = (s?.by_contact ?? [])
    .filter((c) => c.credit > 0)
    .slice(0, 7)
    .map((c) => ({ name: c.contact, Ingresos: c.credit }));

  return (
    <section className="caja-dash">
      <div className="caja-dash__head">
        <RangePicker range={range} onChange={onRangeChange} />
      </div>

      <div className="stat-grid">
        <div className="stat-card stat-card--balance">
          <span className="stat-card__label">Saldo real</span>
          <span className="stat-card__value">{formatARS(s?.balance ?? 0)}</span>
          <span className="stat-card__sub">
            Inicial {formatARS(s?.opening_balance ?? 0)}
          </span>
        </div>
        <div className="stat-card stat-card--credit">
          <span className="stat-card__label">Ingresos</span>
          <span className="stat-card__value">
            {formatARS(s?.total_credit ?? 0)}
          </span>
          {s?.previous && (
            <Delta now={s.total_credit} prev={s.previous.total_credit} />
          )}
        </div>
        <div className="stat-card stat-card--debit">
          <span className="stat-card__label">Egresos</span>
          <span className="stat-card__value">
            {formatARS(s?.total_debit ?? 0)}
          </span>
          {s?.previous && (
            <Delta now={s.total_debit} prev={s.previous.total_debit} />
          )}
        </div>
        <div
          className={`stat-card ${
            (s?.net ?? 0) >= 0 ? "stat-card--credit" : "stat-card--debit"
          }`}
        >
          <span className="stat-card__label">Neto del período</span>
          <span className="stat-card__value">{formatARS(s?.net ?? 0)}</span>
          <span className="stat-card__sub">{s?.count ?? 0} movimientos</span>
        </div>
      </div>

      {(s?.accounts.length ?? 0) > 0 && (
        <div className="acct-strip">
          {s!.accounts.map((a) => (
            <div className="acct-chip" key={a.account_id}>
              <span className="acct-chip__name">{a.name}</span>
              <span className="acct-chip__bal">{formatARS(a.balance)}</span>
              <span className="acct-chip__flow">
                <span className="is-credit">+{formatARS(a.credit)}</span>{" "}
                <span className="is-debit">−{formatARS(a.debit)}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="chart-card chart-card--wide">
        <h4>Flujo de caja acumulado</h4>
        {daily.length === 0 ? (
          <p className="txn-empty">Sin datos en el período.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={daily}>
              <defs>
                <linearGradient id="flowFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="label" fontSize={11} />
              <YAxis
                fontSize={11}
                width={70}
                tickFormatter={(v) => formatARS(Number(v))}
              />
              <Tooltip formatter={(v) => formatARS(Number(v))} />
              <Area
                type="monotone"
                dataKey="cumulative"
                name="Saldo acumulado"
                stroke="#2563eb"
                strokeWidth={2}
                fill="url(#flowFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
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
                <Bar dataKey="credit" name="Ingresos" fill={CREDIT} radius={[4, 4, 0, 0]} />
                <Bar dataKey="debit" name="Egresos" fill={DEBIT} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-card">
          <h4>Egresos por categoría</h4>
          {expenseCats.length === 0 ? (
            <p className="txn-empty">Sin egresos categorizados.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={expenseCats}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={45}
                  paddingAngle={2}
                >
                  {expenseCats.map((_, i) => (
                    <Cell key={i} fill={PIE[i % PIE.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatARS(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-card">
          <h4>Top clientes (ingresos)</h4>
          {topContacts.length === 0 ? (
            <p className="txn-empty">Sin datos en el período.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topContacts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis
                  type="number"
                  fontSize={11}
                  tickFormatter={(v) => formatARS(Number(v))}
                />
                <YAxis type="category" dataKey="name" width={110} fontSize={11} />
                <Tooltip formatter={(v) => formatARS(Number(v))} />
                <Bar dataKey="Ingresos" fill={CREDIT} radius={[0, 4, 4, 0]} />
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
