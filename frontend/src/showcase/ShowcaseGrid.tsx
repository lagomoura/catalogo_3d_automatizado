import type { CatalogItem } from "../types";
import { ShowcaseCard } from "./ShowcaseCard";

interface Props {
  items: CatalogItem[];
}

export function ShowcaseGrid({ items }: Props) {
  if (items.length === 0) {
    return (
      <p className="showcase__empty">
        No hay productos que coincidan con los filtros seleccionados.
      </p>
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
