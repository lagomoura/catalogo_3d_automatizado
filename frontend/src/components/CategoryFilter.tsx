import type { CategoryNode } from "../types";

interface Props {
  categories: CategoryNode[];
  value: number | null;
  onChange: (categoryId: number | null) => void;
}

export function CategoryFilter({ categories, value, onChange }: Props) {
  return (
    <select
      className="category-filter"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      aria-label="Filtrar por categoría"
    >
      <option value="">Todas las categorías</option>
      {categories.map((root) => (
        <optgroup key={root.id} label={root.name_es}>
          <option value={root.id}>{root.name_es} (todo)</option>
          {root.children.map((child) => (
            <option key={child.id} value={child.id}>
              {`  ${child.name_es}`}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
