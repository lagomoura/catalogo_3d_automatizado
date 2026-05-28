import type { BriefResponse } from "./types";

interface Props {
  brief: BriefResponse;
}

function formatMoney(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  return `${sign}$${abs.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

export function BriefingCard({ brief }: Props) {
  const s = brief.snapshot_summary;
  return (
    <div className="assistant-briefing">
      <div className="assistant-briefing__greeting">{brief.greeting}</div>

      <div className="assistant-briefing__kpis">
        <div className="assistant-briefing__kpi">
          <span className="assistant-briefing__kpi-value">
            {s.pedidos_activos}
          </span>
          <span className="assistant-briefing__kpi-label">activos</span>
        </div>
        <div
          className={`assistant-briefing__kpi ${
            s.atrasados > 0 ? "assistant-briefing__kpi--alert" : ""
          }`}
        >
          <span className="assistant-briefing__kpi-value">{s.atrasados}</span>
          <span className="assistant-briefing__kpi-label">atrasados</span>
        </div>
        <div className="assistant-briefing__kpi">
          <span className="assistant-briefing__kpi-value">
            {formatMoney(s.pendiente_cobro)}
          </span>
          <span className="assistant-briefing__kpi-label">por cobrar</span>
        </div>
        <div
          className={`assistant-briefing__kpi ${
            s.neto_30d < 0 ? "assistant-briefing__kpi--debit" : "assistant-briefing__kpi--credit"
          }`}
        >
          <span className="assistant-briefing__kpi-value">
            {formatMoney(s.neto_30d)}
          </span>
          <span className="assistant-briefing__kpi-label">neto 30d</span>
        </div>
      </div>

      {brief.highlights.length > 0 && (
        <ul className="assistant-briefing__highlights">
          {brief.highlights.map((h, i) => (
            <li
              key={h}
              style={{ animationDelay: `${0.15 + i * 0.08}s` }}
            >
              {h}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
