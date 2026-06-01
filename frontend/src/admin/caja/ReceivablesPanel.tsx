import { useCallback, useEffect, useMemo, useState } from "react";
import { getReceivables, setOrderPayment } from "../../api/client";
import type { Receivable, ReceivablesSummary } from "../../types";
import { formatARS, formatDate } from "../../utils/format";
import { MarginPill } from "../pedidos/board/MarginPill";

interface Props {
  /** Avisar al contenedor que algo cambió (refrescar resumen/movimientos). */
  onChanged?: () => void;
}

function matches(r: Receivable, needle: string): boolean {
  if (!needle) return true;
  const haystack = [
    `#${r.order_id}`,
    String(r.order_id),
    r.product ?? "",
    r.contact ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

export function ReceivablesPanel({ onChanged }: Props) {
  const [data, setData] = useState<ReceivablesSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [q, setQ] = useState("");

  const refresh = useCallback(async () => {
    try {
      setData(await getReceivables());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const markPaid = async (orderId: number) => {
    setBusy(orderId);
    try {
      await setOrderPayment(orderId, true);
      await refresh();
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cobrar");
    } finally {
      setBusy(null);
    }
  };

  const needle = q.trim().toLowerCase();
  const items = data?.items ?? [];
  const filtered = useMemo(
    () => items.filter((r) => matches(r, needle)),
    [items, needle],
  );
  const filteredTotal = useMemo(
    () => filtered.reduce((acc, r) => acc + r.value, 0),
    [filtered],
  );
  const hasFilter = needle.length > 0;

  return (
    <section className="txn-section">
      {error && <p className="error-banner">{error}</p>}

      <div className="stat-grid">
        <div className="stat-card stat-card--credit">
          <span className="stat-card__label">Total por cobrar</span>
          <span className="stat-card__value">
            {formatARS(hasFilter ? filteredTotal : data?.total ?? 0)}
          </span>
          <span className="stat-card__sub">
            {hasFilter
              ? `${filtered.length} de ${items.length} pedidos`
              : `${data?.count ?? 0} pedidos pendientes de pago`}
          </span>
        </div>
      </div>

      <div className="txn-toolbar">
        <h3>Cuentas por cobrar</h3>
        <span className="hint">
          Pedidos con valor cargado y pago PENDIENTE. Cobrar genera el ingreso
          en caja automáticamente.
        </span>
        <input
          type="search"
          className="txn-search"
          placeholder="Buscar por cliente, producto o #pedido"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Buscar cuentas por cobrar"
        />
      </div>

      {items.length === 0 ? (
        <p className="txn-empty">No hay nada por cobrar. 🎉</p>
      ) : filtered.length === 0 ? (
        <p className="txn-empty">Ningún pedido coincide con “{q.trim()}”.</p>
      ) : (
        <div className="txn-table txn-table--recv" role="table">
          <div className="txn-row txn-row--head" role="row">
            <span>Pedido</span>
            <span>Producto</span>
            <span>Cliente</span>
            <span>Estado</span>
            <span>Fechas</span>
            <span className="txn-amount-col">Valor</span>
            <span />
          </div>
          {filtered.map((r) => (
            <div className="txn-row" role="row" key={r.order_id}>
              <span data-label="Pedido">#{r.order_id}</span>
              <span data-label="Producto" className="recv-cell">
                <span className="recv-cell__main">{r.product ?? "—"}</span>
                <span className="recv-sub">
                  ×{r.quantity}
                  {r.note ? (
                    <span className="recv-note" title={r.note}>
                      {" "}
                      · 📝 {r.note}
                    </span>
                  ) : null}
                </span>
              </span>
              <span data-label="Cliente">{r.contact ?? "—"}</span>
              <span data-label="Estado" className="recv-cell">
                <span className="badge">{r.order_status}</span>
                <MarginPill order={r} />
              </span>
              <span data-label="Fechas" className="recv-cell">
                <span className="recv-cell__main">
                  {formatDate(r.created_at)}
                </span>
                {r.sale_date && (
                  <span className="recv-sub">🗓 venta {formatDate(r.sale_date)}</span>
                )}
                {r.deadline && (
                  <span className="recv-sub">⏳ entrega {formatDate(r.deadline)}</span>
                )}
              </span>
              <span data-label="Valor" className="txn-amount-col txn-amount is-credit">
                {formatARS(r.value)}
              </span>
              <span className="txn-actions">
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  disabled={busy === r.order_id}
                  onClick={() => markPaid(r.order_id)}
                >
                  {busy === r.order_id ? "…" : "Marcar cobrado"}
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
