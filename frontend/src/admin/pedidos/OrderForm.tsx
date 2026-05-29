import { useEffect, useMemo, useState } from "react";
import { resolveStorageUrl, type OrderCreatePayload } from "../../api/client";
import type {
  CatalogItem,
  Contact,
  Order,
  OrderPriority,
  PendingQuote,
} from "../../types";
import { formatARS } from "../../utils/format";
import { ContactPicker, type PersonValue } from "../caja/ContactPicker";

interface Props {
  catalog: CatalogItem[];
  contacts: Contact[];
  onCreate: (p: OrderCreatePayload) => Promise<Order>;
  pendingQuote?: PendingQuote | null;
  onPendingQuoteConsumed?: () => void;
  /**
   * Disparado cuando el usuario quiere ir a la Calculadora para cotizar
   * el producto seleccionado (Fase A: el snapshot de costos es obligatorio).
   */
  onCotizarInCalculadora?: (catalogItemId: number | null) => void;
}

const PRIORITIES: (OrderPriority | null)[] = [null, 1, 2, 3];

export function OrderForm({
  catalog,
  contacts,
  onCreate,
  pendingQuote,
  onPendingQuoteConsumed,
  onCotizarInCalculadora,
}: Props) {
  const [catalogId, setCatalogId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [priority, setPriority] = useState<OrderPriority | null>(null);
  const [deadline, setDeadline] = useState("");
  const [quoteCosts, setQuoteCosts] = useState<
    PendingQuote["costItems"] | null
  >(null);

  // Cuando llega una cotización de la calculadora, precarga el valor a cobrar
  // y retiene los conceptos de costo para snapshotearlos al crear el pedido.
  useEffect(() => {
    if (!pendingQuote) return;
    setValue(String(pendingQuote.value));
    setQuantity(Math.max(1, Math.floor(pendingQuote.quantity || 1)));
    setQuoteCosts(pendingQuote.costItems);
    // Orçamento → Pedido también precarga cliente y nota:
    if (pendingQuote.client_contact_id) {
      const c = contacts.find((x) => x.id === pendingQuote.client_contact_id);
      setPerson({
        contactId: pendingQuote.client_contact_id,
        personLabel: c?.name ?? "",
      });
    }
    if (pendingQuote.service_description) {
      setNote(pendingQuote.service_description);
    }
  }, [pendingQuote, contacts]);
  const [person, setPerson] = useState<PersonValue>({
    contactId: null,
    personLabel: "",
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
    setValue("");
    setNote("");
    setPriority(null);
    setDeadline("");
    setPerson({ contactId: null, personLabel: "" });
    setQuoteCosts(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (catalogId === null) {
      setError("Elegí un producto del catálogo (es obligatorio)");
      return;
    }
    const trimmedValue = value.trim();
    const valueNum = trimmedValue ? Number(trimmedValue) : null;
    if (valueNum !== null && (!Number.isFinite(valueNum) || valueNum <= 0)) {
      setError("El valor debe ser un número mayor a 0");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Consumo de material POR UNIDAD: el backend lo stampa en cada
      // ProductionRun y descuenta el stock al INICIAR cada pieza (no al crear
      // el pedido), devolviéndolo si se cancela. Las cotizaciones modernas usan
      // `materials[]` (multi-color); las viejas mandan `materialId` +
      // `gramsPerUnit` y caemos a una sola línea.
      const materialLines: { material_id: number; grams_per_unit: number }[] = [];
      if (pendingQuote?.materials && pendingQuote.materials.length > 0) {
        for (const m of pendingQuote.materials) {
          if (m.materialId && (m.gramsPerUnit || 0) > 0) {
            materialLines.push({
              material_id: m.materialId,
              grams_per_unit: m.gramsPerUnit,
            });
          }
        }
      } else if (
        pendingQuote?.materialId &&
        (pendingQuote.gramsPerUnit ?? 0) > 0
      ) {
        materialLines.push({
          material_id: pendingQuote.materialId,
          grams_per_unit: pendingQuote.gramsPerUnit as number,
        });
      }

      await onCreate({
        catalog_item_id: catalogId,
        quantity,
        value: valueNum,
        note: note.trim() || null,
        contact_id: person.contactId,
        person_label:
          person.contactId === null ? person.personLabel.trim() || null : null,
        save_contact: true,
        priority,
        deadline: deadline || null,
        cost_items: quoteCosts ?? undefined,
        materials: materialLines.length > 0 ? materialLines : undefined,
        quote_id: pendingQuote?.source_quote_id ?? null,
        // Propaga el tiempo por pieza a las ProductionRun que el backend genera.
        estimated_minutes_per_unit:
          pendingQuote?.estimatedMinutesPerUnit ?? null,
      });

      reset();
      onPendingQuoteConsumed?.();
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

      {quoteCosts && (
        <div className="quote-banner">
          <div className="quote-banner__main">
            <strong>Cotización cargada</strong>
            <span className="hint">
              {quantity} u · total {formatARS(Number(value) || 0)} ·{" "}
              {quoteCosts.length} conceptos de costo (por unidad) se guardarán
              con el pedido
            </span>
          </div>
          <button
            type="button"
            className="btn btn--sm btn--ghost"
            onClick={() => {
              setQuoteCosts(null);
              onPendingQuoteConsumed?.();
            }}
          >
            Descartar
          </button>
        </div>
      )}

      {!quoteCosts && onCotizarInCalculadora && (
        <div className="quote-banner quote-banner--alert">
          <div className="quote-banner__main">
            <strong>Cotizá el producto antes de crear el pedido</strong>
            <span className="hint">
              Para que cada pedido tenga sus costos snapshoteados (control
              financiero confiable), pasalo por la Calculadora.
            </span>
          </div>
          <button
            type="button"
            className="btn btn--sm btn--primary"
            onClick={() => onCotizarInCalculadora(catalogId)}
          >
            {catalogId === null
              ? "Abrir Calculadora"
              : "Cotizar este producto →"}
          </button>
        </div>
      )}

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
          <label htmlFor="pedido-value">Valor a cobrar</label>
          <input
            id="pedido-value"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="Opcional"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
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

        <div className="field">
          <label htmlFor="pedido-deadline">Deadline de entrega</label>
          <input
            id="pedido-deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
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
          disabled={
            busy ||
            catalogId === null ||
            // El backend rechaza pedidos sin snapshot de costos — el flujo
            // unificado pasa por la Calculadora (banner arriba lo guía).
            (!quoteCosts && pendingQuote?.source_quote_id == null)
          }
          title={
            !quoteCosts && pendingQuote?.source_quote_id == null
              ? "Cotizá el producto en la Calculadora primero"
              : ""
          }
        >
          {busy ? "Creando…" : "Crear pedido"}
        </button>
      </div>
    </form>
  );
}
