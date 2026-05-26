import { useEffect, useMemo, useState } from "react";
import { getMaterials, getPrinters } from "../../api/client";
import type { Material, PendingQuote, Printer } from "../../types";
import { formatARS } from "../../utils/format";
import {
  breakdownToCostItems,
  computeProfitability,
  computeQuote,
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
  deleteQuote,
  loadConfig,
  loadQuotes,
  loadSelection,
  pushQuote,
  saveConfig,
  saveSelection,
  type SavedQuote,
} from "./storage";

interface Props {
  onCreateOrder: (quote: PendingQuote) => void;
  /** Cambia a otra pestaña del admin shell (para los CTAs de empty-state). */
  onNavigate?: (tab: string) => void;
}

const MULTIPLIERS: { value: ProfitMultiplier; label: string; sub: string }[] = [
  { value: 3, label: "×3", sub: "Mayorista" },
  { value: 4, label: "×4", sub: "Minorista" },
  { value: 5, label: "×5", sub: "Llaveros" },
];

function numField(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function CalculadoraPage({ onCreateOrder, onNavigate }: Props) {
  const [config, setConfig] = useState<QuoteConfig>(() => loadConfig());
  const [piece, setPiece] = useState<QuotePiece>(() => ({
    ...DEFAULT_PIECE,
    materials: loadSelection().materialLines,
  }));
  const [quantity, setQuantity] = useState(1);
  // Total a cobrar pisado a mano (string del input). "" = usar el calculado.
  const [chargeOverride, setChargeOverride] = useState("");
  const [quotes, setQuotes] = useState<SavedQuote[]>(() => loadQuotes());
  const [savedFlash, setSavedFlash] = useState(false);

  // Integración con Estoque + Impressoras.
  const [materials, setMaterials] = useState<Material[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [printerId, setPrinterId] = useState<number | null>(
    () => loadSelection().printerId,
  );

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
    saveSelection({ materialLines: next, printerId });
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
    saveSelection({ materialLines, printerId: id });
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

  const handleSaveQuote = () => {
    setQuotes(
      pushQuote({
        config,
        piece,
        breakdown,
        quantity,
        chargeOverride: isOverridden ? charge : null,
        // legacy: primer material como atajo
        materialId: validLines[0]?.materialId ?? null,
        printerId,
      }),
    );
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1800);
  };

  const handleLoadQuote = (q: SavedQuote) => {
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
    saveSelection({
      materialLines: restoredPiece.materials,
      printerId: q.printerId ?? null,
    });
  };

  const handleCreateOrder = () => {
    handleSaveQuote();
    const quoteMaterials = buildQuoteMaterials();
    onCreateOrder({
      value: charge,
      quantity,
      costItems: breakdownToCostItems(breakdown),
      materials: quoteMaterials.length > 0 ? quoteMaterials : undefined,
      // Legacy: si hay al menos uno, mando el primero como atajo.
      materialId: quoteMaterials[0]?.materialId ?? null,
      gramsPerUnit: quoteMaterials[0]?.gramsPerUnit ?? null,
      printerId,
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
        <span className="calc__eyebrow">FERRAMENTAS</span>
        <h2 className="calc__title">Calculadora de costos</h2>
        <p className="calc__subtitle">
          Estimá costo de material, máquina y margen — con sugerencia de
          precio y taxas de marketplaces. Cargá cualquier material del estoque
          (filamentos, imanes, pintura) y se descuenta automático al fabricar
          el pedido.
        </p>
      </header>

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
                            ? `${matPriceLabel({ cost_per_g: mat.cost_per_g, unit })} · stock ${mat.stock_g.toLocaleString("es-AR")}${unitLabel(unit)}`
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

                <div className="caja-form__actions calc__actions">
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={handleSaveQuote}
                  >
                    {savedFlash ? "✓ Guardada" : "Guardar cotización"}
                  </button>
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={handleCreateOrder}
                    disabled={charge <= 0}
                  >
                    Crear pedido con esta cotización →
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
        <h3>Últimas cotizaciones</h3>
        {quotes.length === 0 ? (
          <p className="hint">Todavía no guardaste ninguna cotización.</p>
        ) : (
          <ul className="calc__history-list">
            {quotes.map((q) => (
              <li key={q.id} className="calc__history-item">
                <div className="calc__history-main">
                  <strong>{q.piece.pieceName || "Sin nombre"}</strong>
                  <span className="hint">
                    {new Date(q.createdAt).toLocaleString("es-AR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {q.quantity} u · ×{q.piece.profitMultiplier} ·{" "}
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
                  >
                    Cargar
                  </button>
                  <button
                    type="button"
                    className="btn btn--sm btn--ghost"
                    onClick={() =>
                      onCreateOrder({
                        value:
                          q.chargeOverride ??
                          round2(q.breakdown.total * q.quantity),
                        quantity: q.quantity,
                        costItems: breakdownToCostItems(q.breakdown),
                      })
                    }
                  >
                    Pedido →
                  </button>
                  <button
                    type="button"
                    className="btn btn--sm btn--ghost"
                    onClick={() => setQuotes(deleteQuote(q.id))}
                    aria-label="Eliminar"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
