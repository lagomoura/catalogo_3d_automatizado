import { useCallback, useEffect, useState } from "react";
import {
  createRecurring,
  deleteRecurring,
  getRecurring,
  postRecurring,
  updateRecurring,
} from "../../api/client";
import type { RecurringExpense, TxCategory } from "../../types";
import { formatARS, todayISO } from "../../utils/format";

const NEW_CAT = "__new__";

interface Props {
  categories: TxCategory[];
  onCreateCategory: (name: string) => Promise<TxCategory>;
  onPosted?: () => void;
}

export function RecurringExpenses({
  categories,
  onCreateCategory,
  onPosted,
}: Props) {
  const [items, setItems] = useState<RecurringExpense[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [postDate, setPostDate] = useState(todayISO());

  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [day, setDay] = useState("");

  const debitCategories = categories.filter(
    (c) => c.kind === "debit" && !c.archived,
  );

  const refresh = useCallback(async () => {
    try {
      setItems(await getRecurring());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCategorySelect = async (value: string) => {
    if (value !== NEW_CAT) {
      setCategoryId(value);
      return;
    }
    const name = window.prompt("Nueva categoría de egreso");
    if (!name || !name.trim()) return;
    try {
      const created = await onCreateCategory(name.trim());
      setCategoryId(String(created.id));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo crear la categoría",
      );
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!concept.trim() || !Number.isFinite(amt) || amt <= 0) {
      setError("Concepto y monto válido son obligatorios");
      return;
    }
    if (!categoryId) {
      setError("Elegí una categoría para el gasto fijo");
      return;
    }
    setBusy(true);
    try {
      await createRecurring({
        concept: concept.trim(),
        amount: amt,
        category_id: Number(categoryId),
        day_of_month: day ? Number(day) : null,
      });
      setConcept("");
      setAmount("");
      setCategoryId("");
      setDay("");
      setError(null);
      await refresh();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  const post = async (id: number) => {
    setBusy(true);
    try {
      await postRecurring(id, postDate);
      onPosted?.();
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar");
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (r: RecurringExpense) => {
    await updateRecurring(r.id, { active: !r.active });
    await refresh();
  };

  const remove = async (r: RecurringExpense) => {
    if (!window.confirm(`¿Eliminar el gasto fijo "${r.concept}"?`)) return;
    await deleteRecurring(r.id);
    await refresh();
  };

  return (
    <section className="txn-section">
      {error && <p className="error-banner">{error}</p>}

      <form className="caja-form" onSubmit={add}>
        <div className="caja-form__head">
          <h3>Nuevo gasto fijo</h3>
        </div>
        <div className="caja-form__grid">
          <div className="field">
            <label htmlFor="rec-concept">Concepto</label>
            <input
              id="rec-concept"
              type="text"
              placeholder="Alquiler, Internet…"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="rec-amount">Monto (ARS)</label>
            <input
              id="rec-amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="rec-cat">Categoría *</label>
            <select
              id="rec-cat"
              value={categoryId}
              onChange={(e) => void handleCategorySelect(e.target.value)}
            >
              <option value="">— Elegí una categoría —</option>
              {debitCategories.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
              <option value={NEW_CAT}>＋ Nueva categoría…</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="rec-day">Día del mes (opcional)</label>
            <input
              id="rec-day"
              type="number"
              min="1"
              max="31"
              placeholder="Ej: 5"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            />
          </div>
        </div>
        <div className="caja-form__actions">
          <button type="submit" className="btn btn--primary" disabled={busy}>
            Agregar
          </button>
        </div>
      </form>

      <div className="txn-toolbar">
        <h3>Gastos fijos</h3>
        <label className="hint">
          Registrar en fecha:{" "}
          <input
            type="date"
            value={postDate}
            onChange={(e) => setPostDate(e.target.value)}
          />
        </label>
      </div>

      {items.length === 0 ? (
        <p className="txn-empty">Todavía no cargaste gastos fijos.</p>
      ) : (
        <div className="txn-table txn-table--rec" role="table">
          <div className="txn-row txn-row--head" role="row">
            <span>Concepto</span>
            <span>Categoría</span>
            <span>Día</span>
            <span className="txn-amount-col">Monto</span>
            <span />
          </div>
          {items.map((r) => (
            <div
              className={`txn-row ${r.active ? "" : "txn-row--off"}`}
              role="row"
              key={r.id}
            >
              <span data-label="Concepto">{r.concept}</span>
              <span data-label="Categoría">
                {r.category ? <span className="tag">{r.category}</span> : "—"}
              </span>
              <span data-label="Día">{r.day_of_month ?? "—"}</span>
              <span data-label="Monto" className="txn-amount-col txn-amount is-debit">
                {formatARS(r.amount)}
              </span>
              <span className="txn-actions">
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  disabled={busy}
                  onClick={() => post(r.id)}
                >
                  Registrar
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => toggle(r)}
                >
                  {r.active ? "Pausar" : "Activar"}
                </button>
                <button
                  type="button"
                  className="btn btn--danger btn--sm"
                  onClick={() => remove(r)}
                >
                  Borrar
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
