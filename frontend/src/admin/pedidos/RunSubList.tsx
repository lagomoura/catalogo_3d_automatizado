import type { ProductionRun, ProductionStatus } from "../../types";
import {
  computeRemainingSeconds,
  formatRemaining,
} from "./useProductionTicker";

const STATUS_LABEL: Record<ProductionStatus, string> = {
  PENDENTE: "Pendiente",
  EM_PRODUCAO: "Imprimiendo",
  PAUSADA: "Pausada",
  CONCLUIDA: "Terminada",
  CANCELADA: "Cancelada",
};

interface RunSubListProps {
  runs: ProductionRun[];
  now: number;
  onRunStart: (id: number) => void;
  onRunPause: (id: number) => void;
  onRunResume: (id: number) => void;
  onRunFinish: (id: number) => void;
  onRunCancel: (id: number) => void;
  onRunReopen: (id: number) => void;
  onRunEdit: (run: ProductionRun) => void;
  onRunDelete: (id: number) => void;
  onRunCreate: () => void;
}

export function RunSubList({
  runs,
  now,
  onRunStart,
  onRunPause,
  onRunResume,
  onRunFinish,
  onRunCancel,
  onRunReopen,
  onRunEdit,
  onRunDelete,
  onRunCreate,
}: RunSubListProps) {
  return (
    <div className="ticket__runs">
      {runs.length === 0 ? (
        <p className="ticket__runs-empty">Sin producciones aún.</p>
      ) : (
        <ul className="ticket__runs-list">
          {runs.map((r) => (
            <RunRow
              key={r.id}
              run={r}
              now={now}
              onStart={() => onRunStart(r.id)}
              onPause={() => onRunPause(r.id)}
              onResume={() => onRunResume(r.id)}
              onFinish={() => onRunFinish(r.id)}
              onCancel={() => onRunCancel(r.id)}
              onReopen={() => onRunReopen(r.id)}
              onEdit={() => onRunEdit(r)}
              onDelete={() => onRunDelete(r.id)}
            />
          ))}
        </ul>
      )}
      <button
        type="button"
        className="tbtn tbtn--edit ticket__runs-add"
        onClick={onRunCreate}
      >
        ＋ Agregar producción
      </button>
    </div>
  );
}

interface RunRowProps {
  run: ProductionRun;
  now: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onCancel: () => void;
  onReopen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function RunRow({
  run,
  now,
  onStart,
  onPause,
  onResume,
  onFinish,
  onCancel,
  onReopen,
  onEdit,
  onDelete,
}: RunRowProps) {
  const remaining = computeRemainingSeconds(run, now);

  return (
    <li
      className={`ticket__run-row ticket__run-row--${run.status.toLowerCase()}`}
    >
      <span className="ticket__run-row__name">
        <strong>{run.piece_name}</strong>
        {run.tag ? <span className="run-pill">{run.tag}</span> : null}
        {run.printer?.name ? (
          <span className="ticket__run-row__printer">· {run.printer.name}</span>
        ) : null}
      </span>
      <span
        className={`run-status run-status--${run.status.toLowerCase()}`}
      >
        {STATUS_LABEL[run.status]}
      </span>
      <span className="run-remaining">
        {formatRemaining(remaining, run.status)}
      </span>
      <span className="ticket__run-row__actions">
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
        {(run.status === "CONCLUIDA" || run.status === "CANCELADA") && (
          <button type="button" className="tbtn" onClick={onReopen}>
            Reabrir
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
    </li>
  );
}
