import { useCallback, useEffect, useState } from "react";
import {
  createCashTransaction,
  deleteCashTransaction,
  getAccounts,
  getCashSummary,
  getCashTransactions,
  getCatalog,
  getContacts,
  updateCashTransaction,
  type CashTransactionPayload,
  type CashTransactionUpdatePayload,
} from "../../api/client";
import type {
  Account,
  CashSummary,
  CashTransaction,
  CatalogItem,
  Contact,
} from "../../types";
import { AccountManager } from "./AccountManager";
import { CajaDashboard } from "./CajaDashboard";
import type { Range } from "./periods";
import { ProfitabilityPanel } from "./ProfitabilityPanel";
import { ReceivablesPanel } from "./ReceivablesPanel";
import { RecurringExpenses } from "./RecurringExpenses";
import { TransactionForm } from "./TransactionForm";
import { TransactionList, type ListFilters } from "./TransactionList";

type SubTab =
  | "resumen"
  | "movimientos"
  | "cobrar"
  | "rentabilidad"
  | "recurrentes"
  | "cuentas";

const SUBTABS: { key: SubTab; label: string }[] = [
  { key: "resumen", label: "Resumen" },
  { key: "movimientos", label: "Movimientos" },
  { key: "cobrar", label: "Por cobrar" },
  { key: "rentabilidad", label: "Rentabilidad" },
  { key: "recurrentes", label: "Gastos fijos" },
  { key: "cuentas", label: "Cuentas" },
];

const PAGE_SIZE = 50;

const EMPTY_FILTERS: ListFilters = {
  start: "",
  end: "",
  kind: "",
  account_id: "",
  category: "",
  q: "",
};

export function CajaPage() {
  const [sub, setSub] = useState<SubTab>("resumen");

  const [summary, setSummary] = useState<CashSummary | null>(null);
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [editing, setEditing] = useState<CashTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [range, setRange] = useState<Range>({ start: "", end: "" });
  const [filters, setFilters] = useState<ListFilters>(EMPTY_FILTERS);

  const refreshSummary = useCallback(async () => {
    setSummary(await getCashSummary(range));
  }, [range]);

  const refreshList = useCallback(async () => {
    const page = await getCashTransactions({
      start: filters.start || undefined,
      end: filters.end || undefined,
      kind: filters.kind || undefined,
      account_id: filters.account_id ? Number(filters.account_id) : undefined,
      category: filters.category || undefined,
      q: filters.q || undefined,
      limit: PAGE_SIZE,
      offset,
    });
    setTransactions(page.items);
    setTotal(page.total);
  }, [filters, offset]);

  const refreshAccounts = useCallback(async () => {
    setAccounts(await getAccounts());
  }, []);

  useEffect(() => {
    refreshSummary().catch((e) =>
      setError(e instanceof Error ? e.message : "Error al cargar resumen"),
    );
  }, [refreshSummary]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      refreshList().catch((e) =>
        setError(e instanceof Error ? e.message : "Error al cargar movimientos"),
      );
    }, 250);
    return () => window.clearTimeout(t);
  }, [refreshList]);

  // Volver a la primera página cuando cambian los filtros.
  useEffect(() => {
    setOffset(0);
  }, [filters]);

  useEffect(() => {
    getContacts().then(setContacts).catch(() => undefined);
    getCatalog().then(setCatalog).catch(() => undefined);
    refreshAccounts().catch(() => undefined);
  }, [refreshAccounts]);

  const afterMutation = useCallback(async () => {
    await Promise.all([
      refreshSummary(),
      refreshList(),
      refreshAccounts(),
      getContacts().then(setContacts),
    ]);
  }, [refreshSummary, refreshList, refreshAccounts]);

  const handleCreate = useCallback(
    async (p: CashTransactionPayload) => {
      await createCashTransaction(p);
      await afterMutation();
    },
    [afterMutation],
  );

  const handleUpdate = useCallback(
    async (id: number, p: CashTransactionUpdatePayload) => {
      await updateCashTransaction(id, p);
      setEditing(null);
      await afterMutation();
    },
    [afterMutation],
  );

  const handleDelete = useCallback(
    async (id: number) => {
      await deleteCashTransaction(id);
      if (editing?.id === id) setEditing(null);
      await afterMutation();
    },
    [afterMutation, editing],
  );

  return (
    <div className="caja">
      {error && <p className="error-banner">{error}</p>}

      <nav className="subtabs" role="tablist">
        {SUBTABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={sub === t.key}
            className={`subtab ${sub === t.key ? "subtab--active" : ""}`}
            onClick={() => setSub(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {sub === "resumen" && (
        <CajaDashboard
          summary={summary}
          range={range}
          onRangeChange={setRange}
        />
      )}

      {sub === "movimientos" && (
        <>
          <TransactionForm
            catalog={catalog}
            contacts={contacts}
            accounts={accounts}
            editing={editing}
            onCreate={handleCreate}
            onUpdate={handleUpdate}
            onCancelEdit={() => setEditing(null)}
          />
          <TransactionList
            transactions={transactions}
            total={total}
            offset={offset}
            limit={PAGE_SIZE}
            accounts={accounts}
            filters={filters}
            onFiltersChange={setFilters}
            onOffsetChange={setOffset}
            onEdit={(tx) => {
              setEditing(tx);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onDelete={handleDelete}
          />
        </>
      )}

      {sub === "cobrar" && <ReceivablesPanel onChanged={afterMutation} />}

      {sub === "rentabilidad" && <ProfitabilityPanel />}

      {sub === "recurrentes" && (
        <RecurringExpenses accounts={accounts} onPosted={afterMutation} />
      )}

      {sub === "cuentas" && (
        <AccountManager
          accounts={accounts}
          balances={summary?.accounts ?? []}
          contacts={contacts}
          onAccountsChanged={afterMutation}
        />
      )}
    </div>
  );
}
