import { useState } from "react";
import {
  createTxCategory,
  deleteTxCategory,
  updateTxCategory,
} from "../../api/client";
import type { TxCategory, TxCategoryKind } from "../../types";

interface Props {
  categories: TxCategory[];
  onChanged: () => void;
}

const KINDS: { kind: TxCategoryKind; title: string; hint: string }[] = [
  {
    kind: "credit",
    title: "Categorías de ingreso",
    hint: "Para clasificar las ventas / cobros.",
  },
  {
    kind: "debit",
    title: "Categorías de egreso",
    hint: "Cada gasto se vincula a una de estas.",
  },
];

export function CategoryManager({ categories, onChanged }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Record<TxCategoryKind, string>>({
    credit: "",
    debit: "",
  });

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      setError(null);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  const add = async (kind: TxCategoryKind) => {
    const name = draft[kind].trim();
    if (!name) return;
    await run(async () => {
      await createTxCategory({ name, kind });
      setDraft((d) => ({ ...d, [kind]: "" }));
    });
  };

  const rename = (c: TxCategory) => {
    const v = window.prompt("Nuevo nombre de la categoría", c.name);
    if (!v || !v.trim() || v.trim() === c.name) return;
    void run(() => updateTxCategory(c.id, { name: v.trim() }));
  };

  const remove = (c: TxCategory) => {
    if (
      !window.confirm(
        `¿Eliminar la categoría "${c.name}"? Los movimientos que la usaban quedarán sin categoría.`,
      )
    )
      return;
    void run(() => deleteTxCategory(c.id));
  };

  return (
    <section className="txn-section">
      {error && <p className="error-banner">{error}</p>}

      <div className="cat-manager">
        {KINDS.map(({ kind, title, hint }) => {
          const list = categories
            .filter((c) => c.kind === kind)
            .sort((a, b) => a.name.localeCompare(b.name));
          return (
            <div key={kind} className="cat-manager__col">
              <div className="caja-form__head">
                <h3>{title}</h3>
              </div>
              <p className="hint">{hint}</p>

              <form
                className="cat-manager__add"
                onSubmit={(e) => {
                  e.preventDefault();
                  void add(kind);
                }}
              >
                <input
                  type="text"
                  placeholder="Nueva categoría…"
                  value={draft[kind]}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [kind]: e.target.value }))
                  }
                />
                <button
                  type="submit"
                  className="btn btn--primary btn--sm"
                  disabled={busy || !draft[kind].trim()}
                >
                  Agregar
                </button>
              </form>

              {list.length === 0 ? (
                <p className="txn-empty">Sin categorías todavía.</p>
              ) : (
                <ul className="cat-manager__list">
                  {list.map((c) => (
                    <li key={c.id} className="cat-manager__item">
                      <span className="tag">{c.name}</span>
                      <span className="cat-manager__actions">
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => rename(c)}
                          disabled={busy}
                        >
                          Renombrar
                        </button>
                        <button
                          type="button"
                          className="btn btn--danger btn--sm"
                          onClick={() => remove(c)}
                          disabled={busy}
                        >
                          Borrar
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
