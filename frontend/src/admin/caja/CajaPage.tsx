import { useCallback, useEffect, useState } from "react";
import {
  createCashTransaction,
  createTxCategory,
  deleteCashTransaction,
  getCashSummary,
  getCashTransactions,
  getCatalog,
  getContacts,
  getTxCategories,
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
  TxCategory,
} from "../../types";
import { CajaDashboard } from "./CajaDashboard";
import { CategoryManager } from "./CategoryManager";
import type { Range } from "./periods";
import { PeopleManager } from "./PeopleManager";
import { ProfitabilityPanel } from "./ProfitabilityPanel";
import { ReceivablesPanel } from "./ReceivablesPanel";
import { RecurringExpenses } from "./RecurringExpenses";
import { OnboardingModal } from "./OnboardingModal";
import { TransactionForm } from "./TransactionForm";
import { TransactionList, type ListFilters } from "./TransactionList";

type SubTab =
  | "resumen"
  | "movimientos"
  | "cobrar"
  | "rentabilidad"
  | "recurrentes"
  | "categorias"
  | "personas";

const SUBTABS: { key: SubTab; label: string }[] = [
  { key: "resumen", label: "Resumen" },
  { key: "movimientos", label: "Movimientos" },
  { key: "cobrar", label: "Por cobrar" },
  { key: "rentabilidad", label: "Rentabilidad" },
  { key: "recurrentes", label: "Gastos fijos" },
  { key: "categorias", label: "Categorías" },
  { key: "personas", label: "Personas" },
];

const PAGE_SIZE = 50;

const EMPTY_FILTERS: ListFilters = {
  start: "",
  end: "",
  kind: "",
  category_id: "",
  q: "",
};

export function CajaPage() {
  const [sub, setSub] = useState<SubTab>("resumen");
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  const [summary, setSummary] = useState<CashSummary | null>(null);
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [categories, setCategories] = useState<TxCategory[]>([]);
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
      category_id: filters.category_id ? Number(filters.category_id) : undefined,
      q: filters.q || undefined,
      limit: PAGE_SIZE,
      offset,
    });
    setTransactions(page.items);
    setTotal(page.total);
  }, [filters, offset]);

  const refreshCategories = useCallback(async () => {
    setCategories(await getTxCategories());
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
    refreshCategories().catch(() => undefined);
  }, [refreshCategories]);

  const afterMutation = useCallback(async () => {
    await Promise.all([
      refreshSummary(),
      refreshList(),
      refreshCategories(),
      getContacts().then(setContacts),
    ]);
  }, [refreshSummary, refreshList, refreshCategories]);

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

  const handleCreateCategory = useCallback(
    async (name: string, kind: TransactionKind): Promise<TxCategory> => {
      const created = await createTxCategory({ name, kind });
      await refreshCategories();
      return created;
    },
    [refreshCategories],
  );

  return (
    <div className="caja">
      <header className="caja__header">
        <div>
          <p className="caja__eyebrow">Finanzas</p>
          <h2>Caja</h2>
          <p className="caja__subtitle">
            Todo el dinero que entra y sale: ventas, compras, gastos
            fijos, retiros. Resumen visual y movimientos con filtros.
          </p>
        </div>
        <button
          type="button"
          className="help-btn"
          onClick={() => setOnboardingOpen(true)}
          aria-label="Qué es Caja y cómo se conecta"
          title="¿Qué es esto?"
        >
          ?
        </button>
      </header>

      <OnboardingModal
        open={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
      />

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
        <CajaDashboard summary={summary} range={range} onRangeChange={setRange} />
      )}

      {sub === "movimientos" && (
        <>
          <TransactionForm
            catalog={catalog}
            contacts={contacts}
            categories={categories}
            editing={editing}
            onCreate={handleCreate}
            onUpdate={handleUpdate}
            onCancelEdit={() => setEditing(null)}
            onCreateCategory={handleCreateCategory}
          />
          <TransactionList
            transactions={transactions}
            total={total}
            offset={offset}
            limit={PAGE_SIZE}
            categories={categories}
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
        <RecurringExpenses
          categories={categories}
          onCreateCategory={(name) => handleCreateCategory(name, "debit")}
          onPosted={afterMutation}
        />
      )}

      {sub === "categorias" && (
        <CategoryManager
          categories={categories}
          onChanged={() => void refreshCategories()}
        />
      )}

      {sub === "personas" && (
        <PeopleManager
          contacts={contacts}
          onChanged={() => {
            getContacts().then(setContacts).catch(() => undefined);
          }}
        />
      )}
    </div>
  );
}
