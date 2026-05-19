import type { CategoryNode, CategoryRef } from "../types";

/**
 * Paleta de acentos con buen contraste sobre fondo claro. Se usa tanto para el
 * texto del badge como (mezclada con transparencia vía color-mix) para el fondo
 * y el borde, de forma que cada categoría sea reconocible de un vistazo.
 */
const PALETTE = [
  "#2563eb", // azul
  "#e8590c", // naranja
  "#0d9268", // verde
  "#7c3aed", // violeta
  "#d6336c", // rosa
  "#0891b2", // cyan
  "#ca8a04", // ámbar
  "#dc2626", // rojo
  "#4f46e5", // índigo
  "#15803d", // esmeralda
  "#9333ea", // púrpura
  "#b45309", // ocre
];

/** Color neutro para productos sin categoría asignada. */
export const NO_CATEGORY_COLOR = "#9ca3af";

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

type CategoryLike = Pick<CategoryRef, "id" | "name_es"> | Pick<CategoryNode, "id" | "name_es">;

/**
 * Devuelve un color estable para la categoría. La misma categoría siempre
 * obtiene el mismo color (se hashea el nombre). Si no hay categoría, devuelve
 * el gris neutro.
 */
export function getCategoryColor(category: CategoryLike | null | undefined): string {
  if (!category) return NO_CATEGORY_COLOR;
  const key = category.name_es?.trim() || String(category.id);
  return PALETTE[hashString(key) % PALETTE.length];
}
