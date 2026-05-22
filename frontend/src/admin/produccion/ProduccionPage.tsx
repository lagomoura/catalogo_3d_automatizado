import { useCallback, useEffect, useMemo, useState } from "react";
import {
  cancelProductionRun,
  createProductionRun,
  deleteProductionRun,
  finishProductionRun,
  getMaterials,
  getPrinters,
  getProductionRuns,
  getProductionSummary,
  pauseProductionRun,
  resumeProductionRun,
  startProductionRun,
  updateProductionRun,
} from "../../api/client";
import { KpiCard } from "../../components/KpiCard";
import type {
  Material,
  Printer,
  ProductionRun,
  ProductionRunCreatePayload,
  ProductionRunUpdatePayload,
  ProductionStatus,
  ProductionSummary,
} from "../../types";
import { ProductionRunForm } from "./ProductionRunForm";
import "./produccion.css";

type SubTab =
  | "geral"
  | "pendentes"
  | "em_produccion"
  | "pausadas"
  | "concluidas"
  | "canceladas";

const SUBTABS: { key: SubTab; label: string; statuses: ProductionStatus[] }[] = [
  { key: "geral", label: "Geral", statuses: [] }, // [] = mostrar todos
  { key: "pendentes", label: "Pendientes", statuses: ["PENDENTE"] },
  {
    key: "em_produccion",
    label: "En producción",
    statuses: ["EM_PRODUCAO"],
  },
  { key: "pausadas", label: "Pausadas", statuses: ["PAUSADA"] },
  { key: "concluidas", label: "Concluidas", statuses: ["CONCLUIDA"] },
  { key: "canceladas", label: "Canceladas", statuses: ["CANCELADA"] },
];

const STATUS_LABEL: Record<ProductionStatus, string> = {
  PENDENTE: "Pendiente",
  EM_PRODUCAO: "En producción",
  PAUSADA: "Pausada",
  CONCLUIDA: "Concluida",
  CANCELADA: "Cancelada",
};

export function ProduccionPage() {
  const [runs, setRuns] = useState<ProductionRun[]>([]);
  const [summary, setSummary] = useState<ProductionSummary | null>(null);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [tab, setTab] = useState<SubTab>("geral");
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductionRun | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [list, sum] = await Promise.all([
        getProductionRuns(),
        getProductionSummary(),
      ]);
      setRuns(list);
      setSummary(sum);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar producciones");
    }
  }, []);

  useEffect(() => {
    void refresh();
    void getPrinters().then(setPrinters).catch(() => {});
    void getMaterials().then(setMaterials).catch(() => {});
  }, [refresh]);

  // Tick para que el "tempo restante" se refresque sin pedirle al backend.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Pull silencioso cada 30s (refleja runs iniciadas/paused en otra pestaña).
  useEffect(() => {
    const id = window.setInterval(() => {
      void refresh();
    }, 30000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const filteredRuns = useMemo(() => {
    const subtab = SUBTABS.find((s) => s.key === tab)!;
    if (subtab.statuses.length === 0) return runs;
    return runs.filter((r) => subtab.statuses.includes(r.status));
  }, [runs, tab]);

  const handleCreate = async (payload: ProductionRunCreatePayload) => {
    await createProductionRun(payload);
    await refresh();
  };

  const handleUpdate = async (
    id: number,
    payload: ProductionRunUpdatePayload,
  ) => {
    await updateProductionRun(id, payload);
    await refresh();
  };

  const runAction = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error en la acción");
    }
  };

  return (
    <div className="produccion">
      <header className="produccion__header">
        <div>
          <p className="produccion__eyebrow">Panel</p>
          <h2>Producción</h2>
          <p className="produccion__subtitle">
            Registrá y acompañá impresiones: status, tempos y costos en el mismo
            flujo.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          + Registrar producción
        </button>
      </header>

      <section className="produccion__kpi-grid">
        <KpiCard label="Total" value={summary?.total ?? "—"} tone="neutral" />
        <KpiCard
          label="En producción"
          value={summary?.em_producao ?? "—"}
          tone="orange"
        />
        <KpiCard
          label="Pausadas"
          value={summary?.pausada ?? "—"}
          tone="blue"
        />
        <KpiCard
          label="Concluidas"
          value={summary?.concluida ?? "—"}
          tone="green"
        />
      </section>

      {error ? <p className="error-banner">{error}</p> : null}

      <nav className="produccion__subtabs" role="tablist">
        {SUBTABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`produccion__subtab ${
              tab === t.key ? "produccion__subtab--active" : ""
            }`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="produccion__table" role="table">
        <div className="produccion__row produccion__row--head" role="row">
          <span>Pieza</span>
          <span>Pedido</span>
          <span>Tag</span>
          <span>Impressora</span>
          <span>Status</span>
          <span>Tiempo restante</span>
          <span>Acciones</span>
        </div>
        {filteredRuns.length === 0 ? (
          <div className="produccion__empty">No hay producciones en esta vista.</div>
        ) : (
          filteredRuns.map((r) => (
            <ProductionRow
              key={r.id}
              run={r}
              now={now}
              onStart={() => runAction(() => startProductionRun(r.id))}
              onPause={() => runAction(() => pauseProductionRun(r.id))}
              onResume={() => runAction(() => resumeProductionRun(r.id))}
              onFinish={() => runAction(() => finishProductionRun(r.id))}
              onCancel={() => runAction(() => cancelProductionRun(r.id))}
              onEdit={() => {
                setEditing(r);
                setFormOpen(true);
              }}
              onDelete={() =>
                confirm("¿Eliminar esta producción del historial?") &&
                runAction(() => deleteProductionRun(r.id))
              }
            />
          ))
        )}
      </div>

      <ProductionRunForm
        open={formOpen}
        run={editing}
        printers={printers}
        materials={materials}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />
    </div>
  );
}

interface RowProps {
  run: ProductionRun;
  now: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ProductionRow({
  run,
  now,
  onStart,
  onPause,
  onResume,
  onFinish,
  onCancel,
  onEdit,
  onDelete,
}: RowProps) {
  const remaining = computeRemainingSeconds(run, now);

  return (
    <div
      className={`produccion__row produccion__row--${run.status.toLowerCase()}`}
      role="row"
    >
      <span>
        <strong>{run.piece_name}</strong>
        {run.grams != null ? (
          <span className="produccion__row-sub">
            {run.grams.toLocaleString("es-AR")} g
            {run.estimated_minutes != null
              ? ` · ${run.estimated_minutes} min`
              : ""}
          </span>
        ) : run.estimated_minutes != null ? (
          <span className="produccion__row-sub">{run.estimated_minutes} min</span>
        ) : null}
      </span>
      <span>{run.order ? `#${run.order.id}` : "—"}</span>
      <span>
        {run.tag ? <span className="produccion__pill">{run.tag}</span> : "—"}
      </span>
      <span>{run.printer?.name ?? "—"}</span>
      <span className={`produccion__status produccion__status--${run.status.toLowerCase()}`}>
        {STATUS_LABEL[run.status]}
      </span>
      <span className="produccion__remaining">
        {formatRemaining(remaining, run.status)}
      </span>
      <span className="produccion__actions">
        {run.status === "PENDENTE" && (
          <button type="button" className="tbtn tbtn--go" onClick={onStart}>
            Iniciar
          </button>
        )}
        {run.status === "EM_PRODUCAO" && (
          <>
            <button type="button" className="tbtn" onClick={onPause}>
              Pausar
            </button>
            <button type="button" className="tbtn tbtn--go" onClick={onFinish}>
              Finalizar
            </button>
          </>
        )}
        {run.status === "PAUSADA" && (
          <>
            <button type="button" className="tbtn tbtn--go" onClick={onResume}>
              Reanudar
            </button>
            <button type="button" className="tbtn" onClick={onFinish}>
              Finalizar
            </button>
          </>
        )}
        {(run.status === "PENDENTE" ||
          run.status === "EM_PRODUCAO" ||
          run.status === "PAUSADA") && (
          <button type="button" className="tbtn tbtn--danger" onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button type="button" className="tbtn tbtn--edit" onClick={onEdit}>
          Editar
        </button>
        {(run.status === "CONCLUIDA" || run.status === "CANCELADA") && (
          <button type="button" className="tbtn tbtn--danger" onClick={onDelete}>
            ✕
          </button>
        )}
      </span>
    </div>
  );
}

/**
 * Segundos restantes de la corrida en función del estado:
 * - PENDENTE: estimated_minutes × 60 (si lo hay), si no null.
 * - EM_PRODUCAO: started_at + estimated × 60 + total_paused - now.
 * - PAUSADA: igual a EM_PRODUCAO pero usando paused_at (congelado).
 * - CONCLUIDA / CANCELADA: null.
 */
function computeRemainingSeconds(
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

function formatRemaining(
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
