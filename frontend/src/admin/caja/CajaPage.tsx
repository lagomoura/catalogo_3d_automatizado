import { useCallback, useEffect, useState } from "react";
import {
  createCashTransaction,
  deleteCashTransaction,
  getCashSummary,
  getCashTransactions,
  getCatalog,
  getContacts,
  updateCashTransaction,
  type CashTransactionPayload,
  type CashTransactionUpdatePayload,
} from "../../api/client";
import type {
  CashSummary,
  CashTransaction,
  CatalogItem,
  Contact,
  TransactionKind,
} from "../../types";
import { CajaDashboard } from "./CajaDashboard";
import { TransactionForm } from "./TransactionForm";
import { TransactionList } from "./TransactionList";

interface ListFilters {
  start: string;
  end: string;
  kind: "" | TransactionKind;
  q: string;
}

export function CajaPage() {
  const [summary, setSummary] = useState<CashSummary | null>(null);
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [editing, setEditing] = useState<CashTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [range, setRange] = useState({ start: "", end: "" });
  const [filters, setFilters] = useState<ListFilters>({
    start: "",
    end: "",
    kind: "",
    q: "",
  });

  const refreshSummary = useCallback(async () => {
    setSummary(await getCashSummary(range));
  }, [range]);

  const refreshList = useCallback(async () => {
    setTransactions(
      await getCashTransactions({
        start: filters.start || undefined,
        end: filters.end || undefined,
        kind: filters.kind || undefined,
        q: filters.q || undefined,
      }),
    );
  }, [filters]);

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

  useEffect(() => {
    getContacts().then(setContacts).catch(() => undefined);
    getCatalog().then(setCatalog).catch(() => undefined);
  }, []);

  const afterMutation = useCallback(async () => {
    await Promise.all([refreshSummary(), refreshList(), getContacts().then(setContacts)]);
  }, [refreshSummary, refreshList]);

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

      <CajaDashboard
        summary={summary}
        range={range}
        onRangeChange={setRange}
      />

      <TransactionForm
        catalog={catalog}
        contacts={contacts}
        editing={editing}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onCancelEdit={() => setEditing(null)}
      />

      <TransactionList
        transactions={transactions}
        filters={filters}
        onFiltersChange={setFilters}
        onEdit={(tx) => {
          setEditing(tx);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onDelete={handleDelete}
      />
    </div>
  );
}
