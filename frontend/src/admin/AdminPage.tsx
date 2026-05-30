import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createJob, getCatalog, getCategories, getJob } from "../api/client";
import { CatalogGrid } from "../components/CatalogGrid";
import { JobStatus } from "../components/JobStatus";
import { ManualProductForm } from "../components/ManualProductForm";
import { SubmitForm } from "../components/SubmitForm";
import { usePolling } from "../hooks/usePolling";
import type { CatalogItem, CategoryNode, Job, PendingQuote, PendingQuoteDraft } from "../types";
import { ToastProvider } from "../components/Toast";
import { Logo, ThemeToggle } from "../components/Brand";
import { AccountMenu } from "./AccountMenu";
import { AdminSidebar, type Tab } from "./AdminSidebar";

// Las páginas de cada tab se cargan bajo demanda: recortan el bundle inicial
// del admin (sobre todo Caja/Reportes, que arrastran recharts). Son named
// exports, por eso el `.then(m => ({ default: ... }))`.
const ReportesPage = lazy(() =>
  import("./reportes/ReportesPage").then((m) => ({ default: m.ReportesPage })),
);
const CajaPage = lazy(() =>
  import("./caja/CajaPage").then((m) => ({ default: m.CajaPage })),
);
const CalculadoraPage = lazy(() =>
  import("./calculadora/CalculadoraPage").then((m) => ({ default: m.CalculadoraPage })),
);
const ImpressorasPage = lazy(() =>
  import("./impressoras/ImpressorasPage").then((m) => ({ default: m.ImpressorasPage })),
);
const EstoquePage = lazy(() =>
  import("./estoque/EstoquePage").then((m) => ({ default: m.EstoquePage })),
);
const ClientesPage = lazy(() =>
  import("./clientes/ClientesPage").then((m) => ({ default: m.ClientesPage })),
);
const OrcamentoPage = lazy(() =>
  import("./orcamento/OrcamentoPage").then((m) => ({ default: m.OrcamentoPage })),
);
const PedidosPage = lazy(() =>
  import("./pedidos/PedidosPage").then((m) => ({ default: m.PedidosPage })),
);

const TERMINAL: ReadonlySet<Job["status"]> = new Set(["done", "failed"]);

type SubmitMode = "makerworld" | "manual";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("reportes");
  const [submitMode, setSubmitMode] = useState<SubmitMode>("makerworld");
  const [pendingQuote, setPendingQuote] = useState<PendingQuote | null>(null);
  const [pendingQuoteDraft, setPendingQuoteDraft] = useState<PendingQuoteDraft | null>(null);
  /**
   * Producto que el usuario seleccionó en Pedidos antes de saltar a la
   * Calculadora a cotizar. La Calculadora lo pre-selecciona si está presente
   * (Fase A: flujo unificado).
   */
  const [pendingCotizarItemId, setPendingCotizarItemId] = useState<number | null>(null);
  const [activeJobs, setActiveJobs] = useState<Job[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [filterCategoryId, setFilterCategoryId] = useState<number | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Desktop: el sidebar se puede ocultar; la preferencia se recuerda.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("admin-sidebar-collapsed") === "1";
    } catch {
      return false;
    }
  });
  // Viewport: decide si la hamburguesa abre el drawer (móvil) o colapsa (desktop).
  const [isMobile, setIsMobile] = useState(() =>
    window.matchMedia("(max-width: 900px)").matches,
  );

  const refreshCatalog = useCallback(
    async (categoryId: number | null = filterCategoryId) => {
      try {
        const items = await getCatalog(categoryId, {
          include_archived: showArchived,
        });
        setCatalog(items);
        setCatalogError(null);
      } catch (err) {
        setCatalogError(err instanceof Error ? err.message : "No se pudo cargar el catálogo");
      }
    },
    [filterCategoryId, showArchived],
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

  // Cierre del drawer estable: evita re-suscribir el efecto del sidebar.
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    try {
      localStorage.setItem("admin-sidebar-collapsed", sidebarCollapsed ? "1" : "0");
    } catch {
      /* almacenamiento no disponible — se ignora */
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // En móvil la hamburguesa abre el drawer; en desktop oculta/muestra el sidebar.
  const onToggleMenu = useCallback(() => {
    if (window.matchMedia("(max-width: 900px)").matches) {
      setMenuOpen(true);
    } else {
      setSidebarCollapsed((c) => !c);
    }
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
    <div className="app app--admin">
      <header className="app__header">
        <div className="app__header-row">
          <div className="app__header-left">
            <button
              type="button"
              className="app__menu-toggle"
              aria-label={
                isMobile
                  ? "Abrir menú de navegación"
                  : sidebarCollapsed
                    ? "Mostrar menú lateral"
                    : "Ocultar menú lateral"
              }
              aria-expanded={isMobile ? menuOpen : !sidebarCollapsed}
              aria-controls="admin-nav"
              onClick={onToggleMenu}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>
            <span className="app__header-divider" aria-hidden="true" />
            <Logo size={32} subtitle="Panel de gestión" />
          </div>
          <div className="app__header-actions">
            <AccountMenu />
            <ThemeToggle />
            <Link to="/" className="app__nav-link">← Ver vitrina pública</Link>
          </div>
        </div>
      </header>

      <div className={`admin-layout ${sidebarCollapsed ? "admin-layout--collapsed" : ""}`}>
        <AdminSidebar
          tab={tab}
          onSelect={setTab}
          open={menuOpen}
          onClose={closeMenu}
        />
        <main className="admin-main" tabIndex={-1}>
        <Suspense fallback={<p className="showcase__loading">Cargando…</p>}>
      {tab === "catalogo" ? (
        <>
          <p className="app__subtitle">
            Pega una URL de MakerWorld y genera tarjetas de catálogo con tu identidad visual.
          </p>
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
            showArchived={showArchived}
            onShowArchivedChange={setShowArchived}
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
          preselectedCatalogItemId={pendingCotizarItemId}
          onPreselectionConsumed={() => setPendingCotizarItemId(null)}
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
          onCotizarInCalculadora={(catalogItemId) => {
            setPendingCotizarItemId(catalogItemId);
            setTab("calculadora");
          }}
        />
      )}
      </Suspense>
        </main>
      </div>
    </div>
    </ToastProvider>
  );
}
