import { useCallback, useEffect, useMemo, useState } from "react";
import {
  advanceOrder,
  appendOrderCost,
  createOrder,
  deleteOrder,
  getCatalog,
  getContacts,
  getOrders,
  getOrdersSummary,
  replaceOrderCosts,
  setOrderPayment,
  setOrderPriority,
  startOrder,
  updateOrder,
  type OrderCostItemInput,
  type OrderCreatePayload,
  type OrderUpdatePayload,
} from "../../api/client";
import { KpiCard } from "../../components/KpiCard";
import type {
  CatalogItem,
  Contact,
  Order,
  OrderPriority,
  OrderSummary,
  PendingQuote,
} from "../../types";
import { OnboardingModal } from "./OnboardingModal";
import { OrderForm } from "./OrderForm";
import { OrderQueue } from "./OrderQueue";
import "./pedidos.css";

interface PedidosPageProps {
  pendingQuote?: PendingQuote | null;
  onPendingQuoteConsumed?: () => void;
}

type StatusTab =
  | "todos"
  | "pendentes"
  | "proximos_prazo"
  | "atrasados"
  | "en_produccion"
  | "finalizados";

const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "pendentes", label: "Pendientes" },
  { key: "proximos_prazo", label: "Próximos al plazo" },
  { key: "atrasados", label: "Atrasados" },
  { key: "en_produccion", label: "En producción" },
  { key: "finalizados", label: "Finalizados" },
];

const fmtMoney = (n: number) =>
  n.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const todayISO = () => new Date().toISOString().slice(0, 10);
const inDaysISO = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

export function PedidosPage({
  pendingQuote = null,
  onPendingQuoteConsumed,
}: PedidosPageProps = {}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [filterProductId, setFilterProductId] = useState<number | null>(null);
  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [query, setQuery] = useState("");
  const [statusTab, setStatusTab] = useState<StatusTab>("todos");
  const [error, setError] = useState<string | null>(null);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  const refreshOrders = useCallback(async () => {
    const [list, sum] = await Promise.all([
      getOrders({
        catalog_item_id: filterProductId ?? undefined,
      }),
      getOrdersSummary().catch(() => null),
    ]);
    setOrders(list);
    if (sum) setSummary(sum);
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
      const order = await createOrder(p);
      await Promise.all([refreshOrders(), getContacts().then(setContacts)]);
      return order;
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

  const filteredOrders = useMemo(() => {
    const today = todayISO();
    const week = inDaysISO(summary?.prazo_window_days ?? 7);
    let arr = orders;
    switch (statusTab) {
      case "pendentes":
        arr = arr.filter((o) => o.order_status === "CREADO");
        break;
      case "proximos_prazo":
        arr = arr.filter(
          (o) =>
            o.order_status !== "ENTREGADO" &&
            o.deadline != null &&
            o.deadline >= today &&
            o.deadline <= week,
        );
        break;
      case "atrasados":
        arr = arr.filter(
          (o) =>
            o.order_status !== "ENTREGADO" &&
            o.deadline != null &&
            o.deadline < today,
        );
        break;
      case "en_produccion":
        arr = arr.filter((o) => o.order_status === "EJECUTANDO");
        break;
      case "finalizados":
        arr = arr.filter((o) => o.order_status === "ENTREGADO");
        break;
    }
    const q = query.trim().toLowerCase();
    if (q) {
      arr = arr.filter((o) =>
        [
          o.catalog_item?.name,
          o.contact?.name,
          o.person_label,
          o.note,
          String(o.id),
        ]
          .filter(Boolean)
          .some((s) => s!.toLowerCase().includes(q)),
      );
    }
    return arr;
  }, [orders, statusTab, query, summary?.prazo_window_days]);

  return (
    <div className="pedidos">
      <header className="pedidos__header">
        <div>
          <p className="pedidos__eyebrow">Operación</p>
          <h2>Pedidos</h2>
          <p className="pedidos__subtitle">
            Cada venta como una orden: cliente, producto, cantidad,
            estado y plazo. El nodo central que conecta clientes,
            producción, cobro y stock.
          </p>
        </div>
        <button
          type="button"
          className="help-btn"
          onClick={() => setOnboardingOpen(true)}
          aria-label="Qué es Pedidos y cómo se conecta"
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

      <section className="pedidos__kpi-grid">
        <KpiCard
          label="En abierto"
          value={summary?.em_aberto ?? "—"}
          tone="blue"
        />
        <KpiCard
          label={`Próximos (${summary?.prazo_window_days ?? 7}d)`}
          value={summary?.prazo_proximo ?? "—"}
          tone="orange"
        />
        <KpiCard
          label="Atrasados"
          value={summary?.atrasados ?? "—"}
          tone="red"
        />
        <KpiCard
          label="En producción"
          value={summary?.em_producao ?? "—"}
          tone="purple"
        />
        <KpiCard
          label="Entregados (período)"
          value={summary?.entregues_no_mes ?? "—"}
          tone="green"
        />
        <KpiCard
          label="Valor pendiente"
          value={summary ? fmtMoney(summary.valor_pendente) : "—"}
          tone="neutral"
        />
      </section>

      <OrderForm
        catalog={catalog}
        contacts={contacts}
        onCreate={handleCreate}
        pendingQuote={pendingQuote}
        onPendingQuoteConsumed={onPendingQuoteConsumed}
      />

      <div className="pedidos__board-controls">
        <input
          className="pedidos__search"
          type="search"
          placeholder="Buscar por cliente, producto, nota, #pedido…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <nav className="pedidos__substabs" role="tablist">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={statusTab === t.key}
              className={`pedidos__substab ${
                statusTab === t.key ? "pedidos__substab--active" : ""
              }`}
              onClick={() => setStatusTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <OrderQueue
        orders={filteredOrders}
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
