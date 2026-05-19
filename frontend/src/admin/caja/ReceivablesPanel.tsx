import { useCallback, useEffect, useState } from "react";
import { getReceivables, setOrderPayment } from "../../api/client";
import type { ReceivablesSummary } from "../../types";
import { formatARS, formatDate } from "../../utils/format";

interface Props {
  /** Avisar al contenedor que algo cambió (refrescar resumen/movimientos). */
  onChanged?: () => void;
}

export function ReceivablesPanel({ onChanged }: Props) {
  const [data, setData] = useState<ReceivablesSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

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

  return (
    <section className="txn-section">
      {error && <p className="error-banner">{error}</p>}

      <div className="stat-grid">
        <div className="stat-card stat-card--credit">
          <span className="stat-card__label">Total por cobrar</span>
          <span className="stat-card__value">
            {formatARS(data?.total ?? 0)}
          </span>
          <span className="stat-card__sub">
            {data?.count ?? 0} pedidos pendientes de pago
          </span>
        </div>
      </div>

      <div className="txn-toolbar">
        <h3>Cuentas por cobrar</h3>
        <span className="hint">
          Pedidos con valor cargado y pago PENDIENTE. Cobrar genera el ingreso
          en caja automáticamente.
        </span>
      </div>

      {!data || data.items.length === 0 ? (
        <p className="txn-empty">No hay nada por cobrar. 🎉</p>
      ) : (
        <div className="txn-table txn-table--recv" role="table">
          <div className="txn-row txn-row--head" role="row">
            <span>Pedido</span>
            <span>Producto</span>
            <span>Cliente</span>
            <span>Estado</span>
            <span>Creado</span>
            <span className="txn-amount-col">Valor</span>
            <span />
          </div>
          {data.items.map((r) => (
            <div className="txn-row" role="row" key={r.order_id}>
              <span data-label="Pedido">#{r.order_id}</span>
              <span data-label="Producto">{r.product ?? "—"}</span>
              <span data-label="Cliente">{r.contact ?? "—"}</span>
              <span data-label="Estado">
                <span className="badge">{r.order_status}</span>
              </span>
              <span data-label="Creado">{formatDate(r.created_at)}</span>
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
