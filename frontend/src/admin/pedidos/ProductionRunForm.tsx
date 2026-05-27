import { useEffect, useState } from "react";
import { Modal } from "../../components/Modal";
import type {
  Printer,
  ProductionRun,
  ProductionRunCreatePayload,
  ProductionRunUpdatePayload,
} from "../../types";

interface Props {
  open: boolean;
  run?: ProductionRun | null;
  printers: Printer[];
  onClose: () => void;
  onCreate: (payload: ProductionRunCreatePayload) => Promise<void>;
  onUpdate: (id: number, payload: ProductionRunUpdatePayload) => Promise<void>;
}

const initialState = (r: ProductionRun | null | undefined) => ({
  piece_name: r?.piece_name ?? "",
  tag: r?.tag ?? "",
  printer_id: r?.printer?.id ?? null,
  estimated_minutes: r?.estimated_minutes?.toString() ?? "",
  grams: r?.grams?.toString() ?? "",
  notes: r?.notes ?? "",
});

const toIntOrNull = (v: string): number | null => {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const toFloatOrNull = (v: string): number | null => {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export function ProductionRunForm({
  open,
  run,
  printers,
  onClose,
  onCreate,
  onUpdate,
}: Props) {
  const isEdit = !!run;
  const [form, setForm] = useState(() => initialState(run));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(initialState(run));
      setError(null);
    }
  }, [open, run?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.piece_name.trim()) {
      setError("El nombre de la pieza es obligatorio.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (isEdit && run) {
        const payload: ProductionRunUpdatePayload = {
          piece_name: form.piece_name.trim(),
          tag: form.tag.trim() || null,
          printer_id: form.printer_id,
          clear_printer: form.printer_id === null,
          estimated_minutes: toIntOrNull(form.estimated_minutes),
          clear_estimated: form.estimated_minutes.trim() === "",
          grams: toFloatOrNull(form.grams),
          clear_grams: form.grams.trim() === "",
          notes: form.notes.trim() || null,
        };
        await onUpdate(run.id, payload);
      } else {
        const payload: ProductionRunCreatePayload = {
          piece_name: form.piece_name.trim(),
          tag: form.tag.trim() || null,
          printer_id: form.printer_id,
          estimated_minutes: toIntOrNull(form.estimated_minutes),
          grams: toFloatOrNull(form.grams),
          notes: form.notes.trim() || null,
        };
        await onCreate(payload);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSubmitting(false);
    }
  };

  const activePrinters = printers.filter((p) => !p.archived);

  return (
    <Modal open={open} onClose={onClose} size="md" labelledBy="run-form-title">
      <form onSubmit={handleSubmit} className="production-form">
        <Modal.Header onClose={onClose} id="run-form-title">
          {isEdit ? "Editar producción" : "Registrar producción"}
        </Modal.Header>
        <Modal.Body>
          <div className="production-form__sections">
            <section className="production-form__section">
              <p className="production-form__eyebrow">Identificación</p>
              <div className="form-grid">
                <label className="field field--full field--hero">
                  Pieza
                  <span className="field__required" aria-hidden="true">*</span>
                  <input
                    type="text"
                    value={form.piece_name}
                    onChange={(e) =>
                      setForm({ ...form, piece_name: e.target.value })
                    }
                    required
                    autoFocus
                    placeholder="ej. Llavero rojo cliente X"
                  />
                </label>
                <label className="field field--full">
                  Tag
                  <input
                    type="text"
                    value={form.tag}
                    onChange={(e) => setForm({ ...form, tag: e.target.value })}
                    placeholder="calibración / lote A / muestra"
                  />
                </label>
              </div>
            </section>

            <section className="production-form__section">
              <p className="production-form__eyebrow">Impresora</p>
              <div className="form-grid">
                <label className="field field--full">
                  <span className="visually-hidden">Impresora</span>
                  <select
                    value={form.printer_id ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        printer_id: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
                  >
                    <option value="">— Sin asignar —</option>
                    {activePrinters.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {activePrinters.length === 0 ? (
                    <p className="production-form__hint">
                      No hay impresoras activas — podés dejarla sin asignar.
                    </p>
                  ) : null}
                </label>
              </div>
            </section>

            <section className="production-form__section">
              <p className="production-form__eyebrow">Parámetros</p>
              <div className="form-grid">
                <label className="field">
                  Tiempo estimado
                  <span className="field__affix">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={form.estimated_minutes}
                      onChange={(e) =>
                        setForm({ ...form, estimated_minutes: e.target.value })
                      }
                      placeholder="ej. 90"
                    />
                    <span className="field__affix-unit">min</span>
                  </span>
                </label>
                <label className="field">
                  Cantidad de material
                  <span className="field__affix">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={form.grams}
                      onChange={(e) =>
                        setForm({ ...form, grams: e.target.value })
                      }
                      placeholder="ej. 35.5"
                    />
                    <span className="field__affix-unit">g</span>
                  </span>
                </label>
              </div>
            </section>

            <section className="production-form__section">
              <p className="production-form__eyebrow">Notas</p>
              <div className="form-grid">
                <label className="field field--full">
                  <span className="visually-hidden">Notas</span>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Observaciones, parámetros, perfil…"
                  />
                </label>
              </div>
            </section>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
        </Modal.Body>
        <Modal.Footer>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "Guardando…" : isEdit ? "Guardar" : "Registrar producción"}
          </button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
