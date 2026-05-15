import { useMemo, useState } from "react";
import { resolveStorageUrl, type OrderCreatePayload } from "../../api/client";
import type { CatalogItem, Contact, OrderPriority } from "../../types";
import { ContactPicker, type PersonValue } from "../caja/ContactPicker";

interface Props {
  catalog: CatalogItem[];
  contacts: Contact[];
  onCreate: (p: OrderCreatePayload) => Promise<void>;
}

const PRIORITIES: (OrderPriority | null)[] = [null, 1, 2, 3];

export function OrderForm({ catalog, contacts, onCreate }: Props) {
  const [catalogId, setCatalogId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [priority, setPriority] = useState<OrderPriority | null>(null);
  const [person, setPerson] = useState<PersonValue>({
    contactId: null,
    personLabel: "",
    saveContact: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedCatalog = useMemo(
    () => [...catalog].sort((a, b) => a.name.localeCompare(b.name)),
    [catalog],
  );

  const reset = () => {
    setCatalogId(null);
    setQuantity(1);
    setNote("");
    setPriority(null);
    setPerson({ contactId: null, personLabel: "", saveContact: false });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (catalogId === null) {
      setError("Elegí un producto del catálogo (es obligatorio)");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onCreate({
        catalog_item_id: catalogId,
        quantity,
        note: note.trim() || null,
        contact_id: person.contactId,
        person_label:
          person.contactId === null ? person.personLabel.trim() || null : null,
        save_contact: person.saveContact,
        priority,
      });
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el pedido");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="caja-form pedido-form" onSubmit={handleSubmit}>
      <div className="caja-form__head">
        <h3>Nuevo pedido</h3>
      </div>

      <div className="field">
        <label>Producto (tocá una tarjeta)</label>
        <div className="product-picker-grid">
          {sortedCatalog.map((it) => {
            const cover = it.images[0];
            const selected = it.id === catalogId;
            return (
              <button
                type="button"
                key={it.id}
                className={`product-pick-card ${selected ? "is-selected" : ""}`}
                onClick={() => setCatalogId(selected ? null : it.id)}
                aria-pressed={selected}
              >
                {cover ? (
                  <img
                    src={resolveStorageUrl(cover.styled_url || cover.original_url)}
                    alt={it.name}
                    loading="lazy"
                  />
                ) : (
                  <div className="product-pick-card__ph">Sin imagen</div>
                )}
                <span className="product-pick-card__name">{it.name}</span>
              </button>
            );
          })}
          {sortedCatalog.length === 0 && (
            <p className="hint">No hay productos en el catálogo todavía.</p>
          )}
        </div>
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
        </div>

        <div className="field">
          <label>Prioridad</label>
          <div className="priority-seg" role="group" aria-label="Prioridad">
            {PRIORITIES.map((p) => (
              <button
                type="button"
                key={p ?? "none"}
                className={`priority-seg__btn ${priority === p ? "is-active" : ""}`}
                onClick={() => setPriority(p)}
              >
                {p === null ? "—" : `#${p}`}
              </button>
            ))}
          </div>
        </div>

        <ContactPicker contacts={contacts} value={person} onChange={setPerson} />

        <div className="field caja-form__desc">
          <label htmlFor="pedido-note">Nota</label>
          <input
            id="pedido-note"
            type="text"
            placeholder="Opcional"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="caja-form__actions">
        <button
          type="submit"
          className="btn btn--primary"
          disabled={busy || catalogId === null}
        >
          {busy ? "Creando…" : "Crear pedido"}
        </button>
      </div>
    </form>
  );
}
