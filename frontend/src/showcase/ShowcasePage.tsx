import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getCatalog, getCategories } from "../api/client";
import type { CatalogItem, CategoryNode } from "../types";
import { ShowcaseGrid } from "./ShowcaseGrid";
import { ShowcaseSidebar } from "./ShowcaseSidebar";
import { ShowcaseToolbar, type SortKey } from "./ShowcaseToolbar";

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
    getCategories()
      .then(setCategories)
      .catch((err) => console.warn("Failed to load categories", err));
  }, []);

  useEffect(() => {
    setLoading(true);
    getCatalog(categoryId)
      .then((data) => {
        setItems(data);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "No se pudo cargar el catálogo");
      })
      .finally(() => setLoading(false));
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
          <h1 className="showcase__title">Vitrina 3D</h1>
          <Link to="/admin" className="showcase__admin-link" aria-label="Acceso administrador">
            Admin
          </Link>
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
            <p className="showcase__loading">Cargando…</p>
          ) : (
            <ShowcaseGrid items={visibleItems} />
          )}
        </main>
      </div>
    </div>
  );
}
