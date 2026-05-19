import { useCallback, useMemo, useState } from "react";
import { bulkDeleteCatalogItems, bulkUpdateCatalogItems } from "../api/client";
import type { CatalogItem, CategoryNode } from "../types";
import { CatalogCard } from "./CatalogCard";
import { CategoryFilter } from "./CategoryFilter";

interface Props {
  items: CatalogItem[];
  categories: CategoryNode[];
  filterCategoryId: number | null;
  onFilterChange: (categoryId: number | null) => void;
  onItemChanged: (item: CatalogItem) => void;
  onItemsRemoved: (ids: number[]) => void;
}

export function CatalogGrid({
  items,
  categories,
  filterCategoryId,
  onFilterChange,
  onItemChanged,
  onItemsRemoved,
}: Props) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();
  const visibleItems = useMemo(() => {
    if (!normalizedQuery) return items;
    return items.filter((it) => it.name.toLowerCase().includes(normalizedQuery));
  }, [items, normalizedQuery]);

  const presentIds = useMemo(() => new Set(items.map((it) => it.id)), [items]);
  const validSelected = useMemo(
    () => Array.from(selectedIds).filter((id) => presentIds.has(id)),
    [selectedIds, presentIds],
  );
  const allVisibleSelected =
    visibleItems.length > 0 &&
    visibleItems.every((it) => selectedIds.has(it.id));

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setBulkError(null);
  }, []);

  const toggleSelected = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleItems.map((it) => it.id)));
    }
  }, [allVisibleSelected, visibleItems]);

  const handleBulkDelete = useCallback(async () => {
    if (validSelected.length === 0) return;
    const confirmed = window.confirm(
      `¿Eliminar ${validSelected.length} producto(s) del catálogo? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;
    setBulkBusy(true);
    setBulkError(null);
    try {
      await bulkDeleteCatalogItems(validSelected);
      onItemsRemoved(validSelected);
      exitSelectionMode();
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : "No se pudo eliminar");
    } finally {
      setBulkBusy(false);
    }
  }, [validSelected, onItemsRemoved, exitSelectionMode]);

  const handleBulkAssignCategory = useCallback(
    async (raw: string) => {
      if (validSelected.length === 0 || raw === "") return;
      const isClear = raw === "__clear__";
      const targetId = isClear ? null : Number(raw);
      setBulkBusy(true);
      setBulkError(null);
      try {
        const updated = await bulkUpdateCatalogItems({
          ids: validSelected,
          ...(isClear ? { clear_category: true } : { category_id: targetId }),
        });
        updated.forEach(onItemChanged);
        exitSelectionMode();
      } catch (err) {
        setBulkError(
          err instanceof Error ? err.message : "No se pudo asignar la categoría",
        );
      } finally {
        setBulkBusy(false);
      }
    },
    [validSelected, onItemChanged, exitSelectionMode],
  );

  const emptyMessage = normalizedQuery
    ? `No hay productos que coincidan con "${query.trim()}".`
    : filterCategoryId !== null
      ? "No hay productos en esta categoría."
      : "Aún no hay modelos en el catálogo. Envía una URL para empezar.";

  return (
    <section className="catalog">
      <div className="catalog__toolbar">
        <h2 className="catalog__title">
          Catálogo
          <span className="catalog__count">
            {normalizedQuery
              ? `${visibleItems.length} de ${items.length}`
              : items.length}
          </span>
        </h2>
        <div className="catalog__toolbar-actions">
          <input
            type="search"
            className="catalog__search"
            placeholder="Buscar por nombre…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar productos por nombre"
          />
          <CategoryFilter
            categories={categories}
            value={filterCategoryId}
            onChange={onFilterChange}
          />
          {selectionMode ? (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={exitSelectionMode}
              disabled={bulkBusy}
            >
              Cancelar selección
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setSelectionMode(true)}
              disabled={items.length === 0}
            >
              Seleccionar
            </button>
          )}
        </div>
      </div>

      {selectionMode && (
        <div className="bulk-bar">
          <div className="bulk-bar__left">
            <button
              type="button"
              className="btn btn--small btn--ghost"
              onClick={toggleSelectAll}
              disabled={visibleItems.length === 0 || bulkBusy}
            >
              {allVisibleSelected ? "Deseleccionar todo" : "Seleccionar todo"}
            </button>
            <span className="bulk-bar__count">
              {validSelected.length} seleccionado{validSelected.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="bulk-bar__right">
            <select
              className="category-filter"
              value=""
              onChange={(e) => {
                void handleBulkAssignCategory(e.target.value);
                e.target.value = "";
              }}
              disabled={validSelected.length === 0 || bulkBusy}
              aria-label="Asignar categoría a los seleccionados"
            >
              <option value="">Asignar categoría…</option>
              <option value="__clear__">— Sin categoría —</option>
              {categories.map((root) => (
                <optgroup key={root.id} label={root.name_es}>
                  <option value={root.id}>{root.name_es}</option>
                  {root.children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {`  ${child.name_es}`}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <button
              type="button"
              className="btn btn--danger"
              onClick={handleBulkDelete}
              disabled={validSelected.length === 0 || bulkBusy}
            >
              {bulkBusy
                ? "Procesando…"
                : `Eliminar (${validSelected.length})`}
            </button>
          </div>
        </div>
      )}

      {bulkError && <p className="error-banner">{bulkError}</p>}
      {visibleItems.length === 0 ? (
        <p className="catalog__empty">{emptyMessage}</p>
      ) : (
        <div className="grid">
          {visibleItems.map((item) => (
            <CatalogCard
              key={item.id}
              item={item}
              selectionMode={selectionMode}
              selected={selectedIds.has(item.id)}
              categories={categories}
              onToggleSelect={toggleSelected}
              onItemChanged={onItemChanged}
              onItemDeleted={(id) => onItemsRemoved([id])}
            />
          ))}
        </div>
      )}
    </section>
  );
}
