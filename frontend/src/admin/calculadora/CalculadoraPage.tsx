import { useEffect, useMemo, useState, type ReactNode } from "react";
import { getMaterials, getPrinters } from "../../api/client";
import type { Material, PendingQuote, PendingQuoteDraft, Printer } from "../../types";
import { formatARS } from "../../utils/format";
import {
  breakdownToCostItems,
  computeProfitability,
  computeQuote,
  DEFAULT_CONFIG,
  DEFAULT_PIECE,
  makeMaterialLine,
  MARKETPLACE_PRESETS,
  materialsTotals,
  round2,
  type MaterialLine,
  type ProfitMultiplier,
  type QuoteConfig,
  type QuotePiece,
} from "./calc";
import {
  archiveQuote,
  deleteArchivedQuote,
  deleteQuote,
  loadArchivedQuotes,
  loadConfig,
  loadQuotes,
  pushQuote,
  restoreArchivedQuote,
  saveConfig,
  updateQuote,
  type SavedQuote,
} from "./storage";
import { OnboardingModal } from "./OnboardingModal";
import { EditingBanner } from "./EditingBanner";
import { HistoryModal } from "./HistoryModal";
import { ConfirmModal } from "../../components/ConfirmModal";
import { useToast } from "../../components/Toast";

interface Props {
  onCreateOrder: (quote: PendingQuote) => void;
  /** Cambia a otra pestaña del admin shell (para los CTAs de empty-state). */
  onNavigate?: (tab: string) => void;
  onCreateQuoteDraft?: (draft: PendingQuoteDraft) => void;
}

const MULTIPLIERS: { value: ProfitMultiplier; label: string; sub: string }[] = [
  { value: 3, label: "×3", sub: "Mayorista" },
  { value: 4, label: "×4", sub: "Minorista" },
  { value: 5, label: "×5", sub: "Llaveros" },
];

function formatPieceForQuote(
  pieceName: string,
  printHours: number,
  printMinutes: number,
  materialLines: MaterialLine[],
  stockMaterials: Material[],
): string {
  const baseName = pieceName.trim() || "Cotización 3D";
  const parts: string[] = [];

  const totalMin =
    Math.max(0, printHours) * 60 + Math.max(0, printMinutes);
  if (totalMin > 0) {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h > 0 && m > 0) parts.push(`${h}h ${m}min`);
    else if (h > 0) parts.push(`${h}h`);
    else parts.push(`${m}min`);
  }

  const matSummaries = materialLines
    .filter((l) => l.materialId != null && l.grams > 0)
    .map((l) => {
      const mat = stockMaterials.find((m) => m.id === l.materialId);
      if (!mat) return null;
      const unit = mat.unit === "g" ? "g" : mat.unit === "ml" ? "ml" : "u";
      return `${l.grams}${unit} ${mat.name}`;
    })
    .filter((s): s is string => s != null);

  if (matSummaries.length > 0) parts.push(matSummaries.join(", "));

  return parts.length > 0 ? `${baseName} (${parts.join(" · ")})` : baseName;
}

function numField(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/**
 * Subset comparable del estado del form que define "qué hay sin guardar".
 * Se serializa con JSON.stringify para detectar dirty state.
 */
interface QuoteSnapshot {
  config: QuoteConfig;
  piece: QuotePiece;
  quantity: number;
  chargeOverride: number | null;
  printerId: number | null;
}

function snapshotsEqual(a: QuoteSnapshot, b: QuoteSnapshot): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function CalculadoraPage({ onCreateOrder, onNavigate, onCreateQuoteDraft }: Props) {
  const [config, setConfig] = useState<QuoteConfig>(() => loadConfig());
  // La pieza arranca SIEMPRE vacía: si el usuario quiere persistir trabajo,
  // guarda la cotización. Evita el efecto "abro la calculadora y veo datos
  // viejos sin saber qué estoy editando".
  const [piece, setPiece] = useState<QuotePiece>(() => ({ ...DEFAULT_PIECE }));
  const [quantity, setQuantity] = useState(1);
  // Total a cobrar pisado a mano (string del input). "" = usar el calculado.
  const [chargeOverride, setChargeOverride] = useState("");
  const [quotes, setQuotes] = useState<SavedQuote[]>(() => loadQuotes());
  const [archived, setArchived] = useState<SavedQuote[]>(() =>
    loadArchivedQuotes(),
  );
  const [savedFlash, setSavedFlash] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: ReactNode;
    confirmLabel: string;
    danger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  /** Si != null, el form está "abierto" sobre una cotización del historial. */
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  /**
   * Snapshot del estado al cargar/guardar. Mientras coincida con el form
   * actual, isDirty=false. En modo "nuevo" arranca como null.
   */
  const [originalSnapshot, setOriginalSnapshot] = useState<QuoteSnapshot | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const toast = useToast();

  // Integración con Estoque + Impressoras.
  const [materials, setMaterials] = useState<Material[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [printerId, setPrinterId] = useState<number | null>(null);

  useEffect(() => {
    void getMaterials().then(setMaterials).catch(() => {});
    void getPrinters().then(setPrinters).catch(() => {});
  }, []);

  // Resolver para el cálculo: cualquier material del estoque (filamento `g`,
  // insumo `un`, líquido `ml`). El backend reusa `cost_per_g` como "costo
  // por unidad nativa", así que pasamos eso tal cual con la unidad declarada.
  const resolveMaterial = (id: number) => {
    const m = materials.find((mm) => mm.id === id);
    if (!m) return null;
    return { costPer: m.cost_per_g, unit: (m.unit ?? "g") as "g" | "un" | "ml" };
  };

  // Materiales disponibles para elegir: todos los no archivados, ordenados
  // con filamentos arriba (más comunes) y después insumos.
  const stockMaterials = useMemo(() => {
    const unitOrder = { g: 0, un: 1, ml: 2 } as const;
    return materials
      .filter((m) => !m.archived)
      .slice()
      .sort((a, b) => {
        const ua = unitOrder[(a.unit ?? "g") as "g" | "un" | "ml"];
        const ub = unitOrder[(b.unit ?? "g") as "g" | "un" | "ml"];
        if (ua !== ub) return ua - ub;
        return a.name.localeCompare(b.name);
      });
  }, [materials]);

  // ---- Líneas de material ---------------------------------------------------
  const materialLines = piece.materials ?? [];
  const validLines = materialLines.filter((l) => l.materialId != null);
  const totals = useMemo(
    () => materialsTotals(materialLines, resolveMaterial),
    // depende de materials para resolver costos
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [materialLines, materials],
  );

  const patchLines = (next: MaterialLine[]) => {
    setPiece((prev) => ({ ...prev, materials: next }));
  };

  const addLine = () => patchLines([...materialLines, makeMaterialLine()]);

  const updateLine = (id: string, patch: Partial<MaterialLine>) =>
    patchLines(
      materialLines.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    );

  const removeLine = (id: string) =>
    patchLines(materialLines.filter((l) => l.id !== id));

  // Cuando cambia la impresora, inyectamos sus parámetros en el config:
  //  - Si tiene los 3 inputs cargados (power_watts + life_hours +
  //    spare_parts_cost), reemplazamos los globales y dejamos que la
  //    calculadora desglose electricity + machineWear con los nuevos valores
  //    (modo "impresora caracterizada con desglose").
  //  - Si sólo tiene cost_per_hour (legacy), usamos el override clásico que
  //    colapsa el desglose en un solo número.
  //  - Si no se elige impresora, limpiamos el override.
  const handleSelectPrinter = (id: number | null) => {
    setPrinterId(id);
    if (id == null) {
      patchConfig({ printerHourlyCostOverride: null });
      return;
    }
    const p = printers.find((pp) => pp.id === id);
    if (!p) return;
    const hasInputs =
      (p.power_watts ?? 0) > 0 &&
      (p.life_hours ?? 0) > 0 &&
      (p.spare_parts_cost ?? 0) > 0;
    if (hasInputs) {
      patchConfig({
        printerWatts: p.power_watts as number,
        machineLifeHours: p.life_hours as number,
        sparePartCost: p.spare_parts_cost as number,
        printerHourlyCostOverride: null,
      });
    } else {
      patchConfig({
        printerHourlyCostOverride:
          p.cost_per_hour > 0 ? p.cost_per_hour : null,
      });
    }
  };

  const breakdown = useMemo(
    () => computeQuote(config, piece, resolveMaterial),
    // depende de materials para resolver costos
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config, piece, materials],
  );
  const hasResult = breakdown.total > 0;
  const computedTotal = round2(breakdown.total * quantity);

  const overrideNum = Number(chargeOverride);
  const hasOverride =
    chargeOverride.trim() !== "" &&
    Number.isFinite(overrideNum) &&
    overrideNum > 0;
  const charge = hasOverride ? round2(overrideNum) : computedTotal;
  const isOverridden = hasOverride && Math.abs(charge - computedTotal) >= 0.01;

  const prof = useMemo(
    () =>
      computeProfitability(
        breakdownToCostItems(breakdown).map((c) => ({
          amount: c.amount,
          per_unit: true,
        })),
        quantity,
        charge,
      ),
    [breakdown, quantity, charge],
  );

  const patchConfig = (patch: Partial<QuoteConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      saveConfig(next);
      return next;
    });
  };

  const patchPiece = (patch: Partial<QuotePiece>) =>
    setPiece((prev) => ({ ...prev, ...patch }));

  const buildQuoteMaterials = (): NonNullable<PendingQuote["materials"]> => {
    return validLines
      .filter((l) => l.grams > 0 && l.materialId != null)
      .map((l) => ({
        materialId: l.materialId as number,
        gramsPerUnit: l.grams,
      }));
  };

  // ---- Snapshot / dirty state -----------------------------------------------
  const currentSnapshot: QuoteSnapshot = useMemo(
    () => ({
      config,
      piece,
      quantity,
      chargeOverride: isOverridden ? charge : null,
      printerId,
    }),
    [config, piece, quantity, isOverridden, charge, printerId],
  );

  const isEditing = editingQuoteId !== null;
  const isDirty = useMemo(() => {
    if (!originalSnapshot) return false;
    return !snapshotsEqual(originalSnapshot, currentSnapshot);
  }, [originalSnapshot, currentSnapshot]);

  /**
   * Guarda la cotización. Si `mode="copy"` o no hay una abierta en edición,
   * crea una nueva entrada. Si está editando, hace UPDATE in place.
   */
  const handleSaveQuote = (mode: "auto" | "copy" = "auto") => {
    const payload = {
      config,
      piece,
      breakdown,
      quantity,
      chargeOverride: isOverridden ? charge : null,
      // legacy: primer material como atajo
      materialId: validLines[0]?.materialId ?? null,
      printerId,
    };

    const isUpdate = mode === "auto" && editingQuoteId !== null;
    const previousQuotes = quotes;
    const name = piece.pieceName?.trim() || "Cotización";

    if (isUpdate) {
      const next = updateQuote(editingQuoteId!, payload);
      setQuotes(next);
      toast.push({
        kind: "ok",
        message: `✓ "${name}" actualizada`,
        action: {
          label: "Deshacer",
          onClick: () => {
            try {
              localStorage.setItem(
                "calc.quotes.v1",
                JSON.stringify(previousQuotes),
              );
            } catch {
              /* no crítico */
            }
            setQuotes(previousQuotes);
            const original = previousQuotes.find((q) => q.id === editingQuoteId);
            if (original) {
              applyQuoteToForm(original);
              setOriginalSnapshot({
                config: original.config,
                piece: { ...original.piece, materials: original.piece.materials ?? [] },
                quantity: original.quantity,
                chargeOverride: original.chargeOverride,
                printerId: original.printerId ?? null,
              });
            }
          },
        },
      });
    } else {
      const previousArchived = archived;
      const { active, archived: nextArchived } = pushQuote(payload);
      setQuotes(active);
      setArchived(nextArchived);
      const newId = active[0]?.id ?? null;
      setEditingQuoteId(newId);
      toast.push({
        kind: "ok",
        message: `✓ "${name}" guardada`,
        action: {
          label: "Deshacer",
          onClick: () => {
            if (!newId) return;
            setQuotes(deleteQuote(newId));
            // Si el push había archivado una activa vieja por overflow,
            // restauramos el archivo previo para no dejar residuos.
            try {
              localStorage.setItem(
                "calc.quotes.archived.v1",
                JSON.stringify(previousArchived),
              );
            } catch {
              /* no crítico */
            }
            setArchived(previousArchived);
            setEditingQuoteId(null);
            setOriginalSnapshot(null);
          },
        },
      });
    }
    setOriginalSnapshot({ ...currentSnapshot });
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1800);
  };

  const applyQuoteToForm = (q: SavedQuote) => {
    setConfig(q.config);
    saveConfig(q.config);
    const restoredPiece: QuotePiece = {
      ...q.piece,
      materials: q.piece.materials ?? [],
    };
    setPiece(restoredPiece);
    setQuantity(q.quantity);
    setChargeOverride(q.chargeOverride != null ? String(q.chargeOverride) : "");
    setPrinterId(q.printerId ?? null);
  };

  const handleLoadQuote = (q: SavedQuote) => {
    if (isDirty) {
      const ok = window.confirm(
        "Tenés cambios sin guardar en la cotización actual. ¿Descartarlos y abrir esta otra?",
      );
      if (!ok) return;
    }
    applyQuoteToForm(q);
    setEditingQuoteId(q.id);
    setOriginalSnapshot({
      config: q.config,
      piece: { ...q.piece, materials: q.piece.materials ?? [] },
      quantity: q.quantity,
      chargeOverride: q.chargeOverride,
      printerId: q.printerId ?? null,
    });
  };

  /** Resetea el form a defaults y sale del modo edición. */
  const handleNewQuote = () => {
    if (isDirty) {
      const ok = window.confirm(
        "Tenés cambios sin guardar. ¿Descartarlos y empezar una nueva?",
      );
      if (!ok) return;
    }
    const freshConfig = { ...DEFAULT_CONFIG };
    setConfig(freshConfig);
    saveConfig(freshConfig);
    setPiece({ ...DEFAULT_PIECE, materials: [] });
    setQuantity(1);
    setChargeOverride("");
    setPrinterId(null);
    setEditingQuoteId(null);
    setOriginalSnapshot(null);
  };

  // ---- Archivado de cotizaciones --------------------------------------------
  const clearEditingIfMatches = (id: string) => {
    if (id === editingQuoteId) {
      setEditingQuoteId(null);
      setOriginalSnapshot(null);
    }
  };

  const requestArchive = (q: SavedQuote) => {
    const name = q.piece.pieceName?.trim() || "esta cotización";
    setConfirmDialog({
      title: "¿Mover al archivado?",
      message: (
        <>
          Vas a archivar <strong>«{name}»</strong>. Podés restaurarla más tarde
          desde el historial mientras quede espacio en el archivo (máximo 20).
        </>
      ),
      confirmLabel: "Archivar",
      onConfirm: () => {
        const { active, archived: nextArchived } = archiveQuote(q.id);
        setQuotes(active);
        setArchived(nextArchived);
        clearEditingIfMatches(q.id);
        setConfirmDialog(null);
      },
    });
  };

  const handleRestoreArchived = (q: SavedQuote) => {
    const { active, archived: nextArchived } = restoreArchivedQuote(q.id);
    setQuotes(active);
    setArchived(nextArchived);
  };

  const requestDeleteArchived = (q: SavedQuote) => {
    const name = q.piece.pieceName?.trim() || "esta cotización";
    setConfirmDialog({
      title: "¿Eliminar para siempre?",
      message: (
        <>
          Vas a borrar <strong>«{name}»</strong> definitivamente. Esta acción no
          tiene undo.
        </>
      ),
      confirmLabel: "Eliminar",
      danger: true,
      onConfirm: () => {
        const nextArchived = deleteArchivedQuote(q.id);
        setArchived(nextArchived);
        setConfirmDialog(null);
      },
    });
  };

  /** Carga los valores de una quote pero en modo "nuevo" para crear variante. */
  const handleDuplicateQuote = (q: SavedQuote) => {
    if (isDirty) {
      const ok = window.confirm(
        "Tenés cambios sin guardar. ¿Descartarlos y duplicar esta otra?",
      );
      if (!ok) return;
    }
    applyQuoteToForm(q);
    setEditingQuoteId(null);
    setOriginalSnapshot(null);
    toast.push({
      kind: "info",
      message: `Duplicada — modificá y guardá como nueva`,
    });
  };

  /** Revierte el form al snapshot original sin tocar el storage. */
  const handleDiscardChanges = () => {
    if (!isDirty || !editingQuoteId) return;
    const original = quotes.find((q) => q.id === editingQuoteId);
    if (!original) return;
    applyQuoteToForm(original);
    setOriginalSnapshot({
      config: original.config,
      piece: { ...original.piece, materials: original.piece.materials ?? [] },
      quantity: original.quantity,
      chargeOverride: original.chargeOverride,
      printerId: original.printerId ?? null,
    });
  };

  // Aviso del browser cuando hay cambios sin guardar y se intenta cerrar.
  useEffect(() => {
    if (!isDirty) return;
    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Chrome requiere setear returnValue para mostrar el prompt nativo.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [isDirty]);

  // Atajos de teclado: Ctrl/Cmd+S guarda; Ctrl/Cmd+N empieza una nueva.
  // No interrumpe cuando el foco está en un input/textarea con texto libre.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (!isMod) return;
      const key = e.key.toLowerCase();
      if (key !== "s" && key !== "n") return;
      const target = e.target as HTMLElement | null;
      // En inputs de texto libre, dejar pasar Ctrl+N (browser) pero capturar
      // Ctrl+S igual: querés guardar sin perder el foco.
      const isTextField =
        target instanceof HTMLInputElement &&
        (target.type === "text" || target.type === "search");
      const isTextarea = target instanceof HTMLTextAreaElement;
      if (key === "n" && (isTextField || isTextarea)) return;
      e.preventDefault();
      if (key === "s") handleSaveQuote("auto");
      else if (key === "n") handleNewQuote();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // handleSaveQuote/handleNewQuote dependen del estado actual; los recreamos
    // en cada render, así que el listener se reemplaza también para ver los
    // valores frescos. Dependencias estables vía closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingQuoteId, isDirty, currentSnapshot]);

  const handleCreateOrder = () => {
    handleSaveQuote();
    const quoteMaterials = buildQuoteMaterials();
    const minutesPerUnit =
      Math.max(0, piece.printHours) * 60 + Math.max(0, piece.printMinutes);
    onCreateOrder({
      value: charge,
      quantity,
      costItems: breakdownToCostItems(breakdown),
      materials: quoteMaterials.length > 0 ? quoteMaterials : undefined,
      // Legacy: si hay al menos uno, mando el primero como atajo.
      materialId: quoteMaterials[0]?.materialId ?? null,
      gramsPerUnit: quoteMaterials[0]?.gramsPerUnit ?? null,
      printerId,
      estimatedMinutesPerUnit: minutesPerUnit > 0 ? minutesPerUnit : null,
    });
  };

  const handleCreateQuoteDraft = () => {
    if (!onCreateQuoteDraft || charge <= 0) return;
    const description = formatPieceForQuote(
      piece.pieceName,
      piece.printHours,
      piece.printMinutes,
      piece.materials,
      stockMaterials,
    );
    const qty = Math.max(1, quantity);
    const unitPrice = Math.round((charge / qty) * 100) / 100;
    onCreateQuoteDraft({
      items: [{ description, quantity: qty, unit_price: unitPrice }],
    });
  };

  const selectedPrinter = printers.find((p) => p.id === printerId) ?? null;
  const hasStockMaterials = stockMaterials.length > 0;
  const hasPrinters = printers.filter((p) => !p.archived).length > 0;
  const unitLabel = (u: "g" | "un" | "ml") =>
    u === "g" ? "g" : u === "un" ? "u" : "ml";
  const unitCostSuffix = (u: "g" | "un" | "ml") =>
    u === "g" ? "/kg" : `/${unitLabel(u)}`;
  const matPriceLabel = (m: { cost_per_g: number; unit: "g" | "un" | "ml" }) =>
    m.unit === "g"
      ? `${formatARS(m.cost_per_g * 1000)}/kg`
      : `${formatARS(m.cost_per_g)}${unitCostSuffix(m.unit)}`;

  return (
    <div className="calc">
      {/* ---- Header tipo Lunaro ---- */}
      <header className="calc__header">
        <div className="calc__header-row">
          <div>
            <span className="calc__eyebrow">HERRAMIENTAS</span>
            <h2 className="calc__title">Calculadora de costos</h2>
            <p className="calc__subtitle">
              Estimá costo de material, máquina y margen — con sugerencia
              de precio y comisión de marketplaces. Cargá cualquier
              material del inventario (filamentos, imanes, pintura) y se
              descuenta automático al fabricar el pedido.
            </p>
          </div>
          <button
            type="button"
            className="help-btn"
            onClick={() => setOnboardingOpen(true)}
            aria-label="Qué es la Calculadora y cómo se conecta"
            title="¿Qué es esto?"
          >
            ?
          </button>
        </div>
      </header>
      <OnboardingModal
        open={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
      />

      {isEditing &&
        (() => {
          const openQuote = quotes.find((q) => q.id === editingQuoteId);
          if (!openQuote) return null;
          return (
            <EditingBanner
              editing={openQuote}
              isDirty={isDirty}
              onDiscard={handleDiscardChanges}
              onNew={handleNewQuote}
            />
          );
        })()}

      <div className="calc__layout">
        {/* ===================== COLUMNA IZQUIERDA: DATOS ===================== */}
        <div className="calc__left">
          {/* ---- Pieza ---- */}
          <section className="caja-form calc__panel">
            <div className="caja-form__head">
              <h3>Datos de la impresión</h3>
              <span className="hint">Lo que define el costo de la pieza</span>
            </div>
            <div className="caja-form__grid">
              <div className="field calc__full">
                <label>Nombre del producto / pieza</label>
                <input
                  type="text"
                  placeholder="Ej.: Soporte de auriculares"
                  value={piece.pieceName}
                  onChange={(e) => patchPiece({ pieceName: e.target.value })}
                />
              </div>

              <div className="field">
                <label>Horas de impresión</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={piece.printHours || ""}
                  onChange={(e) =>
                    patchPiece({ printHours: numField(e.target.value) })
                  }
                />
              </div>
              <div className="field">
                <label>Minutos de impresión</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={piece.printMinutes || ""}
                  onChange={(e) =>
                    patchPiece({ printMinutes: numField(e.target.value) })
                  }
                />
              </div>

              <div className="field calc__full">
                <label>Cantidad de unidades</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity || ""}
                  onChange={(e) =>
                    setQuantity(Math.max(1, Math.floor(numField(e.target.value))))
                  }
                />
              </div>

              <div className="field calc__full">
                <label>Margen de ganancia</label>
                <div className="priority-seg" role="group">
                  {MULTIPLIERS.map((m) => (
                    <button
                      type="button"
                      key={m.value}
                      className={`priority-seg__btn ${
                        piece.profitMultiplier === m.value ? "is-active" : ""
                      }`}
                      onClick={() => patchPiece({ profitMultiplier: m.value })}
                    >
                      <strong>{m.label}</strong> <em>{m.sub}</em>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ---- Materiales e insumos del estoque ---- */}
          <section className="caja-form calc__panel">
            <div className="caja-form__head">
              <h3>Materiales e insumos</h3>
              <span className="hint">
                Todo lo del estoque: filamentos (g), imanes / accesorios (un),
                pintura (ml). Cada uno se descuenta al crear el pedido.
              </span>
            </div>

            {!hasStockMaterials ? (
              <div className="calc__empty">
                <strong>Tu estoque está vacío.</strong>
                <p className="hint">
                  Registrá filamentos, imanes, tornillos, pintura — cualquier
                  cosa que querés rastrear y descontar automáticamente al
                  fabricar un pedido.
                </p>
                <div className="calc__empty-actions">
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={() => onNavigate?.("estoque")}
                  >
                    Ir al estoque
                  </button>
                  <span className="hint">
                    o cargá el precio del filamento manualmente abajo en
                    Parámetros avanzados.
                  </span>
                </div>
              </div>
            ) : (
              <>
                <ul className="calc__mat-list">
                  {materialLines.length === 0 && (
                    <li className="calc__mat-empty hint">
                      Tocá <strong>+ Agregar material</strong> para vincular
                      filamentos, imanes, pintura — cualquier insumo del
                      estoque.
                    </li>
                  )}
                  {materialLines.map((line) => {
                    const mat =
                      line.materialId != null
                        ? stockMaterials.find(
                            (m) => m.id === line.materialId,
                          ) ?? null
                        : null;
                    const unit = (mat?.unit ?? "g") as "g" | "un" | "ml";
                    return (
                      <li key={line.id} className="calc__mat-row">
                        <select
                          value={line.materialId ?? ""}
                          onChange={(e) =>
                            updateLine(line.id, {
                              materialId: e.target.value
                                ? Number(e.target.value)
                                : null,
                            })
                          }
                        >
                          <option value="">— Elegí un material —</option>
                          {stockMaterials.map((m) => {
                            const u = (m.unit ?? "g") as "g" | "un" | "ml";
                            return (
                              <option key={m.id} value={m.id}>
                                {u === "g" ? "🧵" : u === "un" ? "🔩" : "🧪"}{" "}
                                {m.name}
                                {m.color ? ` · ${m.color}` : ""} ·{" "}
                                {matPriceLabel({
                                  cost_per_g: m.cost_per_g,
                                  unit: u,
                                })}
                              </option>
                            );
                          })}
                        </select>
                        <div className="calc__mat-qty">
                          <input
                            type="number"
                            min="0"
                            step={unit === "un" ? "1" : "0.1"}
                            placeholder={mat ? `cant. (${unitLabel(unit)})` : "cant."}
                            value={line.grams || ""}
                            onChange={(e) =>
                              updateLine(line.id, {
                                grams: numField(e.target.value),
                              })
                            }
                          />
                          <span className="calc__mat-unit">
                            {mat ? unitLabel(unit) : ""}
                          </span>
                        </div>
                        <span className="calc__mat-row-info">
                          {mat
                            ? `stock ${mat.stock_g.toLocaleString("es-AR")}${unitLabel(unit)}`
                            : "—"}
                        </span>
                        <button
                          type="button"
                          className="btn btn--sm btn--ghost"
                          aria-label="Quitar"
                          onClick={() => removeLine(line.id)}
                        >
                          ✕
                        </button>
                      </li>
                    );
                  })}
                </ul>

                <div className="calc__mat-foot">
                  <button
                    type="button"
                    className="btn btn--sm btn--ghost"
                    onClick={addLine}
                  >
                    + Agregar material
                  </button>
                  {totals ? (
                    <span className="calc__mat-totals">
                      {totals.filamentG > 0 && (
                        <>
                          Filamento:{" "}
                          <strong>{totals.filamentG} g</strong> @{" "}
                          <strong>
                            {formatARS(totals.filamentMaxCostPerKg)}/kg
                          </strong>
                        </>
                      )}
                      {totals.filamentG > 0 && totals.accessoriesQty > 0 && " · "}
                      {totals.accessoriesQty > 0 && (
                        <>
                          Insumos:{" "}
                          <strong>{totals.accessoriesQty}</strong> u/ml por{" "}
                          <strong>{formatARS(totals.accessoriesCost)}</strong>
                        </>
                      )}
                    </span>
                  ) : (
                    <span className="hint">
                      Sin materiales válidos → se usa el precio manual de
                      Parámetros y los gramos manuales de abajo.
                    </span>
                  )}
                </div>

                {/* Fallback manual de gramos cuando NO hay líneas válidas. */}
                {!totals && (
                  <div className="field" style={{ marginTop: "0.75rem" }}>
                    <label>Gramos de filamento (manual)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={piece.grams || ""}
                      onChange={(e) =>
                        patchPiece({ grams: numField(e.target.value) })
                      }
                    />
                  </div>
                )}

                {/* Insumos sueltos (escape hatch para lo no rastreado) */}
                <div className="field calc__extras">
                  <label>Otros insumos sueltos ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={piece.extraSupplies || ""}
                    onChange={(e) =>
                      patchPiece({ extraSupplies: numField(e.target.value) })
                    }
                  />
                  <span className="hint">
                    Para cosas que no rastreás por unidad (pegamento, alcohol,
                    lijado). Se suma con +30%.
                  </span>
                </div>
              </>
            )}
          </section>

          {/* ---- Impressora + canal ---- */}
          <section className="caja-form calc__panel">
            <div className="caja-form__head">
              <h3>Impresora y canal de venta</h3>
            </div>
            <div className="caja-form__grid">
              <div className="field calc__full">
                <label>Impresora</label>
                {!hasPrinters ? (
                  <div className="calc__empty calc__empty--inline">
                    <span>Ninguna impresora cadastrada todavía.</span>
                    <div className="calc__empty-actions">
                      <button
                        type="button"
                        className="btn btn--sm btn--primary"
                        onClick={() => onNavigate?.("impressoras")}
                      >
                        Cadastrar impresora
                      </button>
                      <span className="hint">
                        o continuá con input manual (watts × kWh) abajo.
                      </span>
                    </div>
                  </div>
                ) : (
                  <select
                    value={printerId ?? ""}
                    onChange={(e) =>
                      handleSelectPrinter(
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                  >
                    <option value="">— Cálculo manual (watts × kWh) —</option>
                    {printers
                      .filter((p) => !p.archived)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                          {p.cost_per_hour > 0
                            ? ` · ${formatARS(p.cost_per_hour)}/h`
                            : " · sin costo/h"}
                        </option>
                      ))}
                  </select>
                )}
                {selectedPrinter && config.printerHourlyCostOverride != null ? (
                  <span className="hint">
                    Usando costo/h directo de la impresora —{" "}
                    {formatARS(config.printerHourlyCostOverride)} × tiempo.
                    Energía y depreciación se omiten porque ya están dentro de
                    ese valor.
                  </span>
                ) : (
                  <span className="hint">
                    Sin impresora vinculada se calcula energía con watts × kWh
                    + desgaste a partir de Parámetros.
                  </span>
                )}
              </div>
              <div className="field calc__full">
                <label>Canal de venta (taxa)</label>
                <select
                  value={String(config.marketplaceFeePct)}
                  onChange={(e) =>
                    patchConfig({ marketplaceFeePct: Number(e.target.value) || 0 })
                  }
                >
                  {MARKETPLACE_PRESETS.map((p) => (
                    <option key={p.label} value={p.pct}>
                      {p.label}
                    </option>
                  ))}
                  <option value={config.marketplaceFeePct}>
                    Personalizado ({config.marketplaceFeePct}%)
                  </option>
                </select>
                <div className="calc__fee-row">
                  <input
                    type="number"
                    min="0"
                    max="80"
                    step="0.5"
                    value={config.marketplaceFeePct || ""}
                    onChange={(e) =>
                      patchConfig({
                        marketplaceFeePct: numField(e.target.value),
                      })
                    }
                    placeholder="0"
                  />
                  <span className="hint">
                    % de comisión — el total se infla para que después de
                    descontarla queden los números deseados.
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* ---- Parámetros (avanzado, plegable) ---- */}
          <details className="caja-form calc__panel calc__advanced">
            <summary>
              <h3>Parámetros avanzados</h3>
              <span className="hint">
                Precio de filamento manual + cálculo de luz/desgaste cuando no
                hay impresora vinculada
              </span>
            </summary>
            <div className="caja-form__grid">
              <div className="field">
                <label>Precio filamento / kg (fallback)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={config.filamentPricePerKg || ""}
                  onChange={(e) =>
                    patchConfig({ filamentPricePerKg: numField(e.target.value) })
                  }
                  disabled={!!totals && totals.filamentG > 0}
                  title={
                    totals && totals.filamentG > 0
                      ? "Se está usando el precio máximo entre los filamentos elegidos."
                      : undefined
                  }
                />
                {totals && totals.filamentMaxCostPerKg > 0 && (
                  <span className="hint">
                    Auto: {formatARS(totals.filamentMaxCostPerKg)}/kg (máx.
                    filamento elegido)
                  </span>
                )}
              </div>
              <div className="field">
                <label>Precio kWh</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={config.kwhPrice}
                  onChange={(e) =>
                    patchConfig({ kwhPrice: numField(e.target.value) })
                  }
                />
              </div>
              <div className="field">
                <label>Consumo impresora (W)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={config.printerWatts}
                  onChange={(e) =>
                    patchConfig({ printerWatts: numField(e.target.value) })
                  }
                />
              </div>
              <div className="field">
                <label>Vida útil máquina (horas)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={config.machineLifeHours}
                  onChange={(e) =>
                    patchConfig({ machineLifeHours: numField(e.target.value) })
                  }
                />
              </div>
              <div className="field">
                <label>Costo repuesto</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={config.sparePartCost}
                  onChange={(e) =>
                    patchConfig({ sparePartCost: numField(e.target.value) })
                  }
                />
              </div>
              <div className="field">
                <label>Margen de error (%)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={config.errorMarginPct}
                  onChange={(e) =>
                    patchConfig({ errorMarginPct: numField(e.target.value) })
                  }
                />
              </div>
            </div>
          </details>
        </div>

        {/* ===================== COLUMNA DERECHA: RESULTADO ===================== */}
        <aside className="calc__right">
          <section className="caja-form calc__panel calc__result">
            <div className="caja-form__head">
              <h3>Resultado</h3>
              {hasResult && (
                <span className="hint">
                  Para {quantity} u{piece.pieceName ? ` · ${piece.pieceName}` : ""}
                </span>
              )}
            </div>

            {!hasResult ? (
              <div className="calc__result-empty">
                <strong>¿Listo para ver el costo y precio sugerido?</strong>
                <p className="hint">
                  Completá horas, gramos (o filamentos) y los demás campos.
                  Los números aparecen acá apenas haya datos suficientes.
                </p>
              </div>
            ) : (
              <>
                <ul className="calc__lines">
                  <li>
                    <span>
                      Precio material
                      {(breakdown.totalGrams > 0 ||
                        breakdown.accessoriesQty > 0) && (
                        <em className="hint">
                          {" "}
                          (
                          {breakdown.totalGrams > 0 &&
                            `${breakdown.totalGrams} g × ${formatARS(breakdown.pricePerKgUsed)}/kg`}
                          {breakdown.totalGrams > 0 &&
                            breakdown.accessoriesQty > 0 &&
                            " + "}
                          {breakdown.accessoriesQty > 0 &&
                            `insumos ${formatARS(breakdown.materialAccessories)}`}
                          )
                        </em>
                      )}
                    </span>
                    <strong>{formatARS(breakdown.material)}</strong>
                  </li>
                  <li>
                    <span>Precio luz</span>
                    <strong>{formatARS(breakdown.electricity)}</strong>
                  </li>
                  <li>
                    <span>Desgaste máquina</span>
                    <strong>{formatARS(breakdown.machineWear)}</strong>
                  </li>
                  <li>
                    <span>Margen de error</span>
                    <strong>{formatARS(breakdown.errorMargin)}</strong>
                  </li>
                  <li className="calc__lines-sub">
                    <span>Gastos operativos total</span>
                    <strong>{formatARS(breakdown.operativos)}</strong>
                  </li>
                  {breakdown.suppliesBase > 0 && (
                    <li>
                      <span>Otros insumos sueltos (+30%)</span>
                      <strong>{formatARS(breakdown.supplies)}</strong>
                    </li>
                  )}
                  <li className="calc__lines-sub">
                    <span>Subtotal (×{piece.profitMultiplier} + insumos)</span>
                    <strong>{formatARS(breakdown.subtotal)}</strong>
                  </li>
                  {config.marketplaceFeePct > 0 ? (
                    <li>
                      <span>
                        Taxa marketplace ({config.marketplaceFeePct}%)
                      </span>
                      <strong>{formatARS(breakdown.marketplaceFee)}</strong>
                    </li>
                  ) : null}
                  <li className="calc__lines-sub">
                    <span>Total unitario a cobrar</span>
                    <strong>{formatARS(breakdown.total)}</strong>
                  </li>
                  <li>
                    <span>Cantidad</span>
                    <strong>× {quantity}</strong>
                  </li>
                  <li className="calc__lines-total">
                    <span>Total del pedido (calculado)</span>
                    <strong>{formatARS(computedTotal)}</strong>
                  </li>
                </ul>

                <div className="field calc__charge">
                  <label htmlFor="calc-charge">
                    Total a cobrar
                    {isOverridden && (
                      <button
                        type="button"
                        className="calc__charge-reset"
                        onClick={() => setChargeOverride("")}
                        title={`Volver al calculado (${formatARS(computedTotal)})`}
                      >
                        ↺ usar {formatARS(computedTotal)}
                      </button>
                    )}
                  </label>
                  <input
                    id="calc-charge"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    placeholder={String(computedTotal)}
                    value={chargeOverride}
                    onChange={(e) => setChargeOverride(e.target.value)}
                  />
                  <span className="hint">
                    Vacío = usa el calculado. Si lo pisás, los cálculos usan
                    ese valor.
                  </span>
                </div>

                <div
                  className="profit"
                  data-tone={prof.profit >= 0 ? "ok" : "bad"}
                >
                  <div className="profit__row">
                    <span>Costo total ({prof.quantity} u)</span>
                    <strong>{formatARS(prof.totalCost)}</strong>
                  </div>
                  <div className="profit__row">
                    <span>Total a cobrar</span>
                    <strong>{formatARS(prof.revenue)}</strong>
                  </div>
                  <div className="profit__row profit__row--main">
                    <span>Ganancia</span>
                    <strong>
                      {formatARS(prof.profit)}
                      {prof.marginPct != null && (
                        <em className="profit__pct"> · {prof.marginPct}%</em>
                      )}
                    </strong>
                  </div>
                </div>

                <div className="calc__actions">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        className="btn btn--primary"
                        onClick={() => handleSaveQuote("auto")}
                        disabled={!isDirty && !savedFlash}
                        title={
                          isDirty
                            ? "Actualizar la cotización abierta (Ctrl+S)"
                            : "Sin cambios por guardar"
                        }
                      >
                        {savedFlash
                          ? "✓ Guardado"
                          : isDirty
                            ? "● Guardar cambios"
                            : "✓ Sincronizada"}
                      </button>
                      <details className="calc__actions-more">
                        <summary
                          className="btn btn--ghost"
                          title="Más acciones"
                          aria-label="Más acciones"
                        >
                          ⋯ Más
                        </summary>
                        <div className="calc__actions-more__panel">
                          <button
                            type="button"
                            className="btn btn--ghost"
                            onClick={() => handleSaveQuote("copy")}
                            title="Guardar como una cotización nueva (variante)"
                          >
                            Guardar copia
                          </button>
                          <button
                            type="button"
                            className="btn btn--ghost"
                            onClick={handleNewQuote}
                            title="Empezar una cotización en blanco (Ctrl+N)"
                          >
                            Nueva cotización
                          </button>
                        </div>
                      </details>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={() => handleSaveQuote("auto")}
                      title="Guardar esta cotización (Ctrl+S)"
                    >
                      {savedFlash ? "✓ Guardada" : "Guardar cotización"}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={handleCreateQuoteDraft}
                    disabled={charge <= 0}
                    title="Mandar este total al Generador de Presupuestos"
                  >
                    Crear Presupuesto PDF
                  </button>
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={handleCreateOrder}
                    disabled={charge <= 0}
                    title="Crear pedido con esta cotización"
                  >
                    Crear pedido →
                  </button>
                </div>
              </>
            )}
          </section>

          {/* ---- Panel educativo "¿Qué calcula?" ---- */}
          <section className="calc__guide">
            <h4>¿Qué calcula esta calculadora?</h4>
            <ul>
              <li>
                <strong>Material</strong>
                <span>
                  filamentos: gramos × precio/kg del más caro elegido. Insumos
                  (imanes, pintura): qty × costo unitario. Todo del estoque.
                </span>
              </li>
              <li>
                <strong>Energía + depreciación</strong>
                <span>
                  costo/h de la impresora × horas. Si no la vinculás, calcula
                  watts × kWh + desgaste por amortización del repuesto.
                </span>
              </li>
              <li>
                <strong>Margen</strong>
                <span>
                  ×3 mayorista / ×4 minorista / ×5 llaveros sobre los costos
                  operativos.
                </span>
              </li>
              <li>
                <strong>Taxa de marketplaces</strong>
                <span>
                  infla el total para que el % que se queda Mercado Libre /
                  Shopee / Magalu no te coma la ganancia.
                </span>
              </li>
            </ul>
            <p className="hint">
              Usá Estoque + Impresoras vinculados para que los números sean los
              reales del negocio.
            </p>
          </section>
        </aside>
      </div>

      {/* ---- Últimas cotizaciones ---- */}
      <section className="calc__history">
        <div className="calc__history-head">
          <h3>
            Últimas cotizaciones
            {quotes.length > 5 && (
              <span className="hint"> · mostrando 5 de {quotes.length}</span>
            )}
          </h3>
          {quotes.length > 5 && (
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              onClick={() => setHistoryModalOpen(true)}
              title="Ver todas las cotizaciones guardadas con buscador"
            >
              Ver todas ({quotes.length})
            </button>
          )}
        </div>
        {quotes.length === 0 ? (
          <div className="calc__history-empty">
            <strong>Tu historial está vacío</strong>
            <p className="hint">
              Cuando guardes una cotización aparecerá acá — vas a poder
              re-abrirla, duplicarla para hacer variantes, o convertirla en
              pedido directamente.
            </p>
          </div>
        ) : (
          <ul className="calc__history-list">
            {quotes.slice(0, 5).map((q) => {
              const isOpen = q.id === editingQuoteId;
              const wasEdited = !!q.updatedAt;
              return (
                <li
                  key={q.id}
                  className={`calc__history-item${
                    isOpen ? " calc__history-item--editing" : ""
                  }`}
                >
                  <div className="calc__history-main">
                    <strong>
                      {q.piece.pieceName || "Sin nombre"}
                      {isOpen && (
                        <span className="calc__history-badge" title="Esta cotización está abierta en el form">
                          Abierta{isDirty ? " · ● sin guardar" : ""}
                        </span>
                      )}
                    </strong>
                    <span className="hint">
                      {new Date(q.updatedAt ?? q.createdAt).toLocaleString("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {wasEdited ? " · editada" : ""} · {q.quantity} u · ×
                      {q.piece.profitMultiplier} ·{" "}
                      {formatARS(q.breakdown.total)}/u
                      {q.piece.materials && q.piece.materials.length > 1
                        ? ` · ${q.piece.materials.length} filamentos`
                        : ""}
                      {q.chargeOverride != null && " · ✎ valor manual"}
                    </span>
                  </div>
                  <span className="calc__history-total">
                    {formatARS(
                      q.chargeOverride ??
                        round2(q.breakdown.total * q.quantity),
                    )}
                  </span>
                  <div className="calc__history-actions">
                    <button
                      type="button"
                      className="btn btn--sm btn--ghost"
                      onClick={() => handleLoadQuote(q)}
                      disabled={isOpen && !isDirty}
                      title={
                        isOpen
                          ? "Ya está abierta"
                          : "Abrir esta cotización en el form para editarla"
                      }
                    >
                      {isOpen ? "Abierta" : "Abrir"}
                    </button>
                    <button
                      type="button"
                      className="btn btn--sm btn--ghost"
                      onClick={() => handleDuplicateQuote(q)}
                      title="Cargar los datos como una cotización NUEVA (para hacer variantes)"
                    >
                      Duplicar
                    </button>
                    <button
                      type="button"
                      className="btn btn--sm btn--ghost"
                      onClick={() => {
                        const minutesPerUnit =
                          Math.max(0, q.piece.printHours) * 60 +
                          Math.max(0, q.piece.printMinutes);
                        onCreateOrder({
                          value:
                            q.chargeOverride ??
                            round2(q.breakdown.total * q.quantity),
                          quantity: q.quantity,
                          costItems: breakdownToCostItems(q.breakdown),
                          estimatedMinutesPerUnit:
                            minutesPerUnit > 0 ? minutesPerUnit : null,
                        });
                      }}
                    >
                      Pedido →
                    </button>
                    <button
                      type="button"
                      className="btn btn--sm btn--ghost"
                      onClick={() => requestArchive(q)}
                      aria-label="Archivar"
                      title="Archivar (podés restaurarla luego)"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ---- Cotizaciones archivadas ---- */}
      {archived.length > 0 && (
        <section className="calc__history">
          <div className="calc__history-head">
            <h3>
              Cotizaciones archivadas
              {archived.length > 5 && (
                <span className="hint"> · mostrando 5 de {archived.length}</span>
              )}
            </h3>
            {archived.length > 5 && (
              <button
                type="button"
                className="btn btn--sm btn--ghost"
                onClick={() => setHistoryModalOpen(true)}
                title="Ver todas las cotizaciones archivadas"
              >
                Ver todas ({archived.length})
              </button>
            )}
          </div>
          <ul className="calc__history-list">
            {archived.slice(0, 5).map((q) => (
              <li key={q.id} className="calc__history-item">
                <div className="calc__history-main">
                  <strong>{q.piece.pieceName || "Sin nombre"}</strong>
                  <span className="hint">
                    archivada{" "}
                    {new Date(q.archivedAt ?? q.updatedAt ?? q.createdAt).toLocaleString("es-AR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" · "}
                    {q.quantity} u · ×{q.piece.profitMultiplier} ·{" "}
                    {formatARS(q.breakdown.total)}/u
                    {q.piece.materials && q.piece.materials.length > 1
                      ? ` · ${q.piece.materials.length} filamentos`
                      : ""}
                    {q.chargeOverride != null && " · ✎ valor manual"}
                  </span>
                </div>
                <span className="calc__history-total">
                  {formatARS(
                    q.chargeOverride ?? round2(q.breakdown.total * q.quantity),
                  )}
                </span>
                <div className="calc__history-actions">
                  <button
                    type="button"
                    className="btn btn--sm btn--ghost"
                    onClick={() => handleRestoreArchived(q)}
                    title="Restaurar a cotizaciones activas"
                  >
                    Restaurar
                  </button>
                  <button
                    type="button"
                    className="btn btn--sm btn--ghost"
                    onClick={() => requestDeleteArchived(q)}
                    title="Eliminar permanentemente"
                    aria-label="Eliminar permanentemente"
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <HistoryModal
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        quotes={quotes}
        editingQuoteId={editingQuoteId}
        onOpenQuote={handleLoadQuote}
        onDuplicateQuote={handleDuplicateQuote}
        onCreateOrderFromQuote={(q) => {
          const minutesPerUnit =
            Math.max(0, q.piece.printHours) * 60 +
            Math.max(0, q.piece.printMinutes);
          onCreateOrder({
            value: q.chargeOverride ?? round2(q.breakdown.total * q.quantity),
            quantity: q.quantity,
            costItems: breakdownToCostItems(q.breakdown),
            estimatedMinutesPerUnit:
              minutesPerUnit > 0 ? minutesPerUnit : null,
          });
        }}
        archived={archived}
        onArchiveQuote={requestArchive}
        onRestoreArchived={handleRestoreArchived}
        onDeleteArchived={requestDeleteArchived}
      />

      <ConfirmModal
        open={confirmDialog !== null}
        title={confirmDialog?.title ?? ""}
        message={confirmDialog?.message ?? ""}
        confirmLabel={confirmDialog?.confirmLabel ?? "Confirmar"}
        danger={confirmDialog?.danger ?? false}
        onConfirm={() => confirmDialog?.onConfirm()}
        onCancel={() => setConfirmDialog(null)}
      />
    </div>
  );
}
