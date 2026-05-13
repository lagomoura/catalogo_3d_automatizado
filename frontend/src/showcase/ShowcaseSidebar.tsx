import { useState } from "react";
import type { CategoryNode } from "../types";

interface Props {
  categories: CategoryNode[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}

export function ShowcaseSidebar({ categories, selectedId, onSelect }: Props) {
  return (
    <aside className="showcase__sidebar">
      <h2 className="showcase__sidebar-title">Categorías</h2>
      <ul className="showcase__tree">
        <li>
          <button
            type="button"
            className={`showcase__tree-item${selectedId === null ? " is-active" : ""}`}
            onClick={() => onSelect(null)}
          >
            Todas
          </button>
        </li>
        {categories.map((cat) => (
          <CategoryNodeItem
            key={cat.id}
            node={cat}
            selectedId={selectedId}
            onSelect={onSelect}
            level={0}
          />
        ))}
      </ul>
    </aside>
  );
}

interface NodeProps {
  node: CategoryNode;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  level: number;
}

function CategoryNodeItem({ node, selectedId, onSelect, level }: NodeProps) {
  const hasChildren = node.children.length > 0;
  const isSelectedSelf = selectedId === node.id;
  const containsSelected = hasChildren && nodeContains(node, selectedId);
  const [open, setOpen] = useState<boolean>(containsSelected);

  return (
    <li>
      <div className="showcase__tree-row" style={{ paddingLeft: `${level * 12}px` }}>
        {hasChildren ? (
          <button
            type="button"
            className="showcase__tree-toggle"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Colapsar" : "Expandir"}
          >
            {open ? "▾" : "▸"}
          </button>
        ) : (
          <span className="showcase__tree-toggle showcase__tree-toggle--empty" />
        )}
        <button
          type="button"
          className={`showcase__tree-item${isSelectedSelf ? " is-active" : ""}`}
          onClick={() => onSelect(node.id)}
        >
          {node.name_es}
        </button>
      </div>
      {hasChildren && open && (
        <ul className="showcase__tree-children">
          {node.children.map((child) => (
            <CategoryNodeItem
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function nodeContains(node: CategoryNode, id: number | null): boolean {
  if (id === null) return false;
  if (node.id === id) return true;
  return node.children.some((c) => nodeContains(c, id));
}
