import { useEffect, useMemo, useState } from "react";
import { Modal } from "../../components/Modal";
import { loadConfig } from "../calculadora/storage";
import { formatARS } from "../../utils/format";
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
  power_watts: printer?.power_watts?.toString() ?? "",
  life_hours: printer?.life_hours?.toString() ?? "",
  spare_parts_cost: printer?.spare_parts_cost?.toString() ?? "",
  cost_per_hour: printer?.cost_per_hour?.toString() ?? "0",
  notes: printer?.notes ?? "",
});

const toNumberOrNull = (v: string): number | null => {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Modo inicial: si la impresora ya tiene los 3 inputs cargados o es nueva,
 *  arrancamos en automático. Si sólo tiene `cost_per_hour` (legacy), manual. */
const initialAutoMode = (printer: Printer | null | undefined): boolean => {
  if (!printer) return true;
  const hasInputs =
    (printer.power_watts ?? 0) > 0 &&
    (printer.life_hours ?? 0) > 0 &&
    (printer.spare_parts_cost ?? 0) > 0;
  if (hasInputs) return true;
  // Legacy: cargó cost_per_hour manualmente y no tiene los 3 inputs.
  if ((printer.cost_per_hour ?? 0) > 0) return false;
  return true;
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
  const [autoMode, setAutoMode] = useState(() => initialAutoMode(printer));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // El kWh vive en el config global de la calculadora — el cálculo automático
  // del costo/hora lo necesita. Lo releemos cada vez que abre el form para
  // reflejar cambios del usuario en la pestaña Configuración.
  const kwhPrice = useMemo(() => {
    if (!open) return 0;
    const cfg = loadConfig();
    return cfg.kwhPrice > 0 ? cfg.kwhPrice : 0;
  }, [open]);

  // Re-seed the form whenever a different printer (or none) becomes editable.
  useEffect(() => {
    if (open) {
      setForm(initialState(printer));
      setAutoMode(initialAutoMode(printer));
      setError(null);
    }
  }, [open, printer?.id]);

  // ---- Cálculo en vivo -----------------------------------------------------
  const watts = Number(form.power_watts);
  const lifeH = Number(form.life_hours);
  const sparesCost = Number(form.spare_parts_cost);
  const hasAllInputs =
    Number.isFinite(watts) && watts > 0 &&
    Number.isFinite(lifeH) && lifeH > 0 &&
    Number.isFinite(sparesCost) && sparesCost > 0 &&
    kwhPrice > 0;

  const energyPerHour = hasAllInputs ? (watts / 1000) * kwhPrice : 0;
  const wearPerHour = hasAllInputs ? sparesCost / lifeH : 0;
  const autoCostPerHour = energyPerHour + wearPerHour;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const powerWatts = toNumberOrNull(form.power_watts);
      const lifeHours = toNumberOrNull(form.life_hours);
      const sparePartsCost = toNumberOrNull(form.spare_parts_cost);
      // En modo automático con los 3 inputs cargados, pisamos cost_per_hour
      // con el cálculo. Si falta algún dato, conservamos lo que el form
      // tenía (puede ser 0 — caso inicial — o un valor manual previo).
      const computedCostPerHour =
        autoMode && hasAllInputs
          ? Math.round(autoCostPerHour * 100) / 100
          : toNumberOrNull(form.cost_per_hour) ?? 0;

      const payload: PrinterCreatePayload = {
        name: form.name.trim(),
        brand: form.brand.trim() || null,
        model: form.model.trim() || null,
        environment: form.environment.trim() || null,
        purchase_cost: toNumberOrNull(form.purchase_cost),
        purchase_date: form.purchase_date || null,
        power_watts: powerWatts,
        life_hours: lifeHours != null ? Math.round(lifeHours) : null,
        spare_parts_cost: sparePartsCost,
        cost_per_hour: computedCostPerHour,
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
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      labelledBy="printer-form-title"
      closeOnBackdrop={false}
      closeOnEscape={false}
    >
      <form onSubmit={handleSubmit}>
        <Modal.Header id="printer-form-title">
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
          </div>

          <div className="printer-cost-block">
            <div className="printer-cost-block__head">
              <div>
                <h4>Costo por hora</h4>
                <p className="printer-cost-block__hint">
                  {autoMode
                    ? "Lo calculamos desde el consumo, vida útil y repuestos."
                    : "Lo cargás a mano (modo manual)."}
                </p>
              </div>
              <button
                type="button"
                className="btn-link"
                onClick={() => setAutoMode((v) => !v)}
              >
                {autoMode ? "Ingresar manualmente" : "Volver al cálculo automático"}
              </button>
            </div>

            {autoMode ? (
              <>
                <div className="form-grid">
                  <label className="field">
                    Consumo (watts)
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={form.power_watts}
                      onChange={(e) =>
                        setForm({ ...form, power_watts: e.target.value })
                      }
                      placeholder="ej. 150"
                    />
                  </label>
                  <label className="field">
                    Vida útil (horas)
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={form.life_hours}
                      onChange={(e) =>
                        setForm({ ...form, life_hours: e.target.value })
                      }
                      placeholder="ej. 4400"
                    />
                  </label>
                  <label className="field">
                    Costo de repuestos (ARS)
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.spare_parts_cost}
                      onChange={(e) =>
                        setForm({ ...form, spare_parts_cost: e.target.value })
                      }
                      placeholder="ej. 150000"
                    />
                  </label>
                </div>

                <p className="printer-cost-block__kwh">
                  {kwhPrice > 0 ? (
                    <>
                      Precio del kWh: <strong>{formatARS(kwhPrice)}</strong>{" "}
                      (configurable en la calculadora &rsaquo; Configuración)
                    </>
                  ) : (
                    <>
                      Falta cargar el precio del kWh en la calculadora
                      &rsaquo; Configuración para poder calcular el costo
                      energético.
                    </>
                  )}
                </p>

                {hasAllInputs ? (
                  <dl className="printer-cost-breakdown">
                    <div>
                      <dt>⚡ Energía / hora</dt>
                      <dd>
                        {formatARS(energyPerHour)}{" "}
                        <span className="muted">
                          ({watts} W ÷ 1000 × {formatARS(kwhPrice)})
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt>🔧 Desgaste / hora</dt>
                      <dd>
                        {formatARS(wearPerHour)}{" "}
                        <span className="muted">
                          ({formatARS(sparesCost)} ÷ {lifeH} h)
                        </span>
                      </dd>
                    </div>
                    <div className="printer-cost-breakdown__total">
                      <dt>💰 Costo por hora</dt>
                      <dd>
                        <strong>{formatARS(autoCostPerHour)}</strong>
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="printer-cost-block__pending">
                    Completá consumo, vida útil y repuestos para ver el
                    cálculo automático.
                  </p>
                )}
              </>
            ) : (
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
            )}
          </div>

          <div className="form-grid">
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
