import { useEffect, useMemo, useState } from "react";
import { getMaterials, getPrinters } from "../../api/client";
import type { Material, PendingQuote, Printer } from "../../types";
import { formatARS } from "../../utils/format";
import {
  breakdownToCostItems,
  computeProfitability,
  computeQuote,
  DEFAULT_PIECE,
  MARKETPLACE_PRESETS,
  round2,
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
}

const MULTIPLIERS: { value: ProfitMultiplier; label: string }[] = [
  { value: 3, label: "×3 Mayorista" },
  { value: 4, label: "×4 Minorista" },
  { value: 5, label: "×5 Llaveros" },
];

function numField(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function CalculadoraPage({ onCreateOrder }: Props) {
  const [config, setConfig] = useState<QuoteConfig>(() => loadConfig());
  const [piece, setPiece] = useState<QuotePiece>({ ...DEFAULT_PIECE });
  const [quantity, setQuantity] = useState(1);
  // Total a cobrar pisado a mano (string del input). "" = usar el calculado.
  const [chargeOverride, setChargeOverride] = useState("");
  const [quotes, setQuotes] = useState<SavedQuote[]>(() => loadQuotes());
  const [savedFlash, setSavedFlash] = useState(false);

  // Integración con Estoque + Impressoras.
  const [materials, setMaterials] = useState<Material[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const initialSelection = loadSelection();
  const [materialId, setMaterialId] = useState<number | null>(
    initialSelection.materialId,
  );
  const [printerId, setPrinterId] = useState<number | null>(
    initialSelection.printerId,
  );

  useEffect(() => {
    void getMaterials().then(setMaterials).catch(() => {});
    void getPrinters().then(setPrinters).catch(() => {});
  }, []);

  // Cuando cambia el material elegido, autocompletar el precio del filamento.
  const handleSelectMaterial = (id: number | null) => {
    setMaterialId(id);
    saveSelection({ materialId: id, printerId });
    if (id != null) {
      const m = materials.find((mm) => mm.id === id);
      if (m && m.cost_per_g > 0) {
        patchConfig({ filamentPricePerKg: round2(m.cost_per_g * 1000) });
      }
    }
  };

  // Cuando cambia la impresora, autocompletar `printerHourlyCostOverride` si la
  // impresora tiene cost_per_hour. Si se quita, vuelve al modo watts × kWh.
  const handleSelectPrinter = (id: number | null) => {
    setPrinterId(id);
    saveSelection({ materialId, printerId: id });
    if (id != null) {
      const p = printers.find((pp) => pp.id === id);
      if (p) {
        patchConfig({
          printerHourlyCostOverride: p.cost_per_hour > 0 ? p.cost_per_hour : null,
        });
      }
    } else {
      patchConfig({ printerHourlyCostOverride: null });
    }
  };

  const breakdown = useMemo(
    () => computeQuote(config, piece),
    [config, piece],
  );
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

  const handleSaveQuote = () => {
    setQuotes(
      pushQuote({
        config,
        piece,
        breakdown,
        quantity,
        chargeOverride: isOverridden ? charge : null,
        materialId,
        printerId,
      }),
    );
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1800);
  };

  const handleLoadQuote = (q: SavedQuote) => {
    setConfig(q.config);
    saveConfig(q.config);
    setPiece(q.piece);
    setQuantity(q.quantity);
    setChargeOverride(q.chargeOverride != null ? String(q.chargeOverride) : "");
    setMaterialId(q.materialId ?? null);
    setPrinterId(q.printerId ?? null);
    saveSelection({
      materialId: q.materialId ?? null,
      printerId: q.printerId ?? null,
    });
  };

  const handleCreateOrder = () => {
    handleSaveQuote();
    onCreateOrder({
      value: charge,
      quantity,
      costItems: breakdownToCostItems(breakdown),
      materialId: materialId,
      gramsPerUnit: piece.grams > 0 ? piece.grams : null,
      printerId: printerId,
    });
  };

  const selectedMaterial = materials.find((m) => m.id === materialId) ?? null;
  const selectedPrinter = printers.find((p) => p.id === printerId) ?? null;

  return (
    <div className="calc">
      <div className="calc__cols">
        {/* ---- Selecciones (Estoque + Impressora + Marketplace) ---- */}
        <section className="caja-form calc__panel calc__panel--select">
          <div className="caja-form__head">
            <h3>Material e impressora</h3>
            <span className="hint">
              Si los elegís, autocompletan precio/hora.
            </span>
          </div>
          <div className="caja-form__grid">
            <div className="field calc__full">
              <label>Material</label>
              <select
                value={materialId ?? ""}
                onChange={(e) =>
                  handleSelectMaterial(
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
              >
                <option value="">— Sin material vinculado —</option>
                {materials
                  .filter((m) => !m.archived)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} · {m.type}
                      {m.color ? ` · ${m.color}` : ""} · stock{" "}
                      {m.stock_g.toLocaleString("es-AR")}g
                    </option>
                  ))}
              </select>
              {selectedMaterial ? (
                <span className="hint">
                  Costo/g: {formatARS(selectedMaterial.cost_per_g)} · al crear
                  el pedido se descontarán {piece.grams * quantity} g del stock.
                </span>
              ) : (
                <span className="hint">
                  Sin material → no se descuenta stock al crear el pedido.
                </span>
              )}
            </div>
            <div className="field calc__full">
              <label>Impressora</label>
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
              {selectedPrinter && config.printerHourlyCostOverride != null ? (
                <span className="hint">
                  Usando costo/h directo de la impressora —{" "}
                  {formatARS(config.printerHourlyCostOverride)} × tiempo.
                </span>
              ) : null}
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

        {/* ---- Parámetros ---- */}
        <section className="caja-form calc__panel">
          <div className="caja-form__head">
            <h3>Parámetros</h3>
            <span className="hint">Se guardan en este navegador</span>
          </div>
          <div className="caja-form__grid">
            <div className="field">
              <label>Precio filamento / kg</label>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={config.filamentPricePerKg || ""}
                onChange={(e) =>
                  patchConfig({ filamentPricePerKg: numField(e.target.value) })
                }
              />
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
        </section>

        {/* ---- Pieza ---- */}
        <section className="caja-form calc__panel">
          <div className="caja-form__head">
            <h3>Pieza</h3>
          </div>
          <div className="caja-form__grid">
            <div className="field calc__full">
              <label>Pieza</label>
              <input
                type="text"
                placeholder="Nombre / referencia"
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
            <div className="field">
              <label>Gramos de filamento</label>
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
            <div className="field">
              <label>Insumos extra ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={piece.extraSupplies || ""}
                onChange={(e) =>
                  patchPiece({ extraSupplies: numField(e.target.value) })
                }
              />
            </div>
            <div className="field">
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
                    onClick={() =>
                      patchPiece({ profitMultiplier: m.value })
                    }
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ---- Resultado ---- */}
        <section className="caja-form calc__panel calc__result">
          <div className="caja-form__head">
            <h3>Resultado</h3>
          </div>
          <ul className="calc__lines">
            <li>
              <span>Precio material</span>
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
            <li>
              <span>Insumos (+30%)</span>
              <strong>{formatARS(breakdown.supplies)}</strong>
            </li>
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
            <li className="calc__lines-sub">
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
              Vacío = usa el calculado. Si lo pisás, los cálculos usan ese valor.
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
        </section>
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
