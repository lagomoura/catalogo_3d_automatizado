import { useCallback, useEffect, useState } from "react";
import {
  advanceOrder,
  appendOrderCost,
  createOrder,
  deleteOrder,
  getCatalog,
  getContacts,
  getOrders,
  replaceOrderCosts,
  setOrderPayment,
  setOrderPriority,
  startOrder,
  updateOrder,
  type OrderCostItemInput,
  type OrderCreatePayload,
  type OrderUpdatePayload,
} from "../../api/client";
import type {
  CatalogItem,
  Contact,
  Order,
  OrderPriority,
  PendingQuote,
} from "../../types";
import { OrderForm } from "./OrderForm";
import { OrderQueue } from "./OrderQueue";

interface PedidosPageProps {
  pendingQuote?: PendingQuote | null;
  onPendingQuoteConsumed?: () => void;
}

export function PedidosPage({
  pendingQuote = null,
  onPendingQuoteConsumed,
}: PedidosPageProps = {}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [filterProductId, setFilterProductId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshOrders = useCallback(async () => {
    setOrders(
      await getOrders({
        catalog_item_id: filterProductId ?? undefined,
      }),
    );
  }, [filterProductId]);

  useEffect(() => {
    refreshOrders().catch((e) =>
      setError(e instanceof Error ? e.message : "Error al cargar pedidos"),
    );
  }, [refreshOrders]);

  useEffect(() => {
    getContacts().then(setContacts).catch(() => undefined);
    getCatalog().then(setCatalog).catch(() => undefined);
  }, []);

  const run = useCallback(
    async (action: () => Promise<unknown>) => {
      setError(null);
      try {
        await action();
        await Promise.all([
          refreshOrders(),
          getContacts().then(setContacts),
        ]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo completar la acción");
      }
    },
    [refreshOrders],
  );

  const handleCreate = useCallback(
    async (p: OrderCreatePayload) => {
      // Errores se propagan al formulario; igual refrescamos al terminar.
      await createOrder(p);
      await Promise.all([refreshOrders(), getContacts().then(setContacts)]);
    },
    [refreshOrders],
  );

  const handleUpdate = useCallback(
    async (id: number, p: OrderUpdatePayload) => {
      // Errores se propagan al modal; refrescamos al terminar.
      await updateOrder(id, p);
      await Promise.all([refreshOrders(), getContacts().then(setContacts)]);
    },
    [refreshOrders],
  );

  const handleSaveCosts = useCallback(
    async (id: number, items: OrderCostItemInput[]) => {
      await replaceOrderCosts(id, items);
      await refreshOrders();
    },
    [refreshOrders],
  );

  const handleAppendCost = useCallback(
    async (
      id: number,
      item: { concept: string; amount: number; per_unit?: boolean },
    ) => {
      await appendOrderCost(id, item);
      await refreshOrders();
    },
    [refreshOrders],
  );

  return (
    <div className="pedidos">
      {error && <p className="error-banner">{error}</p>}

      <OrderForm
        catalog={catalog}
        contacts={contacts}
        onCreate={handleCreate}
        pendingQuote={pendingQuote}
        onPendingQuoteConsumed={onPendingQuoteConsumed}
      />

      <OrderQueue
        orders={orders}
        catalog={catalog}
        contacts={contacts}
        filterProductId={filterProductId}
        onFilterChange={setFilterProductId}
        onStart={(id) => void run(() => startOrder(id))}
        onAdvance={(id) => void run(() => advanceOrder(id))}
        onPayment={(id, paid) => void run(() => setOrderPayment(id, paid))}
        onPriority={(id, p: OrderPriority | null) =>
          void run(() => setOrderPriority(id, p))
        }
        onUpdate={handleUpdate}
        onSaveCosts={handleSaveCosts}
        onAppendCost={handleAppendCost}
        onDelete={(id) => void run(() => deleteOrder(id))}
      />
    </div>
  );
}
