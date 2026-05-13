import type { Job } from "../types";

interface Props {
  jobs: Job[];
}

const STATUS_LABEL: Record<Job["status"], string> = {
  pending: "En cola",
  scraping: "Extrayendo datos",
  styling: "Estilizando con FLUX Kontext",
  generating_3d: "Generando vista 3D",
  done: "Listo",
  failed: "Fallado",
};

export function JobStatus({ jobs }: Props) {
  if (jobs.length === 0) return null;
  return (
    <section className="jobs">
      <h2>Procesando</h2>
      <ul>
        {jobs.map((job) => {
          const pct =
            job.progress.total > 0
              ? Math.round((job.progress.done / job.progress.total) * 100)
              : 0;
          return (
            <li key={job.job_id} className={`job job--${job.status}`}>
              <div className="job__head">
                <span className="job__url" title={job.url}>
                  {job.url}
                </span>
                <span className="job__status">{STATUS_LABEL[job.status]}</span>
              </div>
              <div className="job__bar">
                <div className="job__bar-fill" style={{ width: `${pct}%` }} />
              </div>
              {job.stage_detail && (
                <div className="job__detail">{job.stage_detail}</div>
              )}
              <div className="job__meta">
                {job.progress.done}/{job.progress.total} imágenes
              </div>
              {job.error && <div className="job__error">{job.error}</div>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
