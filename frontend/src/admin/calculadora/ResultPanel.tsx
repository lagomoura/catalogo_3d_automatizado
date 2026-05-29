import { formatARS } from "../../utils/format";
import type {
  Profitability,
  QuoteBreakdown,
  QuoteConfig,
  QuotePiece,
} from "./calc";

interface Props {
  hasResult: boolean;
  breakdown: QuoteBreakdown;
  config: QuoteConfig;
  piece: QuotePiece;
  prof: Profitability;
  quantity: number;
  computedTotal: number;
  charge: number;
  chargeOverride: string;
  isOverridden: boolean;
  isEditing: boolean;
  isDirty: boolean;
  savedFlash: boolean;
  onChargeOverrideChange: (value: string) => void;
  onSave: (mode: "auto" | "copy") => void;
  onNew: () => void;
  onCreateQuoteDraft: () => void;
  onCreateOrder: () => void;
}

/**
 * Panel de "Resultado" de la Calculadora (desglose + total a cobrar +
 * rentabilidad + acciones). Presentacional: la lógica vive en CalculadoraPage.
 */
export function ResultPanel({
  hasResult,
  breakdown,
  config,
  piece,
  prof,
  quantity,
  computedTotal,
  charge,
  chargeOverride,
  isOverridden,
  isEditing,
  isDirty,
  savedFlash,
  onChargeOverrideChange,
  onSave,
  onNew,
  onCreateQuoteDraft,
  onCreateOrder,
}: Props) {
  return (
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
            Completá horas, gramos (o filamentos) y los demás campos. Los números
            aparecen acá apenas haya datos suficientes.
          </p>
        </div>
      ) : (
        <>
          <ul className="calc__lines">
            <li>
              <span>
                Precio material
                {(breakdown.totalGrams > 0 || breakdown.accessoriesQty > 0) && (
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
                <span>Taxa marketplace ({config.marketplaceFeePct}%)</span>
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
                  onClick={() => onChargeOverrideChange("")}
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
              onChange={(e) => onChargeOverrideChange(e.target.value)}
            />
            <span className="hint">
              Vacío = usa el calculado. Si lo pisás, los cálculos usan ese valor.
            </span>
          </div>

          <div className="profit" data-tone={prof.profit >= 0 ? "ok" : "bad"}>
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
                  onClick={() => onSave("auto")}
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
                      onClick={() => onSave("copy")}
                      title="Guardar como una cotización nueva (variante)"
                    >
                      Guardar copia
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={onNew}
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
                onClick={() => onSave("auto")}
                title="Guardar esta cotización (Ctrl+S)"
              >
                {savedFlash ? "✓ Guardada" : "Guardar cotización"}
              </button>
            )}
            <button
              type="button"
              className="btn btn--ghost"
              onClick={onCreateQuoteDraft}
              disabled={charge <= 0}
              title="Mandar este total al Generador de Presupuestos"
            >
              Crear Presupuesto PDF
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={onCreateOrder}
              disabled={charge <= 0}
              title="Crear pedido con esta cotización"
            >
              Crear pedido →
            </button>
          </div>
        </>
      )}
    </section>
  );
}
