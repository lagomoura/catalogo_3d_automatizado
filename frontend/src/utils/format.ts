const currency = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
});

export function formatARS(value: number): string {
  return currency.format(value ?? 0);
}

const dateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** Formats an ISO date (YYYY-MM-DD) as DD/MM/YYYY without timezone drift. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("T")[0].split("-").map(Number);
  if (!y || !m || !d) return iso;
  return dateFmt.format(new Date(y, m - 1, d));
}

/** Today's date as YYYY-MM-DD in local time (for <input type="date"> defaults). */
export function todayISO(): string {
  const now = new Date();
  const off = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - off).toISOString().slice(0, 10);
}

/** "2026-05" -> "May 2026" (es-AR short month). */
export function formatMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  return new Intl.DateTimeFormat("es-AR", {
    month: "short",
    year: "numeric",
  }).format(new Date(y, m - 1, 1));
}
