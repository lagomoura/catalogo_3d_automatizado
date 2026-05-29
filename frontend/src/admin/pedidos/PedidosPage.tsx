import { useCallback, useEffect, useMemo, useState } from "react";
import {
  advanceOrder,
  appendOrderCost,
  cancelOrderRuns,
  cancelProductionRun,
  createOrder,
  createProductionRun,
  deleteOrder,
  finishProductionRun,
  getCatalog,
  getContacts,
  getOrders,
  getOrdersSummary,
  getPrinters,
  getProductionRuns,
  getProductionSummary,
  pauseProductionRun,
  replaceOrderCosts,
  requeueProductionRun,
  resumeProductionRun,
  setOrderPayment,
  startProductionRun,
  updateOrder,
  updateProductionRun,
  type OrderCostItemInput,
  type OrderCreatePayload,
  type OrderUpdatePayload,
} from "../../api/client";
import type {
  CatalogItem,
  Contact,
  Order,
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
import { OrderEditModal } from "./OrderEditModal";
import { ExtraCostModal } from "./ExtraCostModal";
import { useProductionTicker } from "./useProductionTicker";
import { usePolling } from "../../hooks/usePolling";
import { KpiBar } from "./board/KpiBar";
import { PrinterHeroGrid } from "./board/PrinterHeroGrid";
import { BoardColumns } from "./board/BoardColumns";
import { PiecesModal } from "./board/PiecesModal";
import { EntregadosPanel } from "./board/EntregadosPanel";
import type { HeroOrderActions } from "./board/PrinterHeroCard";
import "./pedidos.css";
import "./board/board.css";

interface PedidosPageProps {
  pendingQuote?: PendingQuote | null;
  onPendingQuoteConsumed?: () => void;
  /**
   * Salta a la Calculadora con el producto pre-seleccionado para cotizar
   * antes de crear el pedido (flujo unificado Fase A).
   */
  onCotizarInCalculadora?: (catalogItemId: number | null) => void;
}

const ACTIVE_RUN = new Set<ProductionRun["status"]>([
  "PENDENTE",
  "EM_PRODUCAO",
  "PAUSADA",
]);

export function PedidosPage({
  pendingQuote = null,
  onPendingQuoteConsumed,
  onCotizarInCalculadora,
}: PedidosPageProps = {}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [filterProductId, setFilterProductId] = useState<number | null>(null);
  const [, setSummary] = useState<OrderSummary | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  // Vista: tablero operativo vs. histórico de entregados.
  const [estadoView, setEstadoView] = useState<"tablero" | "entregados">(
    "tablero",
  );
  // Filtro de pago (aplica a "Listos para entrega" y "Entregados").
  const [payFilter, setPayFilter] = useState<"todos" | "pagado" | "pendiente">(
    "todos",
  );

  const [runs, setRuns] = useState<ProductionRun[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [, setProductionSummary] = useState<ProductionSummary | null>(null);
  const [editing, setEditing] = useState<Order | null>(null);
  const [extraFor, setExtraFor] = useState<Order | null>(null);
  const [extraBusy, setExtraBusy] = useState(false);
  const [piecesForOrderId, setPiecesForOrderId] = useState<number | null>(null);
  const { now } = useProductionTicker();

  const refreshOrders = useCallback(async () => {
    const [list, sum, runsList, prodSum] = await Promise.all([
      getOrders({ catalog_item_id: filterProductId ?? undefined }),
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

  // Llegada desde la Calculadora con una cotización: abrir el formulario y
  // saltar a la vista tablero para que el pedido se cargue sin pasos extra.
  useEffect(() => {
    if (pendingQuote) {
      setFormOpen(true);
      setEstadoView("tablero");
    }
  }, [pendingQuote]);

  // Pull silencioso cada 30s para reflejar cambios de runs disparados en otra
  // pestaña o por otro usuario. usePolling pausa solo cuando la pestaña está en
  // background (ahorra red/batería en mobile).
  usePolling(true, 30000, refreshOrders);

  const ordersById = useMemo(() => {
    const m = new Map<number, Order>();
    for (const o of orders) m.set(o.id, o);
    return m;
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

  const matchOrder = useCallback(
    (orderId: number | null | undefined): boolean => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      if (orderId == null) return false;
      const o = ordersById.get(orderId);
      if (!o) return false;
      return [o.catalog_item?.name, o.contact?.name, o.person_label, o.note, String(o.id)]
        .filter(Boolean)
        .some((s) => s!.toLowerCase().includes(q));
    },
    [query, ordersById],
  );

  // Cola de producción (order-centric): pedidos CREADO, fijados (★) primero,
  // luego por el sort_order mínimo de sus piezas pendientes.
  const queueOrders = useMemo(() => {
    const arr = orders.filter(
      (o) => o.order_status === "CREADO" && matchOrder(o.id),
    );
    const minSort = (o: Order) => {
      const pend = (runsByOrder.get(o.id) ?? []).filter(
        (r) => r.status === "PENDENTE",
      );
      return pend.length
        ? Math.min(...pend.map((r) => r.sort_order))
        : Number.MAX_SAFE_INTEGER;
    };
    arr.sort(
      (a, b) =>
        (a.is_pinned === b.is_pinned ? 0 : a.is_pinned ? -1 : 1) ||
        minSort(a) - minSort(b) ||
        a.id - b.id,
    );
    return arr;
  }, [orders, runsByOrder, matchOrder]);

  const payOk = useCallback(
    (o: Order) =>
      payFilter === "todos" ||
      (payFilter === "pagado" && o.payment_status === "PAGADO") ||
      (payFilter === "pendiente" && o.payment_status === "PENDIENTE"),
    [payFilter],
  );

  // Listos para entrega: pedidos EJECUTADO + pedidos EJECUTANDO cuya producción
  // ya terminó (todas las piezas CONCLUIDA/CANCELADA, ninguna activa) → "Marcar listo".
  const deliveryItems = useMemo(() => {
    const out: { order: Order; awaitingReady: boolean }[] = [];
    for (const o of orders) {
      if (!matchOrder(o.id) || !payOk(o)) continue;
      if (o.order_status === "EJECUTADO") {
        out.push({ order: o, awaitingReady: false });
      } else if (o.order_status === "EJECUTANDO") {
        const rs = runsByOrder.get(o.id) ?? [];
        const done =
          rs.length > 0 &&
          rs.every((r) => !ACTIVE_RUN.has(r.status)) &&
          rs.some((r) => r.status === "CONCLUIDA");
        if (done) out.push({ order: o, awaitingReady: true });
      }
    }
    return out;
  }, [orders, runsByOrder, matchOrder, payOk]);

  // Histórico de entregados (vista dedicada), con filtro de pago + búsqueda.
  const entregados = useMemo(
    () =>
      orders
        .filter(
          (o) => o.order_status === "ENTREGADO" && matchOrder(o.id) && payOk(o),
        )
        .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1)),
    [orders, matchOrder, payOk],
  );

  // Impresoras ocupadas (con una pieza activa: EM_PRODUCAO o PAUSADA — una pieza
  // pausada sigue físicamente en la impresora) → el resto está libre.
  const busyPrinterIds = useMemo(() => {
    const s = new Set<number>();
    for (const r of runs) {
      if (
        (r.status === "EM_PRODUCAO" || r.status === "PAUSADA") &&
        r.printer?.id != null
      )
        s.add(r.printer.id);
    }
    return s;
  }, [runs]);

  const idlePrinters = useMemo(
    () => printers.filter((p) => !p.archived && !busyPrinterIds.has(p.id)),
    [printers, busyPrinterIds],
  );

  // ¿Hay alguna pieza pendiente vinculada a un pedido? (para "Iniciar próximo").
  // Excluye runs huérfanas (sin order) que no representan trabajo de la cola.
  const hasQueue = useMemo(
    () => runs.some((r) => r.status === "PENDENTE" && r.order?.id != null),
    [runs],
  );

  // ¿Se puede iniciar un pedido ahora? Hay pieza pendiente y, o bien su
  // impresora asignada está libre, o hay alguna impresora libre para asignarle.
  const canStartByOrder = useMemo(() => {
    const m = new Map<number, boolean>();
    for (const o of queueOrders) {
      const pend = (runsByOrder.get(o.id) ?? []).filter(
        (r) => r.status === "PENDENTE",
      );
      const first = pend.find((r) => r.printer?.id != null) ?? pend[0];
      if (!first) {
        m.set(o.id, false);
        continue;
      }
      const assigned = first.printer?.id ?? null;
      m.set(
        o.id,
        assigned != null
          ? !busyPrinterIds.has(assigned)
          : idlePrinters.length > 0,
      );
    }
    return m;
  }, [queueOrders, runsByOrder, busyPrinterIds, idlePrinters]);

  const run = useCallback(
    async (action: () => Promise<unknown>) => {
      setError(null);
      try {
        await action();
        await Promise.all([refreshOrders(), getContacts().then(setContacts)]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo completar la acción");
      }
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

  const handleCreate = useCallback(
    async (p: OrderCreatePayload) => {
      const order = await createOrder(p);
      await Promise.all([refreshOrders(), getContacts().then(setContacts)]);
      // El pedido ya alimentó la cola: cerramos el form y mostramos el tablero.
      setFormOpen(false);
      setEstadoView("tablero");
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

  // Reordenar la cola (drag&drop de pedidos): reasigna el sort_order de las
  // piezas pendientes en bloques según el nuevo orden de los pedidos. Persiste
  // solo lo que cambió, con mutación optimista local y rollback si falla.
  const handleReorder = useCallback(
    (orderedOrderIds: number[]) => {
      const updates: { id: number; sort_order: number }[] = [];
      orderedOrderIds.forEach((oid, idx) => {
        const pend = (runsByOrder.get(oid) ?? [])
          .filter((r) => r.status === "PENDENTE")
          .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
        pend.forEach((r, j) => {
          const so = (idx + 1) * 100 + j;
          if (r.sort_order !== so) updates.push({ id: r.id, sort_order: so });
        });
      });
      if (updates.length === 0) return;
      const set = new Map(updates.map((u) => [u.id, u.sort_order]));
      setRuns((prev) =>
        prev.map((r) => (set.has(r.id) ? { ...r, sort_order: set.get(r.id)! } : r)),
      );
      Promise.all(
        updates.map((u) => updateProductionRun(u.id, { sort_order: u.sort_order })),
      ).catch((e) => {
        setError(e instanceof Error ? e.message : "No se pudo reordenar la cola");
        void refreshOrders();
      });
    },
    [runsByOrder, refreshOrders],
  );

  // Arranca un run asignándole una impresora si no tiene (auto-assign): primero
  // respeta la asignada; si no hay, usa la impresora libre indicada o la primera
  // disponible. Sin impresora libre → error claro.
  const startRun = useCallback(
    (run: ProductionRun, preferPrinterId?: number) =>
      runAction(async () => {
        let printerId = run.printer?.id ?? null;
        if (printerId == null) {
          printerId =
            preferPrinterId ?? idlePrinters[0]?.id ?? null;
          if (printerId == null) {
            throw new Error("No hay impresora libre para iniciar esta pieza.");
          }
          await updateProductionRun(run.id, { printer_id: printerId });
        }
        await startProductionRun(run.id);
      }),
    [runAction, idlePrinters],
  );

  // "Iniciar próximo" desde una impresora libre: toma la primera pieza pendiente
  // (priorizando las ya asignadas a esa impresora) y la arranca en ella.
  const handleStartNext = useCallback(
    (printerId: number) => {
      const pend = runs
        .filter((r) => r.status === "PENDENTE" && r.order?.id != null)
        .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
      const next =
        pend.find((r) => r.printer?.id === printerId) ??
        pend.find((r) => r.printer?.id == null) ??
        pend[0];
      if (next) void startRun(next, printerId);
    },
    [runs, startRun],
  );

  // Iniciar un pedido = arrancar su primera pieza pendiente (auto-assign).
  const handleStartOrder = useCallback(
    (orderId: number) => {
      const pend = (runsByOrder.get(orderId) ?? [])
        .filter((r) => r.status === "PENDENTE")
        .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
      const first = pend.find((r) => r.printer?.id != null) ?? pend[0];
      if (first) void startRun(first);
    },
    [runsByOrder, startRun],
  );

  // Volver a la cola: deshace el inicio de una pieza (EM_PRODUCAO/PAUSADA →
  // PENDENTE), libera la impresora y descarta el progreso. Pide confirmación
  // porque se pierde el cronómetro. Reutilizado por el hero y por PiecesModal.
  const handleRequeueRun = useCallback(
    (id: number) => {
      if (
        !window.confirm(
          "¿Devolver esta pieza a la cola? Se descarta el progreso y el cronómetro vuelve a cero.",
        )
      )
        return;
      void runAction(() => requeueProductionRun(id));
    },
    [runAction],
  );

  const heroActions: HeroOrderActions = useMemo(
    () => ({
      onEditar: (o) => setEditing(o),
      onCobrar: (o) =>
        void run(() => setOrderPayment(o.id, o.payment_status !== "PAGADO")),
      onCostoExtra: (o) => setExtraFor(o),
      onGestionarPiezas: (o) => setPiecesForOrderId(o.id),
      onCancelarRun: (id) => void runAction(() => cancelProductionRun(id)),
      onRequeueRun: handleRequeueRun,
    }),
    [run, runAction, handleRequeueRun],
  );

  const deleteOrderWithRuns = useCallback(async (id: number) => {
    if (!window.confirm("¿Borrar este pedido?")) return;
    try {
      await deleteOrder(id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.startsWith("409") && /cancel_runs_then_delete/.test(msg)) {
        const m = msg.match(/"active_runs":\s*\[([^\]]*)\]/);
        const count = m ? (m[1].match(/"id"/g)?.length ?? 0) : 0;
        const ok = window.confirm(
          `Este pedido tiene ${count} producción(es) activa(s). ` +
            `Cancelar las producciones y eliminar el pedido?`,
        );
        if (!ok) return;
        await cancelOrderRuns(id);
        await deleteOrder(id);
      } else {
        throw e;
      }
    }
  }, []);

  // Handlers de piezas (PiecesModal): asignar impresora / minutos, agregar,
  // cancelar e iniciar piezas individuales.
  const handlePieceUpdate = useCallback(
    async (id: number, payload: ProductionRunUpdatePayload) => {
      await updateProductionRun(id, payload);
      await refreshOrders();
    },
    [refreshOrders],
  );
  const handlePieceCreate = useCallback(
    async (orderId: number, payload: ProductionRunCreatePayload) => {
      await createProductionRun({ ...payload, order_id: orderId });
      await refreshOrders();
    },
    [refreshOrders],
  );

  const sortedCatalog = useMemo(
    () => [...catalog].sort((a, b) => a.name.localeCompare(b.name)),
    [catalog],
  );

  const editingOrder = editing
    ? orders.find((o) => o.id === editing.id) ?? editing
    : null;
  const extraOrder = extraFor
    ? orders.find((o) => o.id === extraFor.id) ?? extraFor
    : null;

  return (
    <div className="pedidos pb">
      <header className="pedidos__header">
        <div>
          <p className="pedidos__eyebrow">Operación</p>
          <h2>Pedidos & Producción</h2>
          <p className="pedidos__subtitle">
            Cada impresora muestra su trabajo en vivo. Reordená la cola
            arrastrando, iniciá la próxima pieza y entregá cuando esté lista.
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

      <OnboardingModal open={onboardingOpen} onClose={() => setOnboardingOpen(false)} />

      {error && <p className="error-banner">{error}</p>}

      <div className="pb-toolbar">
        <button
          type="button"
          className="btn-primary"
          onClick={() => setFormOpen((v) => !v)}
        >
          {formOpen ? "× Cerrar" : "＋ Nuevo pedido"}
        </button>
        <input
          className="pb-search"
          type="search"
          placeholder="Buscar por cliente, producto, nota, #pedido…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="pb-toolbar__spacer" />
        <select
          aria-label="Vista"
          className="pb-select"
          value={estadoView}
          onChange={(e) =>
            setEstadoView(e.target.value as "tablero" | "entregados")
          }
        >
          <option value="tablero">Tablero (activos)</option>
          <option value="entregados">Entregados</option>
        </select>
        <select
          aria-label="Filtrar por pago"
          className="pb-select"
          value={payFilter}
          onChange={(e) =>
            setPayFilter(e.target.value as "todos" | "pagado" | "pendiente")
          }
        >
          <option value="todos">Pago: todos</option>
          <option value="pendiente">Pago pendiente</option>
          <option value="pagado">Pagado</option>
        </select>
        <select
          aria-label="Filtrar por producto"
          className="pb-select"
          value={filterProductId == null ? "" : String(filterProductId)}
          onChange={(e) =>
            setFilterProductId(e.target.value ? Number(e.target.value) : null)
          }
        >
          <option value="">Todos los productos</option>
          {sortedCatalog.map((it) => (
            <option key={it.id} value={String(it.id)}>
              {it.name}
            </option>
          ))}
        </select>
      </div>

      {formOpen && (
        <OrderForm
          catalog={catalog}
          contacts={contacts}
          onCreate={handleCreate}
          onCotizarInCalculadora={onCotizarInCalculadora}
          pendingQuote={pendingQuote}
          onPendingQuoteConsumed={onPendingQuoteConsumed}
        />
      )}

      <KpiBar orders={orders} />

      {estadoView === "tablero" ? (
        <>
          <PrinterHeroGrid
            printers={printers}
            runs={runs}
            ordersById={ordersById}
            runsByOrder={runsByOrder}
            now={now}
            hasQueue={hasQueue}
            onPause={(id) => void runAction(() => pauseProductionRun(id))}
            onResume={(id) => void runAction(() => resumeProductionRun(id))}
            onFinish={(id) => void runAction(() => finishProductionRun(id))}
            onStartNext={handleStartNext}
            orderActions={heroActions}
          />

          <BoardColumns
            queueOrders={queueOrders}
            runsByOrder={runsByOrder}
            allRuns={runs}
            canStartByOrder={canStartByOrder}
            deliveryItems={deliveryItems}
            now={now}
            onReorder={handleReorder}
            onStartOrder={handleStartOrder}
            onGestionarPiezas={(o) => setPiecesForOrderId(o.id)}
            onAdvance={(id) => void run(() => advanceOrder(id))}
            onPayment={(id, paid) => void run(() => setOrderPayment(id, paid))}
            onEditar={(o) => setEditing(o)}
            onCostoExtra={(o) => setExtraFor(o)}
            onDelete={(id) => void run(() => deleteOrderWithRuns(id))}
          />
        </>
      ) : (
        <section className="pb-col" aria-label="Entregados">
          <header className="pb-col__head">
            <span className="pb-col__icon" aria-hidden="true">✓</span>
            Entregados <span className="pb-col__count">{entregados.length}</span>
          </header>
          <EntregadosPanel
            orders={entregados}
            onPayment={(id, paid) => void run(() => setOrderPayment(id, paid))}
            onEditar={(o) => setEditing(o)}
          />
        </section>
      )}

      {editingOrder && (
        <OrderEditModal
          order={editingOrder}
          contacts={contacts}
          onClose={() => setEditing(null)}
          onSave={handleUpdate}
          onSaveCosts={handleSaveCosts}
        />
      )}

      {extraOrder && (
        <ExtraCostModal
          order={extraOrder}
          busy={extraBusy}
          onClose={() => setExtraFor(null)}
          onSubmit={async ({ concept, amount }) => {
            setExtraBusy(true);
            try {
              await handleAppendCost(extraOrder.id, {
                concept,
                amount,
                per_unit: false,
              });
              setExtraFor(null);
            } finally {
              setExtraBusy(false);
            }
          }}
        />
      )}

      {piecesForOrderId != null && ordersById.get(piecesForOrderId) && (
        <PiecesModal
          order={ordersById.get(piecesForOrderId)!}
          runs={runsByOrder.get(piecesForOrderId) ?? []}
          printers={printers}
          onClose={() => setPiecesForOrderId(null)}
          onUpdate={handlePieceUpdate}
          onCreate={handlePieceCreate}
          onCancel={(id) => void runAction(() => cancelProductionRun(id))}
          onStart={(id) => void runAction(() => startProductionRun(id))}
          onRequeue={handleRequeueRun}
        />
      )}
    </div>
  );
}
