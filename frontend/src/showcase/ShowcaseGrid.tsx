import type { CatalogItem } from "../types";
import { ShowcaseCard } from "./ShowcaseCard";
import { AuraMark } from "../components/Brand";

interface Props {
  items: CatalogItem[];
  /** Si hay filtros activos (categoría o búsqueda), ofrecemos limpiarlos. */
  hasFilters?: boolean;
  onClearFilters?: () => void;
}

export function ShowcaseGrid({ items, hasFilters = false, onClearFilters }: Props) {
  if (items.length === 0) {
    return (
      <div className="showcase__empty">
        <AuraMark size={56} />
        <p className="showcase__empty-text">
          {hasFilters
            ? "No hay productos que coincidan con tu búsqueda."
            : "Todavía no hay productos en la vitrina."}
        </p>
        {hasFilters && onClearFilters && (
          <button type="button" className="btn-primary" onClick={onClearFilters}>
            Quitar filtros
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="showcase__grid">
      {items.map((item) => (
        <ShowcaseCard key={item.id} item={item} />
      ))}
    </div>
  );
}
