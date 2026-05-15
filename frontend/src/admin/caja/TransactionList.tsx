import { useState } from "react";
import type { CashTransaction, TransactionKind } from "../../types";
import { formatARS, formatDate } from "../../utils/format";

interface Filters {
  start: string;
  end: string;
  kind: "" | TransactionKind;
  q: string;
}

interface Props {
  transactions: CashTransaction[];
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
  onEdit: (tx: CashTransaction) => void;
  onDelete: (id: number) => Promise<void>;
}

export function TransactionList({
  transactions,
  filters,
  onFiltersChange,
  onEdit,
  onDelete,
}: Props) {
  const [deleting, setDeleting] = useState<number | null>(null);

  const set = (patch: Partial<Filters>) =>
    onFiltersChange({ ...filters, ...patch });

  const handleDelete = async (tx: CashTransaction) => {
    if (
      !window.confirm(
        `¿Eliminar el movimiento de ${formatARS(tx.amount)} del ${formatDate(
          tx.occurred_on,
        )}? Esta acción no se puede deshacer.`,
      )
    )
      return;
    setDeleting(tx.id);
    try {
      await onDelete(tx.id);
    } finally {
      setDeleting(null);
    }
  };

  const clearFilters = () =>
    onFiltersChange({ start: "", end: "", kind: "", q: "" });

  const hasFilters =
    filters.start || filters.end || filters.kind || filters.q;

  return (
    <section className="txn-section">
      <div className="txn-toolbar">
        <h3>Historial de movimientos</h3>
        <div className="txn-toolbar__filters">
          <input
            type="date"
            aria-label="Desde"
            value={filters.start}
            onChange={(e) => set({ start: e.target.value })}
          />
          <span className="txn-toolbar__sep">→</span>
          <input
            type="date"
            aria-label="Hasta"
            value={filters.end}
            onChange={(e) => set({ end: e.target.value })}
          />
          <select
            aria-label="Tipo"
            value={filters.kind}
            onChange={(e) =>
              set({ kind: e.target.value as Filters["kind"] })
            }
          >
            <option value="">Todos</option>
            <option value="credit">Ingresos</option>
            <option value="debit">Egresos</option>
          </select>
          <input
            type="search"
            placeholder="Buscar…"
            value={filters.q}
            onChange={(e) => set({ q: e.target.value })}
          />
          {hasFilters && (
            <button type="button" className="btn btn--ghost" onClick={clearFilters}>
              Limpiar
            </button>
          )}
        </div>
      </div>

      {transactions.length === 0 ? (
        <p className="txn-empty">No hay movimientos para mostrar.</p>
      ) : (
        <div className="txn-table" role="table">
          <div className="txn-row txn-row--head" role="row">
            <span>Fecha</span>
            <span>Tipo</span>
            <span>Producto</span>
            <span>Persona</span>
            <span>Descripción</span>
            <span className="txn-amount-col">Monto</span>
            <span />
          </div>
          {transactions.map((tx) => (
            <div className="txn-row" role="row" key={tx.id}>
              <span data-label="Fecha">{formatDate(tx.occurred_on)}</span>
              <span data-label="Tipo">
                <span
                  className={`badge ${
                    tx.kind === "credit" ? "badge--credit" : "badge--debit"
                  }`}
                >
                  {tx.kind === "credit" ? "Ingreso" : "Egreso"}
                </span>
              </span>
              <span data-label="Producto">
                {tx.catalog_item?.name ?? tx.product_label ?? "—"}
              </span>
              <span data-label="Persona">
                {tx.contact?.name ?? tx.person_label ?? "—"}
              </span>
              <span data-label="Descripción" className="txn-desc">
                {tx.description ?? "—"}
              </span>
              <span
                data-label="Monto"
                className={`txn-amount-col txn-amount ${
                  tx.kind === "credit" ? "is-credit" : "is-debit"
                }`}
              >
                {tx.kind === "credit" ? "+" : "−"}
                {formatARS(tx.amount)}
              </span>
              <span className="txn-actions">
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => onEdit(tx)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="btn btn--danger btn--sm"
                  onClick={() => handleDelete(tx)}
                  disabled={deleting === tx.id}
                >
                  {deleting === tx.id ? "…" : "Borrar"}
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
