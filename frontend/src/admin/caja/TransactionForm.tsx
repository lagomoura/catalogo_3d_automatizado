import { useEffect, useMemo, useState } from "react";
import type {
  CashTransactionPayload,
  CashTransactionUpdatePayload,
} from "../../api/client";
import type {
  CashTransaction,
  CatalogItem,
  Contact,
  TransactionKind,
  TxCategory,
} from "../../types";
import { todayISO } from "../../utils/format";
import { ContactPicker, type PersonValue } from "./ContactPicker";

const NONE = "";
const NEW_CAT = "__new__";

interface Props {
  catalog: CatalogItem[];
  contacts: Contact[];
  categories: TxCategory[];
  editing: CashTransaction | null;
  onCreate: (p: CashTransactionPayload) => Promise<void>;
  onUpdate: (id: number, p: CashTransactionUpdatePayload) => Promise<void>;
  onCancelEdit: () => void;
  onCreateCategory: (
    name: string,
    kind: TransactionKind,
  ) => Promise<TxCategory>;
}

export function TransactionForm({
  catalog,
  contacts,
  categories,
  editing,
  onCreate,
  onUpdate,
  onCancelEdit,
  onCreateCategory,
}: Props) {
  const [kind, setKind] = useState<TransactionKind>("credit");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState("");
  const [productId, setProductId] = useState<string>(NONE);
  const [categoryId, setCategoryId] = useState<string>(NONE);
  const [person, setPerson] = useState<PersonValue>({
    contactId: null,
    personLabel: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) return;
    setKind(editing.kind);
    setAmount(String(editing.amount));
    setDate(editing.occurred_on.slice(0, 10));
    setDescription(editing.description ?? "");
    setProductId(editing.catalog_item ? String(editing.catalog_item.id) : NONE);
    setCategoryId(editing.category_id ? String(editing.category_id) : NONE);
    setPerson({
      contactId: editing.contact?.id ?? null,
      personLabel: editing.contact?.name ?? editing.person_label ?? "",
    });
  }, [editing]);

  const reset = () => {
    setKind("credit");
    setAmount("");
    setDate(todayISO());
    setDescription("");
    setProductId(NONE);
    setCategoryId(NONE);
    setPerson({ contactId: null, personLabel: "" });
    setError(null);
  };

  const sortedCatalog = useMemo(
    () => [...catalog].sort((a, b) => a.name.localeCompare(b.name)),
    [catalog],
  );
  const kindCategories = useMemo(
    () => categories.filter((c) => c.kind === kind && !c.archived),
    [categories, kind],
  );

  // Si cambia el tipo, una categoría del tipo anterior deja de ser válida.
  useEffect(() => {
    if (categoryId === NONE || categoryId === NEW_CAT) return;
    if (!kindCategories.some((c) => String(c.id) === categoryId)) {
      setCategoryId(NONE);
    }
  }, [kindCategories, categoryId]);

  const handleCategorySelect = async (value: string) => {
    if (value !== NEW_CAT) {
      setCategoryId(value);
      return;
    }
    const name = window.prompt(
      kind === "credit"
        ? "Nueva categoría de ingreso"
        : "Nueva categoría de egreso",
    );
    if (!name || !name.trim()) return;
    try {
      const created = await onCreateCategory(name.trim(), kind);
      setCategoryId(String(created.id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo crear la categoría",
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Ingresá un monto válido mayor a 0");
      return;
    }
    if (!date) {
      setError("Elegí una fecha");
      return;
    }

    const catalogId =
      kind === "credit" && productId !== NONE ? Number(productId) : null;
    const catId =
      categoryId !== NONE && categoryId !== NEW_CAT
        ? Number(categoryId)
        : null;

    if (kind === "credit" && catalogId === null) {
      setError("Elegí el producto vendido (cada ingreso es una venta)");
      return;
    }
    if (kind === "debit" && catId === null) {
      setError("Elegí una categoría para el egreso");
      return;
    }

    const personLabel = person.personLabel.trim();

    setBusy(true);
    setError(null);
    try {
      if (editing) {
        const payload: CashTransactionUpdatePayload = {
          kind,
          amount: amt,
          occurred_on: date,
          description: description.trim() || null,
        };
        if (catalogId !== null) payload.catalog_item_id = catalogId;
        else payload.clear_catalog_item = true;
        if (catId !== null) payload.category_id = catId;
        else payload.clear_category = true;
        if (person.contactId !== null) payload.contact_id = person.contactId;
        else if (personLabel) payload.person_label = personLabel;
        else payload.clear_contact = true;
        await onUpdate(editing.id, payload);
      } else {
        const payload: CashTransactionPayload = {
          kind,
          amount: amt,
          occurred_on: date,
          description: description.trim() || null,
          catalog_item_id: catalogId,
          category_id: catId,
          contact_id: person.contactId,
          person_label: person.contactId === null ? personLabel || null : null,
          save_contact: true,
        };
        await onCreate(payload);
      }
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="caja-form" onSubmit={handleSubmit}>
      <div className="caja-form__head">
        <h3>{editing ? "Editar movimiento" : "Nuevo movimiento"}</h3>
        <div className="kind-toggle" role="group" aria-label="Tipo de movimiento">
          <button
            type="button"
            className={`kind-toggle__btn ${kind === "credit" ? "is-active is-credit" : ""}`}
            onClick={() => setKind("credit")}
          >
            ↑ Ingreso (venta)
          </button>
          <button
            type="button"
            className={`kind-toggle__btn ${kind === "debit" ? "is-active is-debit" : ""}`}
            onClick={() => setKind("debit")}
          >
            ↓ Egreso (gasto)
          </button>
        </div>
      </div>

      <div className="caja-form__grid">
        <div className="field">
          <label htmlFor="caja-amount">Monto (ARS)</label>
          <input
            id="caja-amount"
            type="number"
            min="0"
            step="0.01"
            placeholder="0,00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="caja-date">Fecha</label>
          <input
            id="caja-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {kind === "credit" && (
          <div className="field">
            <label htmlFor="caja-product">Producto vendido *</label>
            <select
              id="caja-product"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              <option value={NONE}>— Elegí un producto —</option>
              {sortedCatalog.map((it) => (
                <option key={it.id} value={String(it.id)}>
                  {it.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="field">
          <label htmlFor="caja-category">
            {kind === "credit" ? "Categoría (opcional)" : "Categoría *"}
          </label>
          <select
            id="caja-category"
            value={categoryId}
            onChange={(e) => void handleCategorySelect(e.target.value)}
          >
            <option value={NONE}>
              {kind === "credit" ? "— Sin categoría —" : "— Elegí una categoría —"}
            </option>
            {kindCategories.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
            <option value={NEW_CAT}>＋ Nueva categoría…</option>
          </select>
        </div>

        <ContactPicker contacts={contacts} value={person} onChange={setPerson} />

        <div className="field caja-form__desc">
          <label htmlFor="caja-desc">Descripción / notas</label>
          <input
            id="caja-desc"
            type="text"
            placeholder="Opcional"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="caja-form__actions">
        {editing && (
          <button
            type="button"
            className="btn"
            onClick={() => {
              reset();
              onCancelEdit();
            }}
            disabled={busy}
          >
            Cancelar
          </button>
        )}
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? "Guardando…" : editing ? "Guardar cambios" : "Registrar"}
        </button>
      </div>
    </form>
  );
}
