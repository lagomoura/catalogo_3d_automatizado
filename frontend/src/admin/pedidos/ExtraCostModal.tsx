import { useEffect, useMemo, useState } from "react";
import type { Order } from "../../types";
import { formatARS } from "../../utils/format";
import {
  breakdownToCostItems,
  computeProfitability,
  computeQuote,
  round2,
  type QuotePiece,
} from "../calculadora/calc";
import { loadConfig } from "../calculadora/storage";

interface Props {
  order: Order;
  busy?: boolean;
  onClose: () => void;
  /** Recibe el costo extra ya resuelto. per_unit=false lo decide el caller. */
  onSubmit: (item: { concept: string; amount: number }) => Promise<void> | void;
}

const numOr0 = (s: string): number => {
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

/**
 * Modal para agregar un costo extra (típicamente una reimpresión) a un pedido
 * ya iniciado. Calcula el costo con la misma fórmula de impresión pero SIN
 * margen de ganancia (es costo puro), o permite cargar un monto manual.
 * El costo es único del pedido: NO se le cobra al cliente ni toca la caja.
 */
export function ExtraCostModal({ order, busy, onClose, onSubmit }: Props) {
  const [manual, setManual] = useState(false);
  const [manualAmount, setManualAmount] = useState("");
  const [note, setNote] = useState("");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [grams, setGrams] = useState("");
  const [supplies, setSupplies] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Desglose del costo calculado (sin margen): suma de los conceptos reales.
  const calc = useMemo(() => {
    const piece: QuotePiece = {
      pieceName: "",
      printHours: numOr0(hours),
      printMinutes: numOr0(minutes),
      grams: numOr0(grams),
      extraSupplies: numOr0(supplies),
      profitMultiplier: 4, // irrelevante: no se aplica margen al costo
    };
    const breakdown = computeQuote(loadConfig(), piece);
    const items = breakdownToCostItems(breakdown);
    const total = round2(items.reduce((a, b) => a + b.amount, 0));
    return { items, total };
  }, [hours, minutes, grams, supplies]);

  const amount = manual ? round2(numOr0(manualAmount)) : calc.total;
  const concept = `Reimpresión${note.trim() ? ` – ${note.trim()}` : ""}`.slice(
    0,
    120,
  );

  // Vista previa de la ganancia del pedido con este costo extra incluido.
  const prof = useMemo(() => {
    const items = order.cost_items.map((c) => ({
      amount: c.amount,
      per_unit: c.per_unit,
    }));
    items.push({ amount, per_unit: false });
    return computeProfitability(items, order.quantity, order.value ?? null);
  }, [order, amount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(amount > 0)) {
      setError("El costo debe ser mayor a 0");
      return;
    }
    setError(null);
    try {
      await onSubmit({ concept, amount });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo agregar el costo",
      );
    }
  };

  return (
    <div
      className="order-modal"
      role="dialog"
      aria-modal="true"
      aria-label={`Costo extra · pedido #${order.id}`}
      onClick={onClose}
    >
      <form
        className="caja-form order-modal__panel"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="caja-form__head">
          <h3>
            Costo extra · pedido #{order.id}
            <span className="order-modal__product">
              {order.catalog_item?.name ?? "(producto eliminado)"}
            </span>
          </h3>
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <p className="hint">
          Reimpresión / costo extra. Se suma como costo único del pedido (no
          ×cantidad), sin margen. No se le cobra al cliente ni toca la caja.
        </p>

        <div className="field">
          <label htmlFor="extra-note">Nota</label>
          <input
            id="extra-note"
            type="text"
            placeholder="Ej: tapa rota"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="priority-seg" role="group" aria-label="Modo de costo">
          <button
            type="button"
            className={`priority-seg__btn ${!manual ? "is-active" : ""}`}
            onClick={() => setManual(false)}
          >
            Calcular
          </button>
          <button
            type="button"
            className={`priority-seg__btn ${manual ? "is-active" : ""}`}
            onClick={() => setManual(true)}
          >
            Monto manual
          </button>
        </div>

        {manual ? (
          <div className="field">
            <label htmlFor="extra-manual">Costo ($)</label>
            <input
              id="extra-manual"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="0"
              value={manualAmount}
              onChange={(e) => setManualAmount(e.target.value)}
            />
          </div>
        ) : (
          <>
            <div className="caja-form__grid">
              <div className="field">
                <label htmlFor="extra-h">Horas</label>
                <input
                  id="extra-h"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  placeholder="0"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="extra-m">Minutos</label>
                <input
                  id="extra-m"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  placeholder="0"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="extra-g">Gramos</label>
                <input
                  id="extra-g"
                  type="number"
                  min="0"
                  step="0.1"
                  inputMode="decimal"
                  placeholder="0"
                  value={grams}
                  onChange={(e) => setGrams(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="extra-s">Insumos extra ($)</label>
                <input
                  id="extra-s"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0"
                  value={supplies}
                  onChange={(e) => setSupplies(e.target.value)}
                />
              </div>
            </div>

            <div className="cost-editor">
              {calc.items.length === 0 && (
                <p className="hint">
                  Cargá horas / gramos para calcular el costo.
                </p>
              )}
              {calc.items.map((c) => (
                <div className="profit__row" key={c.concept}>
                  <span>{c.concept}</span>
                  <strong>{formatARS(c.amount)}</strong>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="profit" data-tone={prof.profit >= 0 ? "ok" : "bad"}>
          <div className="profit__row">
            <span>Costo extra a sumar</span>
            <strong>{formatARS(amount)}</strong>
          </div>
          <div className="profit__row">
            <span>Costo total del pedido ({prof.quantity} u)</span>
            <strong>{formatARS(prof.totalCost)}</strong>
          </div>
          <div className="profit__row profit__row--main">
            <span>Ganancia resultante</span>
            <strong>
              {formatARS(prof.profit)}
              {prof.marginPct != null && (
                <em className="profit__pct"> · {prof.marginPct}%</em>
              )}
            </strong>
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="caja-form__actions">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onClose}
            disabled={busy}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn--primary"
            disabled={busy || !(amount > 0)}
          >
            {busy ? "Agregando…" : "Agregar costo extra"}
          </button>
        </div>
      </form>
    </div>
  );
}
