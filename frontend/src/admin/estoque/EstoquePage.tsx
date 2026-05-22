import { useCallback, useEffect, useMemo, useState } from "react";
import {
  archiveMaterial,
  createMaterial,
  createMaterialMovement,
  getMaterials,
  updateMaterial,
} from "../../api/client";
import type {
  Material,
  MaterialCreatePayload,
  MaterialKind,
  MaterialMovementCreatePayload,
  MaterialUpdatePayload,
} from "../../types";
import { MaterialForm } from "./MaterialForm";
import { MovementForm } from "./MovementForm";
import { OnboardingModal } from "./OnboardingModal";
import "./estoque.css";

const ONBOARDING_FLAG = "estoque.onboarding.seen";

const TYPES: ("ALL" | MaterialKind)[] = [
  "ALL",
  "PLA",
  "PETG",
  "ABS",
  "TPU",
  "RESIN",
  "OTRO",
];

const UNIT_DISPLAY: Record<
  string,
  { stockSuffix: string; costLabel: string; costMultiplier: number }
> = {
  g: { stockSuffix: "g", costLabel: "$ / kg", costMultiplier: 1000 },
  un: { stockSuffix: "un", costLabel: "$ / un", costMultiplier: 1 },
  ml: { stockSuffix: "ml", costLabel: "$ / L", costMultiplier: 1000 },
};

const getUnitDisplay = (unit: string | null | undefined) =>
  UNIT_DISPLAY[unit ?? "g"] ?? UNIT_DISPLAY.g;

const fmtMoneyAdapt = (
  costPerStorageUnit: number | null | undefined,
  unit: string | null | undefined,
) => {
  if (costPerStorageUnit == null) return "—";
  const { costMultiplier } = getUnitDisplay(unit);
  return (costPerStorageUnit * costMultiplier).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

const fmtStock = (n: number, unit: string | null | undefined) => {
  const { stockSuffix } = getUnitDisplay(unit);
  return `${n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${stockSuffix}`;
};

export function EstoquePage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [typeFilter, setTypeFilter] = useState<"ALL" | MaterialKind>("ALL");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [movementMaterial, setMovementMaterial] = useState<Material | null>(null);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getMaterials({
        type: typeFilter === "ALL" ? undefined : typeFilter,
        include_archived: includeArchived,
      });
      setMaterials(list);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar estoque");
    } finally {
      setLoading(false);
    }
  }, [typeFilter, includeArchived]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return materials;
    return materials.filter((m) =>
      [m.name, m.brand, m.color, m.model, m.type]
        .filter(Boolean)
        .some((s) => s!.toLowerCase().includes(q)),
    );
  }, [materials, query]);

  const handleAddClick = () => {
    setEditing(null);
    if (!localStorage.getItem(ONBOARDING_FLAG)) {
      setOnboardingOpen(true);
    } else {
      setFormOpen(true);
    }
  };

  const handleOnboardingAdvance = () => {
    localStorage.setItem(ONBOARDING_FLAG, "1");
    setOnboardingOpen(false);
    setFormOpen(true);
  };

  const handleCreate = async (payload: MaterialCreatePayload) => {
    const created = await createMaterial(payload);
    setMaterials((prev) => [...prev, created]);
  };

  const handleUpdate = async (id: number, payload: MaterialUpdatePayload) => {
    const updated = await updateMaterial(id, payload);
    setMaterials((prev) => prev.map((m) => (m.id === id ? updated : m)));
  };

  const handleArchive = async (id: number) => {
    if (!confirm("¿Archivar este material?")) return;
    await archiveMaterial(id);
    if (includeArchived) {
      setMaterials((prev) =>
        prev.map((m) => (m.id === id ? { ...m, archived: true } : m)),
      );
    } else {
      setMaterials((prev) => prev.filter((m) => m.id !== id));
    }
  };

  const handleMovementSubmit = async (
    materialId: number,
    payload: MaterialMovementCreatePayload,
  ) => {
    await createMaterialMovement(materialId, payload);
    // refresh para traer el nuevo stock
    await refresh();
  };

  return (
    <div className="estoque">
      <header className="estoque__header">
        <div>
          <p className="estoque__eyebrow">Panel</p>
          <h2>Estoque</h2>
          <p className="estoque__subtitle">
            Filamentos, resinas, insumos por unidad o líquidos — cada material
            con su unidad y costo propio.
          </p>
        </div>
        <div className="estoque__cta-group">
          <button
            type="button"
            className="estoque__help"
            onClick={() => setOnboardingOpen(true)}
            aria-label="Cómo preencher el formulario"
            title="Cómo preencher"
          >
            ?
          </button>
          <button
            type="button"
            className="btn-primary estoque__cta"
            onClick={handleAddClick}
          >
            + Adicionar material
          </button>
        </div>
      </header>

      <div className="estoque__toolbar">
        <input
          className="estoque__search"
          type="search"
          placeholder="Buscar material, color, marca, modelo…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="estoque__type"
          value={typeFilter}
          onChange={(e) =>
            setTypeFilter(e.target.value as "ALL" | MaterialKind)
          }
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t === "ALL" ? "Todos los tipos" : t}
            </option>
          ))}
        </select>
        <label className="estoque__archived-toggle">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
          />
          Mostrar archivados
        </label>
      </div>

      {error ? <p className="error-banner">{error}</p> : null}

      <div className="estoque__table" role="table">
        <div className="estoque__row estoque__row--head" role="row">
          <span>Nombre</span>
          <span>Tipo</span>
          <span>Color</span>
          <span>Marca</span>
          <span className="estoque__num">Stock</span>
          <span className="estoque__num">Costo</span>
          <span>Acciones</span>
        </div>

        {loading ? (
          <div className="estoque__empty">Cargando…</div>
        ) : filtered.length === 0 ? (
          <div className="estoque__empty">
            {materials.length === 0
              ? "No hay materiales cargados todavía. Tocá “+ Adicionar material”."
              : "Ninguno coincide con los filtros."}
          </div>
        ) : (
          filtered.map((m) => (
            <div
              key={m.id}
              className={`estoque__row ${
                m.archived ? "estoque__row--archived" : ""
              } ${m.stock_g <= 0 ? "estoque__row--empty-stock" : ""}`}
              role="row"
            >
              <span>
                <strong>{m.name}</strong>
              </span>
              <span className="estoque__pill">{m.type}</span>
              <span>{m.color ?? "—"}</span>
              <span>{m.brand ?? "—"}</span>
              <span className="estoque__num">{fmtStock(m.stock_g, m.unit)}</span>
              <span
                className="estoque__num"
                title={getUnitDisplay(m.unit).costLabel}
              >
                {fmtMoneyAdapt(m.cost_per_g, m.unit)}
                <small className="estoque__unit-hint">
                  {" "}
                  {getUnitDisplay(m.unit).costLabel}
                </small>
              </span>
              <span className="estoque__actions">
                <button
                  type="button"
                  className="tbtn"
                  onClick={() => setMovementMaterial(m)}
                  disabled={m.archived}
                >
                  Movimiento
                </button>
                <button
                  type="button"
                  className="tbtn tbtn--edit"
                  onClick={() => {
                    setEditing(m);
                    setFormOpen(true);
                  }}
                >
                  Editar
                </button>
                {!m.archived ? (
                  <button
                    type="button"
                    className="tbtn tbtn--danger"
                    onClick={() => handleArchive(m.id)}
                  >
                    Archivar
                  </button>
                ) : (
                  <button
                    type="button"
                    className="tbtn"
                    onClick={() => handleUpdate(m.id, { archived: false })}
                  >
                    Desarchivar
                  </button>
                )}
              </span>
            </div>
          ))
        )}
      </div>

      <OnboardingModal
        open={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
        onAdvance={handleOnboardingAdvance}
      />
      <MaterialForm
        open={formOpen}
        material={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />
      <MovementForm
        open={movementMaterial !== null}
        material={movementMaterial}
        onClose={() => setMovementMaterial(null)}
        onSubmit={handleMovementSubmit}
      />
    </div>
  );
}
