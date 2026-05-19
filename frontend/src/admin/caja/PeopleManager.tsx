import { useState } from "react";
import {
  createContact,
  deleteContact,
  getContactStatement,
} from "../../api/client";
import type { Contact, ContactStatement } from "../../types";
import { formatARS, formatDate } from "../../utils/format";

interface Props {
  contacts: Contact[];
  onChanged: () => void;
}

export function PeopleManager({ contacts, onChanged }: Props) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [contactId, setContactId] = useState("");
  const [stmt, setStmt] = useState<ContactStatement | null>(null);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await createContact({ name: name.trim(), notes: notes.trim() || null });
      setName("");
      setNotes("");
      setError(null);
      onChanged();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "No se pudo crear");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (c: Contact) => {
    if (
      !window.confirm(
        `¿Eliminar a "${c.name}"? Sus movimientos quedarán sin persona.`,
      )
    )
      return;
    await deleteContact(c.id);
    if (contactId === String(c.id)) {
      setContactId("");
      setStmt(null);
    }
    onChanged();
  };

  const loadStatement = async (id: string) => {
    setContactId(id);
    if (!id) {
      setStmt(null);
      return;
    }
    try {
      setStmt(await getContactStatement(Number(id)));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar historial");
    }
  };

  return (
    <section className="txn-section">
      {error && <p className="error-banner">{error}</p>}

      <form className="caja-form" onSubmit={add}>
        <div className="caja-form__head">
          <h3>Nueva persona</h3>
        </div>
        <div className="caja-form__grid">
          <div className="field">
            <label htmlFor="ppl-name">Nombre</label>
            <input
              id="ppl-name"
              type="text"
              placeholder="Nombre y apellido"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="field caja-form__desc">
            <label htmlFor="ppl-notes">Notas (opcional)</label>
            <input
              id="ppl-notes"
              type="text"
              placeholder="Referencia, contacto…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <div className="caja-form__actions">
          <button type="submit" className="btn btn--primary" disabled={busy}>
            Agregar persona
          </button>
        </div>
      </form>

      <div className="txn-toolbar">
        <h3>Personas ({contacts.length})</h3>
        <select
          aria-label="Ver historial de"
          value={contactId}
          onChange={(e) => void loadStatement(e.target.value)}
        >
          <option value="">— Ver historial de… —</option>
          {contacts.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {contacts.length === 0 ? (
        <p className="txn-empty">Todavía no hay personas guardadas.</p>
      ) : (
        <ul className="cat-manager__list">
          {contacts.map((c) => (
            <li key={c.id} className="cat-manager__item">
              <span>
                <strong>{c.name}</strong>
                {c.notes ? <span className="hint"> · {c.notes}</span> : null}
              </span>
              <span className="cat-manager__actions">
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => void loadStatement(String(c.id))}
                >
                  Historial
                </button>
                <button
                  type="button"
                  className="btn btn--danger btn--sm"
                  onClick={() => remove(c)}
                >
                  Borrar
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {stmt && (
        <>
          <div className="txn-toolbar">
            <h3>Historial de {stmt.contact.name}</h3>
          </div>
          <div className="stat-grid">
            <div className="stat-card stat-card--credit">
              <span className="stat-card__label">Le cobramos</span>
              <span className="stat-card__value">
                {formatARS(stmt.total_credit)}
              </span>
            </div>
            <div className="stat-card stat-card--debit">
              <span className="stat-card__label">Le pagamos</span>
              <span className="stat-card__value">
                {formatARS(stmt.total_debit)}
              </span>
            </div>
            <div className="stat-card stat-card--credit">
              <span className="stat-card__label">Saldo por cobrar</span>
              <span className="stat-card__value">
                {formatARS(stmt.receivables_total)}
              </span>
              <span className="stat-card__sub">
                {stmt.receivables.length} pedido(s)
              </span>
            </div>
          </div>

          {stmt.transactions.length === 0 ? (
            <p className="txn-empty">Sin movimientos registrados.</p>
          ) : (
            <div className="txn-table txn-table--stmt" role="table">
              <div className="txn-row txn-row--head" role="row">
                <span>Fecha</span>
                <span>Tipo</span>
                <span>Categoría</span>
                <span>Descripción</span>
                <span className="txn-amount-col">Monto</span>
              </div>
              {stmt.transactions.map((t) => (
                <div className="txn-row" role="row" key={t.id}>
                  <span data-label="Fecha">{formatDate(t.occurred_on)}</span>
                  <span data-label="Tipo">
                    <span
                      className={`badge ${
                        t.kind === "credit" ? "badge--credit" : "badge--debit"
                      }`}
                    >
                      {t.kind === "credit" ? "Ingreso" : "Egreso"}
                    </span>
                  </span>
                  <span data-label="Categoría">{t.category ?? "—"}</span>
                  <span data-label="Descripción" className="txn-desc">
                    {t.description ?? t.catalog_item?.name ?? "—"}
                  </span>
                  <span
                    data-label="Monto"
                    className={`txn-amount-col txn-amount ${
                      t.kind === "credit" ? "is-credit" : "is-debit"
                    }`}
                  >
                    {t.kind === "credit" ? "+" : "−"}
                    {formatARS(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
