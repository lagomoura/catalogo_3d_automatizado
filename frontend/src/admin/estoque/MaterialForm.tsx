import { useEffect, useState } from "react";
import { Modal } from "../../components/Modal";
import type {
  Material,
  MaterialCreatePayload,
  MaterialKind,
  MaterialUpdatePayload,
} from "../../types";

interface Props {
  open: boolean;
  material?: Material | null;
  onClose: () => void;
  onCreate: (payload: MaterialCreatePayload) => Promise<void>;
  onUpdate: (id: number, payload: MaterialUpdatePayload) => Promise<void>;
}

const TYPES: MaterialKind[] = ["PLA", "PETG", "ABS", "TPU", "RESIN", "OTRO"];

const initialState = (m: Material | null | undefined) => ({
  name: m?.name ?? "",
  type: (m?.type ?? "PLA") as MaterialKind,
  color: m?.color ?? "",
  brand: m?.brand ?? "",
  model: m?.model ?? "",
  stock_g: m ? "" : "0",
  cost_per_g: m?.cost_per_g?.toString() ?? "0",
  notes: m?.notes ?? "",
});

const toNumberOrNull = (v: string): number | null => {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function MaterialForm({
  open,
  material,
  onClose,
  onCreate,
  onUpdate,
}: Props) {
  const isEdit = !!material;
  const [form, setForm] = useState(() => initialState(material));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setForm(initialState(material));
  }, [open, material?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (isEdit && material) {
        const payload: MaterialUpdatePayload = {
          name: form.name.trim(),
          type: form.type,
          color: form.color.trim() || null,
          brand: form.brand.trim() || null,
          model: form.model.trim() || null,
          cost_per_g: toNumberOrNull(form.cost_per_g) ?? 0,
          notes: form.notes.trim() || null,
        };
        await onUpdate(material.id, payload);
      } else {
        const payload: MaterialCreatePayload = {
          name: form.name.trim(),
          type: form.type,
          color: form.color.trim() || null,
          brand: form.brand.trim() || null,
          model: form.model.trim() || null,
          stock_g: toNumberOrNull(form.stock_g) ?? 0,
          cost_per_g: toNumberOrNull(form.cost_per_g) ?? 0,
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
    <Modal open={open} onClose={onClose} size="md" labelledBy="material-form-title">
      <form onSubmit={handleSubmit}>
        <Modal.Header onClose={onClose} id="material-form-title">
          {isEdit ? "Editar material" : "Novo material"}
        </Modal.Header>
        <Modal.Body>
          <div className="form-grid">
            <label className="field field--full">
              Nombre *
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                autoFocus
                placeholder="ej. PLA Branco 3D Fila"
              />
            </label>
            <label className="field">
              Tipo
              <select
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value as MaterialKind })
                }
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Color
              <input
                type="text"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                placeholder="branco / negro / rojo…"
              />
            </label>
            <label className="field">
              Marca
              <input
                type="text"
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                placeholder="3D Fila"
              />
            </label>
            <label className="field">
              Modelo / línea
              <input
                type="text"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder="HD / Pro / Silk…"
              />
            </label>
            {!isEdit ? (
              <label className="field">
                Stock inicial (g)
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.stock_g}
                  onChange={(e) =>
                    setForm({ ...form, stock_g: e.target.value })
                  }
                />
              </label>
            ) : null}
            <label className="field">
              Costo por gramo (ARS)
              <input
                type="number"
                step="0.0001"
                min="0"
                value={form.cost_per_g}
                onChange={(e) =>
                  setForm({ ...form, cost_per_g: e.target.value })
                }
              />
            </label>
            <label className="field field--full">
              Notas
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Perfil de impresión, temperatura, observaciones…"
              />
            </label>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          {isEdit ? (
            <p className="form-hint">
              Para cambiar el stock usá un movimiento (IN / OUT / ADJUST) — así
              queda auditado.
            </p>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting
              ? "Guardando…"
              : isEdit
                ? "Guardar"
                : "Cadastrar material"}
          </button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
