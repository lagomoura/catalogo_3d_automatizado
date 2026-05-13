import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createJob, getCatalog, getCategories, getJob } from "../api/client";
import { CatalogGrid } from "../components/CatalogGrid";
import { JobStatus } from "../components/JobStatus";
import { SubmitForm } from "../components/SubmitForm";
import { usePolling } from "../hooks/usePolling";
import type { CatalogItem, CategoryNode, Job } from "../types";

const TERMINAL: ReadonlySet<Job["status"]> = new Set(["done", "failed"]);

export default function AdminPage() {
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

      <SubmitForm onSubmit={handleSubmit} />

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
    </div>
  );
}
