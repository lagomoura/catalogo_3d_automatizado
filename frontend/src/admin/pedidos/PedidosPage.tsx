import { useCallback, useEffect, useMemo, useState } from "react";
import {
  advanceOrder,
  appendOrderCost,
  cancelProductionRun,
  createOrder,
  createProductionRun,
  deleteOrder,
  deleteProductionRun,
  finishProductionRun,
  getCatalog,
  getContacts,
  getOrders,
  getOrdersSummary,
  getPrinters,
  getProductionRuns,
  getProductionSummary,
  pauseProductionRun,
  reopenProductionRun,
  replaceOrderCosts,
  resumeProductionRun,
  setOrderPayment,
  setOrderPriority,
  startOrder,
  startProductionRun,
  updateOrder,
  updateProductionRun,
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
  Printer,
  ProductionRun,
  ProductionRunCreatePayload,
  ProductionRunUpdatePayload,
  ProductionSummary,
} from "../../types";
import { OnboardingModal } from "./OnboardingModal";
import { OrderForm } from "./OrderForm";
import { OrderQueue } from "./OrderQueue";
import { ProductionRunForm } from "./ProductionRunForm";
import { useProductionTicker } from "./useProductionTicker";
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
  { key: "pendentes", label: "En cola" },
  { key: "proximos_prazo", label: "Próximos al plazo" },
  { key: "atrasados", label: "Atrasados" },
  { key: "en_produccion", label: "En curso" },
  { key: "finalizados", label: "Entregados" },
];

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

  const [runs, setRuns] = useState<ProductionRun[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [productionSummary, setProductionSummary] =
    useState<ProductionSummary | null>(null);
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [runFormOrderId, setRunFormOrderId] = useState<number | null>(null);
  const [runFormEditing, setRunFormEditing] = useState<ProductionRun | null>(
    null,
  );
  const { now } = useProductionTicker();

  const refreshOrders = useCallback(async () => {
    const [list, sum, runsList, prodSum] = await Promise.all([
      getOrders({
        catalog_item_id: filterProductId ?? undefined,
      }),
      getOrdersSummary().catch(() => null),
      getProductionRuns().catch(() => [] as ProductionRun[]),
      getProductionSummary().catch(() => null),
    ]);
    setOrders(list);
    if (sum) setSummary(sum);
    setRuns(runsList);
    if (prodSum) setProductionSummary(prodSum);
  }, [filterProductId]);

  useEffect(() => {
    refreshOrders().catch((e) =>
      setError(e instanceof Error ? e.message : "Error al cargar pedidos"),
    );
  }, [refreshOrders]);

  useEffect(() => {
    getContacts().then(setContacts).catch(() => undefined);
    getCatalog().then(setCatalog).catch(() => undefined);
    getPrinters().then(setPrinters).catch(() => undefined);
  }, []);

  // Pull silencioso cada 30s para reflejar cambios de runs (start/pause/finish
  // disparados en otra pestaña o por otro usuario).
  useEffect(() => {
    const id = window.setInterval(() => {
      void refreshOrders();
    }, 30000);
    return () => window.clearInterval(id);
  }, [refreshOrders]);

  // Auto-expand pedidos en EJECUTANDO al cargar, para que sus runs queden visibles.
  useEffect(() => {
    const inCurso = orders
      .filter((o) => o.order_status === "EJECUTANDO")
      .map((o) => o.id);
    if (inCurso.length === 0) return;
    setExpandedOrderIds((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const id of inCurso) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [orders]);

  const runsByOrder = useMemo(() => {
    const m = new Map<number, ProductionRun[]>();
    for (const r of runs) {
      const oid = r.order?.id;
      if (oid == null) continue;
      const arr = m.get(oid) ?? [];
      arr.push(r);
      m.set(oid, arr);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
    }
    return m;
  }, [runs]);

  const runsCountByOrder = useMemo(() => {
    const m = new Map<number, number>();
    for (const [oid, arr] of runsByOrder) m.set(oid, arr.length);
    return m;
  }, [runsByOrder]);

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
      const order = await createOrder(p);
      await Promise.all([refreshOrders(), getContacts().then(setContacts)]);
      return order;
    },
    [refreshOrders],
  );

  const handleUpdate = useCallback(
    async (id: number, p: OrderUpdatePayload) => {
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

  const runAction = useCallback(
    async (fn: () => Promise<unknown>) => {
      setError(null);
      try {
        await fn();
        await refreshOrders();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error en la acción");
      }
    },
    [refreshOrders],
  );

  const handleToggleExpand = useCallback((orderId: number) => {
    setExpandedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  }, []);

  const handleRunStart = useCallback(
    (id: number) => void runAction(() => startProductionRun(id)),
    [runAction],
  );
  const handleRunPause = useCallback(
    (id: number) => void runAction(() => pauseProductionRun(id)),
    [runAction],
  );
  const handleRunResume = useCallback(
    (id: number) => void runAction(() => resumeProductionRun(id)),
    [runAction],
  );
  const handleRunFinish = useCallback(
    (id: number) => void runAction(() => finishProductionRun(id)),
    [runAction],
  );
  const handleRunCancel = useCallback(
    (id: number) => void runAction(() => cancelProductionRun(id)),
    [runAction],
  );
  const handleRunReopen = useCallback(
    (id: number) => void runAction(() => reopenProductionRun(id)),
    [runAction],
  );
  const handleRunDelete = useCallback(
    (id: number) => {
      if (!window.confirm("¿Eliminar esta producción del historial?")) return;
      void runAction(() => deleteProductionRun(id));
    },
    [runAction],
  );
  const handleRunEdit = useCallback((r: ProductionRun) => {
    setRunFormOrderId(null);
    setRunFormEditing(r);
  }, []);
  const handleRunCreateOpen = useCallback((orderId: number) => {
    setRunFormEditing(null);
    setRunFormOrderId(orderId);
  }, []);
  const handleRunCreateSubmit = useCallback(
    async (payload: ProductionRunCreatePayload) => {
      const enriched: ProductionRunCreatePayload =
        runFormOrderId != null ? { ...payload, order_id: runFormOrderId } : payload;
      await createProductionRun(enriched);
      await refreshOrders();
    },
    [refreshOrders, runFormOrderId],
  );
  const handleRunUpdateSubmit = useCallback(
    async (id: number, payload: ProductionRunUpdatePayload) => {
      await updateProductionRun(id, payload);
      await refreshOrders();
    },
    [refreshOrders],
  );
  const handleRunFormClose = useCallback(() => {
    setRunFormOrderId(null);
    setRunFormEditing(null);
  }, []);

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
          <h2>Pedidos & Producción</h2>
          <p className="pedidos__subtitle">
            Cada venta como una orden: cliente, producto, cantidad, plazo.
            Expandí un pedido para ver y manejar sus piezas en producción
            en vivo.
          </p>
        </div>
        <button
          type="button"
          className="help-btn"
          onClick={() => setOnboardingOpen(true)}
          aria-label="Qué es Pedidos & Producción y cómo se conecta"
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
          label="En cola"
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
          label="Imprimiendo ahora"
          value={productionSummary?.em_producao ?? "—"}
          tone="purple"
        />
        <KpiCard
          label="Terminadas hoy"
          value={productionSummary?.concluidas_hoy ?? "—"}
          tone="green"
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
        runsCountByOrder={runsCountByOrder}
        runsByOrder={runsByOrder}
        expandedOrderIds={expandedOrderIds}
        onToggleExpand={handleToggleExpand}
        now={now}
        onRunStart={handleRunStart}
        onRunPause={handleRunPause}
        onRunResume={handleRunResume}
        onRunFinish={handleRunFinish}
        onRunCancel={handleRunCancel}
        onRunReopen={handleRunReopen}
        onRunDelete={handleRunDelete}
        onRunEdit={handleRunEdit}
        onRunCreate={handleRunCreateOpen}
      />

      <ProductionRunForm
        open={runFormOrderId != null || runFormEditing != null}
        run={runFormEditing}
        printers={printers}
        onClose={handleRunFormClose}
        onCreate={handleRunCreateSubmit}
        onUpdate={handleRunUpdateSubmit}
      />
    </div>
  );
}
