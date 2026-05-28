import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createJob, getCatalog, getCategories, getJob } from "../api/client";
import { CatalogGrid } from "../components/CatalogGrid";
import { JobStatus } from "../components/JobStatus";
import { ManualProductForm } from "../components/ManualProductForm";
import { SubmitForm } from "../components/SubmitForm";
import { usePolling } from "../hooks/usePolling";
import type { CatalogItem, CategoryNode, Job, PendingQuote, PendingQuoteDraft } from "../types";
import { CajaPage } from "./caja/CajaPage";
import { CalculadoraPage } from "./calculadora/CalculadoraPage";
import { ClientesPage } from "./clientes/ClientesPage";
import { EstoquePage } from "./estoque/EstoquePage";
import { ImpressorasPage } from "./impressoras/ImpressorasPage";
import { OrcamentoPage } from "./orcamento/OrcamentoPage";
import { PedidosPage } from "./pedidos/PedidosPage";
import { ReportesPage } from "./reportes/ReportesPage";
import { ToastProvider } from "../components/Toast";

const TERMINAL: ReadonlySet<Job["status"]> = new Set(["done", "failed"]);

type Tab =
  | "catalogo"
  | "reportes"
  | "caja"
  | "pedidos"
  | "calculadora"
  | "impressoras"
  | "estoque"
  | "clientes"
  | "orcamento";
type SubmitMode = "makerworld" | "manual";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("catalogo");
  const [submitMode, setSubmitMode] = useState<SubmitMode>("makerworld");
  const [pendingQuote, setPendingQuote] = useState<PendingQuote | null>(null);
  const [pendingQuoteDraft, setPendingQuoteDraft] = useState<PendingQuoteDraft | null>(null);
  const [activeJobs, setActiveJobs] = useState<Job[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [filterCategoryId, setFilterCategoryId] = useState<number | null>(null);

  const refreshCatalog = useCallback(
    async (categoryId: number | null = filterCategoryId) => {
      try {
        const items = await getCatalog(categoryId);
        setCatalog(items);
        setCatalogError(null);
      } catch (err) {
        setCatalogError(err instanceof Error ? err.message : "No se pudo cargar el catálogo");
      }
    },
    [filterCategoryId],
  );

  useEffect(() => {
    void refreshCatalog(filterCategoryId);
  }, [filterCategoryId, refreshCatalog]);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch((err) => {
        console.warn("Failed to load categories", err);
      });
  }, []);

  const handleItemChanged = useCallback((updated: CatalogItem) => {
    setCatalog((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
  }, []);

  const handleItemsRemoved = useCallback((ids: number[]) => {
    const removed = new Set(ids);
    setCatalog((prev) => prev.filter((it) => !removed.has(it.id)));
  }, []);

  const handleQuoteToOrder = useCallback((quote: PendingQuote) => {
    setPendingQuote(quote);
    setTab("pedidos");
  }, []);

  const handleCalcToQuote = useCallback((draft: PendingQuoteDraft) => {
    setPendingQuoteDraft(draft);
    setTab("orcamento");
  }, []);

  const handleSubmit = useCallback(async (url: string, n: number, generate3d: boolean) => {
    const job = await createJob(url, n, generate3d);
    setActiveJobs((prev) => [...prev, job]);
  }, []);

  const hasActive = activeJobs.some((j) => !TERMINAL.has(j.status));

  usePolling(hasActive, 2000, async () => {
    const updated = await Promise.all(
      activeJobs.map(async (j) => {
        if (TERMINAL.has(j.status)) return j;
        try {
          return await getJob(j.job_id);
        } catch {
          return j;
        }
      }),
    );

    setActiveJobs(updated);

    const justFinished = updated.some(
      (j, idx) => TERMINAL.has(j.status) && !TERMINAL.has(activeJobs[idx].status),
    );
    if (justFinished) {
      await refreshCatalog();
      window.setTimeout(() => {
        setActiveJobs((prev) => prev.filter((j) => !TERMINAL.has(j.status) || j.status === "failed"));
      }, 3000);
    }
  });

  return (
    <ToastProvider>
    <div className="app">
      <header className="app__header">
        <div className="app__header-row">
          <h1>Catálogo 3D Automatizado — Admin</h1>
          <Link to="/" className="app__nav-link">← Ver vitrina pública</Link>
        </div>
        <p className="app__subtitle">
          Pega una URL de MakerWorld y genera tarjetas de catálogo con tu identidad visual.
        </p>
      </header>

      <nav className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "catalogo"}
          className={`tab ${tab === "catalogo" ? "tab--active" : ""}`}
          onClick={() => setTab("catalogo")}
        >
          Catálogo
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "calculadora"}
          className={`tab ${tab === "calculadora" ? "tab--active" : ""}`}
          onClick={() => setTab("calculadora")}
        >
          Calculadora & Cotizaciones
        </button>
        <button
          type="button"
          role="tab"
          data-tab="pedidos"
          aria-selected={tab === "pedidos"}
          className={`tab ${tab === "pedidos" ? "tab--active" : ""}`}
          onClick={() => setTab("pedidos")}
        >
          Pedidos & Producción
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "impressoras"}
          className={`tab ${tab === "impressoras" ? "tab--active" : ""}`}
          onClick={() => setTab("impressoras")}
        >
          Impresoras
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "estoque"}
          className={`tab ${tab === "estoque" ? "tab--active" : ""}`}
          onClick={() => setTab("estoque")}
        >
          Inventario
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "clientes"}
          className={`tab ${tab === "clientes" ? "tab--active" : ""}`}
          onClick={() => setTab("clientes")}
        >
          Clientes
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "reportes"}
          className={`tab ${tab === "reportes" ? "tab--active" : ""}`}
          onClick={() => setTab("reportes")}
        >
          Reportes
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "caja"}
          className={`tab ${tab === "caja" ? "tab--active" : ""}`}
          onClick={() => setTab("caja")}
        >
          Control de caja
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "orcamento"}
          className={`tab ${tab === "orcamento" ? "tab--active" : ""}`}
          onClick={() => setTab("orcamento")}
        >
          Generador de Presupuestos (PDF)
        </button>
      </nav>

      {tab === "catalogo" ? (
        <>
          <div className="tabs" role="tablist" aria-label="Modo de carga">
            <button
              type="button"
              role="tab"
              aria-selected={submitMode === "makerworld"}
              className={`tab ${submitMode === "makerworld" ? "tab--active" : ""}`}
              onClick={() => setSubmitMode("makerworld")}
            >
              Importar de MakerWorld
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={submitMode === "manual"}
              className={`tab ${submitMode === "manual" ? "tab--active" : ""}`}
              onClick={() => setSubmitMode("manual")}
            >
              Subir diseño propio
            </button>
          </div>

          {submitMode === "makerworld" ? (
            <SubmitForm onSubmit={handleSubmit} />
          ) : (
            <ManualProductForm
              categories={categories}
              onCreated={() => refreshCatalog()}
            />
          )}

          <JobStatus jobs={activeJobs} />

          {catalogError && <p className="error-banner">{catalogError}</p>}

          <CatalogGrid
            items={catalog}
            categories={categories}
            filterCategoryId={filterCategoryId}
            onFilterChange={setFilterCategoryId}
            onItemChanged={handleItemChanged}
            onItemsRemoved={handleItemsRemoved}
          />
        </>
      ) : tab === "reportes" ? (
        <ReportesPage />
      ) : tab === "caja" ? (
        <CajaPage />
      ) : tab === "calculadora" ? (
        <CalculadoraPage
          onCreateOrder={handleQuoteToOrder}
          onNavigate={(t) => setTab(t as Tab)}
          onCreateQuoteDraft={handleCalcToQuote}
        />
      ) : tab === "impressoras" ? (
        <ImpressorasPage />
      ) : tab === "estoque" ? (
        <EstoquePage />
      ) : tab === "clientes" ? (
        <ClientesPage />
      ) : tab === "orcamento" ? (
        <OrcamentoPage
          onQuoteToOrder={handleQuoteToOrder}
          pendingQuoteDraft={pendingQuoteDraft}
          onPendingQuoteDraftConsumed={() => setPendingQuoteDraft(null)}
        />
      ) : (
        <PedidosPage
          pendingQuote={pendingQuote}
          onPendingQuoteConsumed={() => setPendingQuote(null)}
        />
      )}
    </div>
    </ToastProvider>
  );
}
