import { useEffect, useMemo, useState } from "react";
import { getCatalog, getCategories } from "../api/client";
import type { CatalogItem, CategoryNode } from "../types";
import { ShowcaseGrid } from "./ShowcaseGrid";
import { ShowcaseGridSkeleton } from "../components/Skeleton";
import { ShowcaseSidebar } from "./ShowcaseSidebar";
import { ShowcaseToolbar, type SortKey } from "./ShowcaseToolbar";
import { Logo, ThemeToggle } from "../components/Brand";

export default function ShowcasePage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    getCategories(ctrl.signal)
      .then(setCategories)
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        console.warn("Failed to load categories", err);
      });
    return () => ctrl.abort();
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    getCatalog(categoryId, { signal: ctrl.signal })
      .then((data) => {
        setItems(data);
        setError(null);
      })
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        setError(err instanceof Error ? err.message : "No se pudo cargar el catálogo");
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [categoryId]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 200);
    return () => window.clearTimeout(t);
  }, [query]);

  const visibleItems = useMemo(() => {
    let result = items;
    if (debouncedQuery) {
      result = result.filter((it) => it.name.toLowerCase().includes(debouncedQuery));
    }
    if (sort === "name") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
    }
    // "recent" keeps the backend-provided order (created_at desc)
    return result;
  }, [items, debouncedQuery, sort]);

  return (
    <div className="showcase">
      <header className="showcase__header">
        <div className="showcase__header-row">
          <Logo size={34} subtitle="Tienda 3D" />
          <div className="app__header-actions">
            <ThemeToggle />
          </div>
        </div>
        <p className="showcase__subtitle">
          Explora todos los modelos disponibles. Filtra por categoría o busca por nombre.
        </p>
      </header>

      <div className="showcase__layout">
        <ShowcaseSidebar
          categories={categories}
          selectedId={categoryId}
          onSelect={setCategoryId}
        />
        <main className="showcase__main">
          <ShowcaseToolbar
            query={query}
            onQueryChange={setQuery}
            sort={sort}
            onSortChange={setSort}
            resultCount={visibleItems.length}
          />
          {error && <p className="error-banner">{error}</p>}
          {loading ? (
            <ShowcaseGridSkeleton />
          ) : (
            <ShowcaseGrid
              items={visibleItems}
              hasFilters={categoryId != null || debouncedQuery.length > 0}
              onClearFilters={() => {
                setCategoryId(null);
                setQuery("");
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
