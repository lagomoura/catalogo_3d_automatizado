import { useEffect, useState } from "react";
import { Modal } from "../../components/Modal";
import type {
  Material,
  Printer,
  ProductionRun,
  ProductionRunCreatePayload,
  ProductionRunUpdatePayload,
} from "../../types";

interface Props {
  open: boolean;
  run?: ProductionRun | null;
  printers: Printer[];
  materials: Material[];
  onClose: () => void;
  onCreate: (payload: ProductionRunCreatePayload) => Promise<void>;
  onUpdate: (id: number, payload: ProductionRunUpdatePayload) => Promise<void>;
}

const initialState = (r: ProductionRun | null | undefined) => ({
  piece_name: r?.piece_name ?? "",
  tag: r?.tag ?? "",
  printer_id: r?.printer?.id ?? null,
  material_id: r?.material?.id ?? null,
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
  materials,
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
          material_id: form.material_id,
          clear_material: form.material_id === null,
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
          material_id: form.material_id,
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

  return (
    <Modal open={open} onClose={onClose} size="md" labelledBy="run-form-title">
      <form onSubmit={handleSubmit}>
        <Modal.Header onClose={onClose} id="run-form-title">
          {isEdit ? "Editar producción" : "Registrar producción"}
        </Modal.Header>
        <Modal.Body>
          <div className="form-grid">
            <label className="field field--full">
              Pieza *
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
            <label className="field">
              Tag
              <input
                type="text"
                value={form.tag}
                onChange={(e) => setForm({ ...form, tag: e.target.value })}
                placeholder="calibración / lote A / muestra"
              />
            </label>
            <label className="field">
              Impresora
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
                {printers
                  .filter((p) => !p.archived)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="field">
              Material
              <select
                value={form.material_id ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    material_id: e.target.value
                      ? Number(e.target.value)
                      : null,
                  })
                }
              >
                <option value="">— Sin asignar —</option>
                {materials
                  .filter((m) => !m.archived)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} · {m.type}
                    </option>
                  ))}
              </select>
            </label>
            <label className="field">
              Tiempo estimado (minutos)
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
            </label>
            <label className="field">
              Gramos
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.grams}
                onChange={(e) => setForm({ ...form, grams: e.target.value })}
                placeholder="ej. 35.5"
              />
            </label>
            <label className="field field--full">
              Notas
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Observaciones, parámetros, perfil…"
              />
            </label>
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
