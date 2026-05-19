import { useState } from "react";
import { cashExportUrl, type TransactionFilters } from "../../api/client";
import type { CashTransaction, TransactionKind, TxCategory } from "../../types";
import { formatARS, formatDate } from "../../utils/format";

export interface ListFilters {
  start: string;
  end: string;
  kind: "" | TransactionKind;
  category_id: string;
  q: string;
}

interface Props {
  transactions: CashTransaction[];
  total: number;
  offset: number;
  limit: number;
  categories: TxCategory[];
  filters: ListFilters;
  onFiltersChange: (f: ListFilters) => void;
  onOffsetChange: (offset: number) => void;
  onEdit: (tx: CashTransaction) => void;
  onDelete: (id: number) => Promise<void>;
}

function toApiFilters(f: ListFilters): TransactionFilters {
  return {
    start: f.start || undefined,
    end: f.end || undefined,
    kind: f.kind || undefined,
    category_id: f.category_id ? Number(f.category_id) : undefined,
    q: f.q || undefined,
  };
}

const EMPTY: ListFilters = {
  start: "",
  end: "",
  kind: "",
  category_id: "",
  q: "",
};

export function TransactionList({
  transactions,
  total,
  offset,
  limit,
  categories,
  filters,
  onFiltersChange,
  onOffsetChange,
  onEdit,
  onDelete,
}: Props) {
  const [deleting, setDeleting] = useState<number | null>(null);

  const set = (patch: Partial<ListFilters>) =>
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

  const hasFilters =
    filters.start ||
    filters.end ||
    filters.kind ||
    filters.category_id ||
    filters.q;

  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + limit, total);

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
            onChange={(e) => set({ kind: e.target.value as ListFilters["kind"] })}
          >
            <option value="">Todos</option>
            <option value="credit">Ingresos</option>
            <option value="debit">Egresos</option>
          </select>
          <select
            aria-label="Categoría"
            value={filters.category_id}
            onChange={(e) => set({ category_id: e.target.value })}
          >
            <option value="">Toda categoría</option>
            <optgroup label="Ingresos">
              {categories
                .filter((c) => c.kind === "credit")
                .map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Egresos">
              {categories
                .filter((c) => c.kind === "debit")
                .map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
            </optgroup>
          </select>
          <input
            type="search"
            placeholder="Buscar…"
            value={filters.q}
            onChange={(e) => set({ q: e.target.value })}
          />
          {hasFilters && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => onFiltersChange(EMPTY)}
            >
              Limpiar
            </button>
          )}
          <a
            className="btn btn--ghost"
            href={cashExportUrl(toApiFilters(filters))}
          >
            ⬇ CSV
          </a>
        </div>
      </div>

      {transactions.length === 0 ? (
        <p className="txn-empty">No hay movimientos para mostrar.</p>
      ) : (
        <>
          <div className="txn-table txn-table--mov" role="table">
            <div className="txn-row txn-row--head" role="row">
              <span>Fecha</span>
              <span>Tipo</span>
              <span>Categoría</span>
              <span>Producto</span>
              <span>Persona</span>
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
                <span data-label="Categoría">
                  {tx.category ? (
                    <span className="tag">{tx.category}</span>
                  ) : (
                    "—"
                  )}
                </span>
                <span data-label="Producto">
                  {tx.catalog_item?.name ?? tx.product_label ?? "—"}
                </span>
                <span data-label="Persona">
                  {tx.contact?.name ?? tx.person_label ?? "—"}
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

          <div className="txn-pager">
            <span>
              {from}–{to} de {total}
            </span>
            <div className="txn-pager__btns">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={offset === 0}
                onClick={() => onOffsetChange(Math.max(0, offset - limit))}
              >
                ← Anteriores
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={offset + limit >= total}
                onClick={() => onOffsetChange(offset + limit)}
              >
                Siguientes →
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
