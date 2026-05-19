import { matchPreset, PRESETS, presetRange, type Range } from "./periods";

interface Props {
  range: Range;
  onChange: (r: Range) => void;
}

/** Atajos de período + selección manual de fechas, reutilizable. */
export function RangePicker({ range, onChange }: Props) {
  const active = matchPreset(range);
  return (
    <div className="caja-range">
      <div className="preset-row" role="group" aria-label="Período">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            className={`preset-chip ${
              active === p.key ? "preset-chip--active" : ""
            }`}
            onClick={() => onChange(presetRange(p.key))}
          >
            {p.label}
          </button>
        ))}
      </div>
      <label>
        Desde
        <input
          type="date"
          value={range.start}
          onChange={(e) => onChange({ ...range, start: e.target.value })}
        />
      </label>
      <label>
        Hasta
        <input
          type="date"
          value={range.end}
          onChange={(e) => onChange({ ...range, end: e.target.value })}
        />
      </label>
    </div>
  );
}
