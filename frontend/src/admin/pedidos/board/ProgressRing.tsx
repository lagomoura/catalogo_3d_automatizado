interface ProgressRingProps {
  /** Porcentaje 0–100. null = indeterminado (dasheado). */
  percent: number | null;
  size?: number;
  stroke?: number;
  label?: string;
}

export function ProgressRing({
  percent,
  size = 128,
  stroke = 10,
  label,
}: ProgressRingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const indeterminate = percent == null;
  const clamped = indeterminate ? 0 : Math.max(0, Math.min(100, percent));
  const offset = c - (clamped / 100) * c;

  return (
    <div
      className="pb-ring"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : clamped}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        {!indeterminate && (
          <circle
            className="pb-ring__bar"
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--st-ejecutando)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </svg>
      <div className="pb-ring__center">
        <span className="pb-ring__pct">
          {indeterminate ? "—" : `${Math.round(clamped)}%`}
        </span>
        {label && <span className="pb-ring__label">{label}</span>}
      </div>
    </div>
  );
}
