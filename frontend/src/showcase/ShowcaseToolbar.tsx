export type SortKey = "recent" | "name";

interface Props {
  query: string;
  onQueryChange: (q: string) => void;
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
  resultCount: number;
}

export function ShowcaseToolbar({ query, onQueryChange, sort, onSortChange, resultCount }: Props) {
  return (
    <div className="showcase__toolbar">
      <input
        type="search"
        className="showcase__search"
        placeholder="Buscar por nombre…"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
      />
      <div className="showcase__toolbar-right">
        <span className="showcase__count">{resultCount} resultado{resultCount === 1 ? "" : "s"}</span>
        <label className="showcase__sort-label">
          Ordenar:
          <select
            className="showcase__sort"
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
          >
            <option value="recent">Más recientes</option>
            <option value="name">Nombre (A‑Z)</option>
          </select>
        </label>
      </div>
    </div>
  );
}
