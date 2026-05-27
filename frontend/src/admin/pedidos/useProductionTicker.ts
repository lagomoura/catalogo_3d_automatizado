import { useEffect, useState } from "react";
import type { ProductionRun, ProductionStatus } from "../../types";

export function useProductionTicker() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return { now };
}

/**
 * Segundos restantes de la corrida en función del estado:
 * - PENDENTE: estimated_minutes × 60 (si lo hay), si no null.
 * - EM_PRODUCAO: started_at + estimated × 60 + total_paused - now.
 * - PAUSADA: igual a EM_PRODUCAO pero usando paused_at (congelado).
 * - CONCLUIDA / CANCELADA: null.
 */
export function computeRemainingSeconds(
  run: ProductionRun,
  now: number,
): number | null {
  if (run.estimated_minutes == null) return null;
  const totalSec = run.estimated_minutes * 60;
  if (run.status === "PENDENTE") return totalSec;
  if (run.status === "CONCLUIDA" || run.status === "CANCELADA") return null;
  if (run.started_at == null) return totalSec;

  const startedMs = new Date(run.started_at).getTime();
  const pausedAccum = run.total_paused_seconds * 1000;
  const effectiveNow =
    run.status === "PAUSADA" && run.paused_at != null
      ? new Date(run.paused_at).getTime()
      : now;
  const elapsedSec = Math.max(
    0,
    Math.floor((effectiveNow - startedMs - pausedAccum) / 1000),
  );
  return totalSec - elapsedSec;
}

export function formatRemaining(
  seconds: number | null,
  status: ProductionStatus,
): string {
  if (status === "CONCLUIDA") return "✓";
  if (status === "CANCELADA") return "—";
  if (seconds == null) return "—";
  const sign = seconds < 0 ? "+" : "";
  const abs = Math.abs(seconds);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  if (h > 0) return `${sign}${h}h ${m.toString().padStart(2, "0")}m`;
  return `${sign}${m}m ${s.toString().padStart(2, "0")}s`;
}
