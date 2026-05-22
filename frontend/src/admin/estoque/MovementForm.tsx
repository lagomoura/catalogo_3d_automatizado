import { useEffect, useState } from "react";
import { Modal } from "../../components/Modal";
import type {
  Material,
  MaterialMovementCreatePayload,
  MaterialMovementKind,
} from "../../types";

interface Props {
  open: boolean;
  material: Material | null;
  onClose: () => void;
  onSubmit: (
    materialId: number,
    payload: MaterialMovementCreatePayload,
  ) => Promise<void>;
}

const KINDS: { value: MaterialMovementKind; label: string; hint: string }[] = [
  { value: "IN", label: "Ingreso (IN)", hint: "Sumá stock — compra, reposición." },
  { value: "OUT", label: "Egreso (OUT)", hint: "Restá stock — consumo." },
  {
    value: "ADJUST",
    label: "Ajuste (ADJUST)",
    hint: "Corrección manual del inventario. Aceptá delta negativo.",
  },
];

const today = () => new Date().toISOString().slice(0, 10);

export function MovementForm({ open, material, onClose, onSubmit }: Props) {
  const [kind, setKind] = useState<MaterialMovementKind>("IN");
  const [grams, setGrams] = useState("");
  const [occurredOn, setOccurredOn] = useState(today());
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setKind("IN");
      setGrams("");
      setOccurredOn(today());
      setNote("");
      setError(null);
    }
  }, [open, material?.id]);

  if (!material && open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(grams);
    if (!Number.isFinite(value) || value === 0) {
      setError("Indicá una cantidad en gramos.");
      return;
    }
    if (kind !== "ADJUST" && value <= 0) {
      setError("Para IN / OUT la cantidad debe ser positiva.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(material!.id, {
        kind,
        grams: value,
        occurred_on: occurredOn,
        note: note.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar.");
    } finally {
      setSubmitting(false);
    }
  };

  const currentHint = KINDS.find((k) => k.value === kind)?.hint;

  return (
    <Modal open={open} onClose={onClose} size="sm" labelledBy="mov-form-title">
      <form onSubmit={handleSubmit}>
        <Modal.Header onClose={onClose} id="mov-form-title">
          Movimiento — {material?.name}
        </Modal.Header>
        <Modal.Body>
          <p className="form-hint">
            Stock actual: <strong>{material?.stock_g.toLocaleString("es-AR")} g</strong>
          </p>
          <div className="form-grid">
            <label className="field field--full">
              Tipo
              <select
                value={kind}
                onChange={(e) =>
                  setKind(e.target.value as MaterialMovementKind)
                }
              >
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </label>
            {currentHint ? (
              <p className="form-hint field--full">{currentHint}</p>
            ) : null}
            <label className="field">
              Gramos
              <input
                type="number"
                step="0.01"
                value={grams}
                onChange={(e) => setGrams(e.target.value)}
                required
                placeholder={kind === "ADJUST" ? "ej. -25 / +50" : "ej. 1000"}
                autoFocus
              />
            </label>
            <label className="field">
              Fecha
              <input
                type="date"
                value={occurredOn}
                onChange={(e) => setOccurredOn(e.target.value)}
              />
            </label>
            <label className="field field--full">
              Nota
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Opcional — factura, motivo del ajuste, etc."
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
            {submitting ? "Registrando…" : "Registrar movimiento"}
          </button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
