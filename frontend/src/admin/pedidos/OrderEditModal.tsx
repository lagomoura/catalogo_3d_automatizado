import { useEffect, useMemo, useRef, useState } from "react";
import {
  getProductionRuns,
  type OrderCostItemInput,
  type OrderUpdatePayload,
} from "../../api/client";
import type { Contact, Order, OrderPriority } from "../../types";
import { formatARS } from "../../utils/format";
import { computeProfitability } from "../calculadora/calc";
import { ContactPicker, type PersonValue } from "../caja/ContactPicker";
import { ExtraCostModal } from "./ExtraCostModal";
import { useFocusTrap } from "../../hooks/useFocusTrap";

interface Props {
  order: Order;
  contacts: Contact[];
  onClose: () => void;
  onSave: (id: number, payload: OrderUpdatePayload) => Promise<void>;
  onSaveCosts: (id: number, items: OrderCostItemInput[]) => Promise<void>;
}

interface CostRow {
  concept: string;
  amount: string;
  /** true: costo por unidad (×cantidad). false: costo único del pedido. */
  perUnit: boolean;
}

const PRIORITIES: (OrderPriority | null)[] = [null, 1, 2, 3];

export function OrderEditModal({
  order,
  contacts,
  onClose,
  onSave,
  onSaveCosts,
}: Props) {
  const panelRef = useRef<HTMLFormElement | null>(null);
  const [quantity, setQuantity] = useState(order.quantity);
  const [value, setValue] = useState(
    order.value != null ? String(order.value) : "",
  );
  const [note, setNote] = useState(order.note ?? "");
  const [priority, setPriority] = useState<OrderPriority | null>(
    order.priority,
  );
  const [person, setPerson] = useState<PersonValue>({
    contactId: order.contact?.id ?? null,
    personLabel: order.contact?.name ?? order.person_label ?? "",
  });
  const [costRows, setCostRows] = useState<CostRow[]>(
    order.cost_items.map((c) => ({
      concept: c.concept,
      amount: String(c.amount),
      perUnit: c.per_unit,
    })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extraOpen, setExtraOpen] = useState(false);
  // El trap del modal de edición se desactiva mientras el modal anidado de
  // costo extra está abierto (si no, no se podría enfocar sus campos).
  useFocusTrap(!extraOpen, panelRef);
  // Conteo de producciones vinculadas al pedido (para validar bajada de qty).
  const [runsCount, setRunsCount] = useState<{
    total: number;
    started: number;
  } | null>(null);

  const paid = order.payment_status === "PAGADO";

  useEffect(() => {
    let cancelled = false;
    void getProductionRuns({ order_id: order.id })
      .then((runs) => {
        if (cancelled) return;
        const started = runs.filter((r) => r.status !== "PENDENTE").length;
        setRunsCount({ total: runs.length, started });
      })
      .catch(() => {
        // No bloqueamos el modal si Producción no responde: el backend igual
        // protege con 409 al guardar si la cantidad baja indebidamente.
      });
    return () => {
      cancelled = true;
    };
  }, [order.id]);

  const qtyBelowStarted =
    runsCount != null && quantity < runsCount.started;
  const qtyDropsPendentes =
    runsCount != null &&
    !qtyBelowStarted &&
    quantity < runsCount.total &&
    quantity < order.quantity;

  // Los conceptos per-unidad escalan con la cantidad; los fijos cuentan una vez.
  const prof = useMemo(() => {
    const items = costRows.map((r) => {
      const n = Number(r.amount);
      return {
        amount: Number.isFinite(n) && n >= 0 ? n : 0,
        per_unit: r.perUnit,
      };
    });
    const v = value.trim() === "" ? null : Number(value);
    return computeProfitability(
      items,
      quantity,
      v != null && Number.isFinite(v) ? v : null,
    );
  }, [costRows, quantity, value]);

  const patchCost = (i: number, patch: Partial<CostRow>) =>
    setCostRows((rows) =>
      rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    );
  const addCost = () =>
    setCostRows((rows) => [
      ...rows,
      { concept: "", amount: "", perUnit: true },
    ]);
  const removeCost = (i: number) =>
    setCostRows((rows) => rows.filter((_, idx) => idx !== i));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedValue = value.trim();
    const valueNum = trimmedValue ? Number(trimmedValue) : null;
    if (valueNum !== null && (!Number.isFinite(valueNum) || valueNum <= 0)) {
      setError("El valor debe ser un número mayor a 0");
      return;
    }
    if (valueNum === null && paid) {
      setError("Revertí el cobro antes de quitar el valor del pedido");
      return;
    }
    if (qtyBelowStarted) {
      setError(
        `Hay ${runsCount?.started} producciones ya iniciadas. ` +
          "Cancelalas desde el tablero de Producción antes de bajar la cantidad.",
      );
      return;
    }
    if (qtyDropsPendentes) {
      const toRemove = (runsCount?.total ?? 0) - quantity;
      const ok = window.confirm(
        `Se eliminarán ${toRemove} producción(es) pendiente(s) vinculada(s) ` +
          "a este pedido. ¿Continuar?",
      );
      if (!ok) return;
    }

    const payload: OrderUpdatePayload = {
      quantity,
      note: note.trim() || null,
    };

    if (valueNum === null) payload.clear_value = true;
    else payload.value = valueNum;

    if (priority === null) payload.clear_priority = true;
    else payload.priority = priority;

    if (person.contactId !== null) {
      payload.contact_id = person.contactId;
    } else {
      payload.clear_contact = true;
      payload.person_label = person.personLabel.trim() || null;
    }

    const costItems: OrderCostItemInput[] = [];
    for (const r of costRows) {
      const concept = r.concept.trim();
      const amt = Number(r.amount);
      if (!concept && !r.amount.trim()) continue; // fila vacía: se ignora
      if (!concept) {
        setError("Cada concepto de costo necesita un nombre");
        return;
      }
      if (!Number.isFinite(amt) || amt < 0) {
        setError(`Monto inválido en "${concept}"`);
        return;
      }
      costItems.push({ concept, amount: amt, per_unit: r.perUnit });
    }

    setBusy(true);
    setError(null);
    try {
      await onSave(order.id, payload);
      await onSaveCosts(order.id, costItems);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar el pedido",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div
      className="order-modal"
      role="dialog"
      aria-modal="true"
      aria-label={`Editar pedido #${order.id}`}
      onClick={onClose}
    >
      <form
        ref={panelRef}
        tabIndex={-1}
        className="caja-form order-modal__panel"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="caja-form__head">
          <h3>
            Editar pedido #{order.id}
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

        <div className="caja-form__grid">
          <div className="field">
            <label>Cantidad</label>
            <div className="qty-stepper">
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Menos"
              >
                −
              </button>
              <span className="qty-stepper__value">{quantity}</span>
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => setQuantity((q) => q + 1)}
                aria-label="Más"
              >
                +
              </button>
            </div>
            {runsCount != null && runsCount.total > 0 ? (
              <span
                className="hint"
                data-tone={qtyBelowStarted ? "bad" : undefined}
              >
                {runsCount.started > 0
                  ? `${runsCount.total} producción(es) vinculada(s) · ${runsCount.started} ya iniciada(s)`
                  : `${runsCount.total} producción(es) pendiente(s) vinculada(s)`}
                {qtyBelowStarted
                  ? ` — no podés bajar a ${quantity}`
                  : qtyDropsPendentes
                    ? ` — guardar eliminará ${runsCount.total - quantity}`
                    : null}
              </span>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="edit-value">Valor a cobrar</label>
            <input
              id="edit-value"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="Opcional"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            {paid && (
              <span className="hint">
                El pedido está cobrado: cambiar el valor ajusta el ingreso en
                caja.
              </span>
            )}
          </div>

          <div className="field">
            <label>Prioridad</label>
            <div className="priority-seg" role="group" aria-label="Prioridad">
              {PRIORITIES.map((p) => (
                <button
                  type="button"
                  key={p ?? "none"}
                  className={`priority-seg__btn ${
                    priority === p ? "is-active" : ""
                  }`}
                  data-prio={p ?? "none"}
                  onClick={() => setPriority(p)}
                >
                  {p === null ? "—" : `#${p}`}
                </button>
              ))}
            </div>
          </div>

          <ContactPicker
            contacts={contacts}
            value={person}
            onChange={setPerson}
          />

          <div className="field caja-form__desc">
            <label htmlFor="edit-note">Nota</label>
            <input
              id="edit-note"
              type="text"
              placeholder="Opcional"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <div className="cost-editor">
          <div className="cost-editor__head">
            <h4>Costos del pedido</h4>
            <span className="hint">
              "×u" = costo por unidad · "fijo" = único del pedido · no cambia
              el valor ni la caja
            </span>
          </div>

          {costRows.length === 0 && (
            <p className="hint">Sin conceptos de costo cargados.</p>
          )}

          {costRows.map((r, i) => (
            <div className="cost-editor__row" key={i}>
              <input
                type="text"
                aria-label="Concepto"
                placeholder="Concepto"
                value={r.concept}
                onChange={(e) => patchCost(i, { concept: e.target.value })}
              />
              <input
                type="number"
                aria-label="Monto"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="0"
                value={r.amount}
                onChange={(e) => patchCost(i, { amount: e.target.value })}
              />
              <button
                type="button"
                className="btn btn--sm btn--ghost cost-editor__scope"
                data-scope={r.perUnit ? "unit" : "order"}
                onClick={() => patchCost(i, { perUnit: !r.perUnit })}
                title={
                  r.perUnit
                    ? "Costo por unidad (se multiplica por la cantidad)"
                    : "Costo único del pedido (cuenta una sola vez)"
                }
              >
                {r.perUnit ? "×u" : "fijo"}
              </button>
              <button
                type="button"
                className="btn btn--sm btn--ghost"
                onClick={() => removeCost(i)}
                aria-label="Eliminar concepto"
              >
                ✕
              </button>
            </div>
          ))}

          <div className="cost-editor__foot">
            <div className="cost-editor__foot-actions">
              <button
                type="button"
                className="btn btn--sm btn--ghost"
                onClick={addCost}
              >
                + Agregar concepto
              </button>
              <button
                type="button"
                className="btn btn--sm btn--ghost"
                onClick={() => setExtraOpen(true)}
              >
                + Costo extra (reimpresión)
              </button>
            </div>
            <span className="cost-editor__sum">
              Costo unitario: <strong>{formatARS(prof.unitCost)}</strong>
            </span>
          </div>

          <div className="profit" data-tone={prof.profit >= 0 ? "ok" : "bad"}>
            <div className="profit__row">
              <span>Costo total ({prof.quantity} u)</span>
              <strong>{formatARS(prof.totalCost)}</strong>
            </div>
            <div className="profit__row">
              <span>Valor a cobrar</span>
              <strong>{formatARS(prof.revenue)}</strong>
            </div>
            <div className="profit__row profit__row--main">
              <span>Ganancia</span>
              <strong>
                {formatARS(prof.profit)}
                {prof.marginPct != null && (
                  <em className="profit__pct"> · {prof.marginPct}%</em>
                )}
              </strong>
            </div>
            <button
              type="button"
              className="btn btn--sm btn--ghost profit__action"
              onClick={() => setValue(String(prof.totalCost))}
              title="Iguala el valor a cobrar al costo total (margen 0)"
            >
              Igualar valor al costo total
            </button>
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
            disabled={busy || qtyBelowStarted}
          >
            {busy ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>
      </div>
      {extraOpen && (
        <ExtraCostModal
          order={order}
          onClose={() => setExtraOpen(false)}
          onSubmit={({ concept, amount }) => {
            setCostRows((rows) => [
              ...rows,
              { concept, amount: String(amount), perUnit: false },
            ]);
            setExtraOpen(false);
          }}
        />
      )}
    </>
  );
}
