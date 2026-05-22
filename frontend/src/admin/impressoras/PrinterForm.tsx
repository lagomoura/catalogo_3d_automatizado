import { useEffect, useState } from "react";
import { Modal } from "../../components/Modal";
import type {
  Printer,
  PrinterCreatePayload,
  PrinterUpdatePayload,
} from "../../types";

interface Props {
  open: boolean;
  /** When provided, the form is in "edit" mode. */
  printer?: Printer | null;
  onClose: () => void;
  onCreate: (payload: PrinterCreatePayload) => Promise<void>;
  onUpdate: (id: number, payload: PrinterUpdatePayload) => Promise<void>;
}

const initialState = (printer: Printer | null | undefined) => ({
  name: printer?.name ?? "",
  brand: printer?.brand ?? "",
  model: printer?.model ?? "",
  environment: printer?.environment ?? "",
  purchase_cost: printer?.purchase_cost?.toString() ?? "",
  purchase_date: printer?.purchase_date ?? "",
  kwh_cost: printer?.kwh_cost?.toString() ?? "",
  cost_per_hour: printer?.cost_per_hour?.toString() ?? "0",
  notes: printer?.notes ?? "",
});

const toNumberOrNull = (v: string): number | null => {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function PrinterForm({
  open,
  printer,
  onClose,
  onCreate,
  onUpdate,
}: Props) {
  const isEdit = !!printer;
  const [form, setForm] = useState(() => initialState(printer));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed the form whenever a different printer (or none) becomes editable.
  useEffect(() => {
    if (open) setForm(initialState(printer));
  }, [open, printer?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload: PrinterCreatePayload = {
        name: form.name.trim(),
        brand: form.brand.trim() || null,
        model: form.model.trim() || null,
        environment: form.environment.trim() || null,
        purchase_cost: toNumberOrNull(form.purchase_cost),
        purchase_date: form.purchase_date || null,
        kwh_cost: toNumberOrNull(form.kwh_cost),
        cost_per_hour: toNumberOrNull(form.cost_per_hour) ?? 0,
        notes: form.notes.trim() || null,
      };
      if (isEdit && printer) {
        await onUpdate(printer.id, payload);
      } else {
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
    <Modal open={open} onClose={onClose} size="md" labelledBy="printer-form-title">
      <form onSubmit={handleSubmit}>
        <Modal.Header onClose={onClose} id="printer-form-title">
          {isEdit ? "Editar impressora" : "Nova impressora"}
        </Modal.Header>
        <Modal.Body>
          <div className="form-grid">
            <label className="field field--full">
              Nome *
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                autoFocus
                placeholder="ej. Bambu X1C taller"
              />
            </label>
            <label className="field">
              Marca
              <input
                type="text"
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                placeholder="Bambu Lab"
              />
            </label>
            <label className="field">
              Modelo
              <input
                type="text"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder="X1 Carbon"
              />
            </label>
            <label className="field">
              Ambiente
              <input
                type="text"
                value={form.environment}
                onChange={(e) =>
                  setForm({ ...form, environment: e.target.value })
                }
                placeholder="taller, casa, oficina…"
              />
            </label>
            <label className="field">
              Costo por hora (ARS)
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.cost_per_hour}
                onChange={(e) =>
                  setForm({ ...form, cost_per_hour: e.target.value })
                }
                placeholder="0.00"
              />
            </label>
            <label className="field">
              Costo de kWh
              <input
                type="number"
                step="0.0001"
                min="0"
                value={form.kwh_cost}
                onChange={(e) => setForm({ ...form, kwh_cost: e.target.value })}
                placeholder="ej. 0.12"
              />
            </label>
            <label className="field">
              Costo de compra
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.purchase_cost}
                onChange={(e) =>
                  setForm({ ...form, purchase_cost: e.target.value })
                }
                placeholder="0.00"
              />
            </label>
            <label className="field">
              Fecha de compra
              <input
                type="date"
                value={form.purchase_date}
                onChange={(e) =>
                  setForm({ ...form, purchase_date: e.target.value })
                }
              />
            </label>
            <label className="field field--full">
              Notas
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Calibración, perfiles, observaciones…"
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
            {submitting ? "Guardando…" : isEdit ? "Guardar" : "Cadastrar impressora"}
          </button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
