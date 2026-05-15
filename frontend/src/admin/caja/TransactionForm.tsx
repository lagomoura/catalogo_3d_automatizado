import { useEffect, useMemo, useState } from "react";
import type {
  CashTransactionPayload,
  CashTransactionUpdatePayload,
} from "../../api/client";
import type { CashTransaction, CatalogItem, Contact, TransactionKind } from "../../types";
import { todayISO } from "../../utils/format";
import { ContactPicker, type PersonValue } from "./ContactPicker";

const FREE = "__free__";
const NONE = "__none__";

interface Props {
  catalog: CatalogItem[];
  contacts: Contact[];
  editing: CashTransaction | null;
  onCreate: (p: CashTransactionPayload) => Promise<void>;
  onUpdate: (id: number, p: CashTransactionUpdatePayload) => Promise<void>;
  onCancelEdit: () => void;
}

export function TransactionForm({
  catalog,
  contacts,
  editing,
  onCreate,
  onUpdate,
  onCancelEdit,
}: Props) {
  const [kind, setKind] = useState<TransactionKind>("credit");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState("");
  const [productSel, setProductSel] = useState<string>(NONE);
  const [productFree, setProductFree] = useState("");
  const [person, setPerson] = useState<PersonValue>({
    contactId: null,
    personLabel: "",
    saveContact: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) return;
    setKind(editing.kind);
    setAmount(String(editing.amount));
    setDate(editing.occurred_on.slice(0, 10));
    setDescription(editing.description ?? "");
    if (editing.catalog_item) {
      setProductSel(String(editing.catalog_item.id));
      setProductFree("");
    } else if (editing.product_label) {
      setProductSel(FREE);
      setProductFree(editing.product_label);
    } else {
      setProductSel(NONE);
      setProductFree("");
    }
    setPerson({
      contactId: editing.contact?.id ?? null,
      personLabel: editing.contact?.name ?? editing.person_label ?? "",
      saveContact: false,
    });
  }, [editing]);

  const reset = () => {
    setKind("credit");
    setAmount("");
    setDate(todayISO());
    setDescription("");
    setProductSel(NONE);
    setProductFree("");
    setPerson({ contactId: null, personLabel: "", saveContact: false });
    setError(null);
  };

  const sortedCatalog = useMemo(
    () => [...catalog].sort((a, b) => a.name.localeCompare(b.name)),
    [catalog],
  );

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
      productSel !== FREE && productSel !== NONE ? Number(productSel) : null;
    const freeLabel = productSel === FREE ? productFree.trim() || null : null;
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
          product_label: freeLabel,
        };
        if (catalogId !== null) payload.catalog_item_id = catalogId;
        else payload.clear_catalog_item = true;
        if (person.contactId !== null) payload.contact_id = person.contactId;
        else payload.clear_contact = true;
        payload.person_label = person.contactId === null ? personLabel || null : null;
        await onUpdate(editing.id, payload);
      } else {
        const payload: CashTransactionPayload = {
          kind,
          amount: amt,
          occurred_on: date,
          description: description.trim() || null,
          product_label: freeLabel,
          catalog_item_id: catalogId,
          contact_id: person.contactId,
          person_label: person.contactId === null ? personLabel || null : null,
          save_contact: person.saveContact,
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
            ↑ Ingreso (cobro)
          </button>
          <button
            type="button"
            className={`kind-toggle__btn ${kind === "debit" ? "is-active is-debit" : ""}`}
            onClick={() => setKind("debit")}
          >
            ↓ Egreso (pago)
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

        <div className="field">
          <label htmlFor="caja-product">Producto cobrado / pagado</label>
          <select
            id="caja-product"
            value={productSel}
            onChange={(e) => setProductSel(e.target.value)}
          >
            <option value={NONE}>— Sin producto —</option>
            <option value={FREE}>✏️ Texto libre…</option>
            <optgroup label="Del catálogo">
              {sortedCatalog.map((it) => (
                <option key={it.id} value={String(it.id)}>
                  {it.name}
                </option>
              ))}
            </optgroup>
          </select>
          {productSel === FREE && (
            <input
              type="text"
              placeholder="Nombre del producto…"
              value={productFree}
              onChange={(e) => setProductFree(e.target.value)}
            />
          )}
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
