/** Atajos de período para los selectores de fecha del control de caja. */

export interface Range {
  start: string;
  end: string;
}

export type PresetKey = "hoy" | "semana" | "mes" | "anio" | "todo";

function iso(d: Date): string {
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}

export function presetRange(key: PresetKey): Range {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (key) {
    case "hoy":
      return { start: iso(now), end: iso(now) };
    case "semana": {
      // Semana corriente, lunes a domingo.
      const day = (now.getDay() + 6) % 7;
      const monday = new Date(y, m, now.getDate() - day);
      const sunday = new Date(y, m, now.getDate() - day + 6);
      return { start: iso(monday), end: iso(sunday) };
    }
    case "mes":
      return { start: iso(new Date(y, m, 1)), end: iso(new Date(y, m + 1, 0)) };
    case "anio":
      return { start: iso(new Date(y, 0, 1)), end: iso(new Date(y, 11, 31)) };
    case "todo":
    default:
      return { start: "", end: "" };
  }
}

export const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "hoy", label: "Hoy" },
  { key: "semana", label: "Semana" },
  { key: "mes", label: "Mes" },
  { key: "anio", label: "Año" },
  { key: "todo", label: "Todo" },
];

/** Detecta qué preset (si alguno) coincide exactamente con un rango dado. */
export function matchPreset(r: Range): PresetKey | null {
  for (const { key } of PRESETS) {
    const p = presetRange(key);
    if (p.start === r.start && p.end === r.end) return key;
  }
  return null;
}
