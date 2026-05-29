import type { CategoryNode, CategoryRef } from "../types";

/**
 * Paleta de acentos con buen contraste sobre fondo claro. Se usa tanto para el
 * texto del badge como (mezclada con transparencia vía color-mix) para el fondo
 * y el borde, de forma que cada categoría sea reconocible de un vistazo.
 */
const PALETTE = [
  "#0b756c", // teal (marca)
  "#4f7a0d", // lima (marca)
  "#4f46e5", // índigo
  "#c2410c", // naranja
  "#be185d", // rosa
  "#0e7490", // cyan
  "#b45309", // ámbar
  "#7c3aed", // violeta
  "#be123c", // rojo
  "#047857", // esmeralda
  "#0369a1", // azul
  "#a21caf", // fucsia
];

/** Color neutro para productos sin categoría asignada. */
export const NO_CATEGORY_COLOR = "#94a3b8";

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
