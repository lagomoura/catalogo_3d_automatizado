import { useState } from "react";
import {
  createAccount,
  deleteAccount,
  getContactStatement,
  updateAccount,
} from "../../api/client";
import type {
  Account,
  AccountBalance,
  Contact,
  ContactStatement,
} from "../../types";
import { formatARS, formatDate } from "../../utils/format";

interface Props {
  accounts: Account[];
  balances: AccountBalance[];
  contacts: Contact[];
  onAccountsChanged: () => void;
}

export function AccountManager({
  accounts,
  balances,
  contacts,
  onAccountsChanged,
}: Props) {
  const [name, setName] = useState("");
  const [opening, setOpening] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [contactId, setContactId] = useState("");
  const [stmt, setStmt] = useState<ContactStatement | null>(null);

  const balOf = (id: number) =>
    balances.find((b) => b.account_id === id)?.balance ?? null;

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await createAccount({
        name: name.trim(),
        opening_balance: Number(opening) || 0,
      });
      setName("");
      setOpening("");
      setError(null);
      onAccountsChanged();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "No se pudo crear");
    } finally {
      setBusy(false);
    }
  };

  const editOpening = async (a: Account) => {
    const v = window.prompt(
      `Saldo inicial de "${a.name}"`,
      String(a.opening_balance),
    );
    if (v === null) return;
    const n = Number(v);
    if (!Number.isFinite(n)) return;
    await updateAccount(a.id, { opening_balance: n });
    onAccountsChanged();
  };

  const rename = async (a: Account) => {
    const v = window.prompt(`Nombre de la cuenta`, a.name);
    if (!v || !v.trim()) return;
    await updateAccount(a.id, { name: v.trim() });
    onAccountsChanged();
  };

  const archive = async (a: Account) => {
    await updateAccount(a.id, { archived: true });
    onAccountsChanged();
  };

  const remove = async (a: Account) => {
    if (
      !window.confirm(
        `¿Eliminar la cuenta "${a.name}"? Los movimientos quedarán sin cuenta.`,
      )
    )
      return;
    await deleteAccount(a.id);
    onAccountsChanged();
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
      setError(e instanceof Error ? e.message : "Error al cargar estado");
    }
  };

  return (
    <section className="txn-section">
      {error && <p className="error-banner">{error}</p>}

      <form className="caja-form" onSubmit={add}>
        <div className="caja-form__head">
          <h3>Cuentas / métodos de pago</h3>
        </div>
        <div className="caja-form__grid">
          <div className="field">
            <label htmlFor="acc-name">Nombre</label>
            <input
              id="acc-name"
              type="text"
              placeholder="Efectivo, Banco, MercadoPago…"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="acc-open">Saldo inicial (ARS)</label>
            <input
              id="acc-open"
              type="number"
              step="0.01"
              placeholder="0,00"
              value={opening}
              onChange={(e) => setOpening(e.target.value)}
            />
          </div>
        </div>
        <div className="caja-form__actions">
          <button type="submit" className="btn btn--primary" disabled={busy}>
            Agregar cuenta
          </button>
        </div>
      </form>

      <div className="txn-table txn-table--acct" role="table">
        <div className="txn-row txn-row--head" role="row">
          <span>Cuenta</span>
          <span className="txn-amount-col">Saldo inicial</span>
          <span className="txn-amount-col">Saldo actual</span>
          <span />
        </div>
        {accounts.map((a) => (
          <div className="txn-row" role="row" key={a.id}>
            <span data-label="Cuenta">{a.name}</span>
            <span data-label="Saldo inicial" className="txn-amount-col">
              {formatARS(a.opening_balance)}
            </span>
            <span data-label="Saldo actual" className="txn-amount-col txn-amount">
              {balOf(a.id) !== null ? formatARS(balOf(a.id)!) : "—"}
            </span>
            <span className="txn-actions">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => rename(a)}
              >
                Renombrar
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => editOpening(a)}
              >
                Saldo inicial
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => archive(a)}
              >
                Archivar
              </button>
              <button
                type="button"
                className="btn btn--danger btn--sm"
                onClick={() => remove(a)}
              >
                Borrar
              </button>
            </span>
          </div>
        ))}
      </div>

      <div className="txn-toolbar">
        <h3>Estado de cuenta por contacto</h3>
        <select
          aria-label="Contacto"
          value={contactId}
          onChange={(e) => loadStatement(e.target.value)}
        >
          <option value="">— Elegí un contacto —</option>
          {contacts.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {stmt && (
        <>
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
                    {t.description ?? t.product_label ?? "—"}
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
