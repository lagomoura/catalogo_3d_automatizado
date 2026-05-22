import type { ReactNode } from "react";

export type KpiTone =
  | "neutral"
  | "blue"
  | "green"
  | "orange"
  | "red"
  | "purple";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: KpiTone;
  /** Optional small delta string shown next to the value (e.g., "+12%"). */
  delta?: ReactNode;
}

export function KpiCard({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  delta,
}: KpiCardProps) {
  return (
    <div className={`kpi-card kpi-card--${tone}`}>
      <div className="kpi-card__row">
        <span className="kpi-card__label">{label}</span>
        {icon ? <span className="kpi-card__icon">{icon}</span> : null}
      </div>
      <div className="kpi-card__value">
        <span>{value}</span>
        {delta ? <span className="kpi-card__delta">{delta}</span> : null}
      </div>
      {hint ? <div className="kpi-card__hint">{hint}</div> : null}
    </div>
  );
}
