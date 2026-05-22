import { useCallback, useEffect, useMemo, useState } from "react";
import {
  archivePrinter,
  createPrinter,
  getPrinters,
  updatePrinter,
} from "../../api/client";
import type {
  Printer,
  PrinterCreatePayload,
  PrinterUpdatePayload,
} from "../../types";
import { OnboardingModal } from "./OnboardingModal";
import { PrinterForm } from "./PrinterForm";
import "./impressoras.css";

const ONBOARDING_FLAG = "impressoras.onboarding.seen";

const fmtMoney = (n: number | null | undefined) =>
  n == null
    ? "—"
    : n.toLocaleString("es-AR", {
        style: "currency",
        currency: "ARS",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

export function ImpressorasPage() {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Printer | null>(null);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getPrinters(includeArchived);
      setPrinters(list);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar impressoras");
    } finally {
      setLoading(false);
    }
  }, [includeArchived]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleAddClick = () => {
    setEditing(null);
    // Show onboarding the first time the user wants to add a printer.
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

  const handleCreate = async (payload: PrinterCreatePayload) => {
    const created = await createPrinter(payload);
    setPrinters((prev) => [...prev, created]);
  };

  const handleUpdate = async (id: number, payload: PrinterUpdatePayload) => {
    const updated = await updatePrinter(id, payload);
    setPrinters((prev) => prev.map((p) => (p.id === id ? updated : p)));
  };

  const handleArchive = async (id: number) => {
    if (!confirm("¿Archivar esta impressora? Podés desarchivarla más tarde.")) {
      return;
    }
    await archivePrinter(id);
    if (includeArchived) {
      setPrinters((prev) =>
        prev.map((p) => (p.id === id ? { ...p, archived: true } : p)),
      );
    } else {
      setPrinters((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const handleUnarchive = async (printer: Printer) => {
    await handleUpdate(printer.id, { archived: false });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return printers;
    return printers.filter((p) =>
      [p.name, p.brand, p.model, p.environment]
        .filter(Boolean)
        .some((s) => s!.toLowerCase().includes(q)),
    );
  }, [printers, query]);

  return (
    <div className="impressoras">
      <header className="impressoras__header">
        <div>
          <p className="impressoras__eyebrow">Equipos</p>
          <h2>Impressoras</h2>
          <p className="impressoras__subtitle">
            Cadastrá modelo, ambiente, valor y fecha de compra para acompañar
            costos y depreciación. Estos datos alimentan la calculadora.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary impressoras__cta"
          onClick={handleAddClick}
        >
          + Adicionar impressora
        </button>
      </header>

      <div className="impressoras__toolbar">
        <input
          className="impressoras__search"
          type="search"
          placeholder="Buscar por nombre, marca, modelo, ambiente…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label className="impressoras__archived-toggle">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
          />
          Mostrar archivadas
        </label>
      </div>

      {error ? <p className="error-banner">{error}</p> : null}

      <div className="impressoras__table" role="table">
        <div className="impressoras__row impressoras__row--head" role="row">
          <span>Nombre</span>
          <span>Marca</span>
          <span>Modelo</span>
          <span>Ambiente</span>
          <span className="impressoras__num">Costo/h</span>
          <span className="impressoras__num">Costo compra</span>
          <span>Acciones</span>
        </div>

        {loading ? (
          <div className="impressoras__empty">Cargando…</div>
        ) : filtered.length === 0 ? (
          <div className="impressoras__empty">
            {printers.length === 0
              ? "No hay impressoras todavía. Tocá “+ Adicionar impressora”."
              : "Ninguna coincide con la búsqueda."}
          </div>
        ) : (
          filtered.map((p) => (
            <div
              key={p.id}
              className={`impressoras__row ${p.archived ? "impressoras__row--archived" : ""}`}
              role="row"
            >
              <span>
                <strong>{p.name}</strong>
              </span>
              <span>{p.brand ?? "—"}</span>
              <span>{p.model ?? "—"}</span>
              <span>{p.environment ?? "—"}</span>
              <span className="impressoras__num">
                {fmtMoney(p.cost_per_hour)}
              </span>
              <span className="impressoras__num">
                {fmtMoney(p.purchase_cost)}
              </span>
              <span className="impressoras__actions">
                <button
                  type="button"
                  className="tbtn tbtn--edit"
                  onClick={() => {
                    setEditing(p);
                    setFormOpen(true);
                  }}
                >
                  Editar
                </button>
                {p.archived ? (
                  <button
                    type="button"
                    className="tbtn"
                    onClick={() => handleUnarchive(p)}
                  >
                    Desarchivar
                  </button>
                ) : (
                  <button
                    type="button"
                    className="tbtn tbtn--danger"
                    onClick={() => handleArchive(p.id)}
                  >
                    Archivar
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
      <PrinterForm
        open={formOpen}
        printer={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
