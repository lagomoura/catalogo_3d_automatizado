// Calculadora de costos de impresión 3D — función pura, sin estado ni I/O.
// Las fórmulas son transparentes a propósito: cualquier ajuste de negocio
// es un cambio de una línea acá.

export interface QuoteConfig {
  /** Precio del filamento por kg */
  filamentPricePerKg: number;
  /** Precio del kWh */
  kwhPrice: number;
  /** Consumo de la impresora en watts */
  printerWatts: number;
  /** Vida útil de la máquina en horas */
  machineLifeHours: number;
  /** Costo del repuesto / recambio completo */
  sparePartCost: number;
  /** Margen de error en % (ej: 5) */
  errorMarginPct: number;
  /**
   * Cuando se elige una impresora del backend con `cost_per_hour > 0`, este
   * valor reemplaza el cálculo `electricity + machineWear` por un único
   * `printerHourlyCostOverride * totalHours`. Si es null/0, se usa el modelo
   * tradicional watts × kWh + desgaste.
   */
  printerHourlyCostOverride: number | null;
  /**
   * Comisión del marketplace donde se vende (Mercado Libre, Shopee, etc.),
   * en porcentaje. El total final se infla a `total / (1 - fee/100)` para
   * que después de descontar la comisión queden los números deseados.
   * 0 = venta directa sin marketplace.
   */
  marketplaceFeePct: number;
}

export type ProfitMultiplier = 3 | 4 | 5;

export interface QuotePiece {
  pieceName: string;
  printHours: number;
  printMinutes: number;
  grams: number;
  extraSupplies: number;
  profitMultiplier: ProfitMultiplier;
}

export interface QuoteBreakdown {
  material: number;
  electricity: number;
  machineWear: number;
  errorMargin: number;
  /** Gastos operativos total: material + luz + desgaste + margen error. */
  operativos: number;
  /** Insumos extra SIN recargo (costo real, para rentabilidad). */
  suppliesBase: number;
  /** Insumos extra con el +30% (se usa sólo para el total a cobrar). */
  supplies: number;
  /** Subtotal antes de aplicar la comisión del marketplace. */
  subtotal: number;
  /**
   * Monto absoluto que se suma para cubrir la comisión del marketplace
   * (0 si `marketplaceFeePct === 0`).
   */
  marketplaceFee: number;
  /**
   * Total a cobrar = (operativos × multiplicador + insumos(+30%)) inflado
   * para absorber la comisión del marketplace.
   */
  total: number;
}

export const DEFAULT_CONFIG: QuoteConfig = {
  filamentPricePerKg: 0,
  kwhPrice: 140,
  printerWatts: 120,
  machineLifeHours: 4320,
  sparePartCost: 150000,
  errorMarginPct: 5,
  printerHourlyCostOverride: null,
  marketplaceFeePct: 0,
};

/** Presets de comisión por marketplace. 0 = venta directa. */
export const MARKETPLACE_PRESETS: { label: string; pct: number }[] = [
  { label: "Venta directa", pct: 0 },
  { label: "Mercado Libre Clásica (14%)", pct: 14 },
  { label: "Mercado Libre Premium (17.5%)", pct: 17.5 },
  { label: "Shopee (12%)", pct: 12 },
  { label: "Tienda Nube (sin comisión)", pct: 0 },
  { label: "Magalu (16%)", pct: 16 },
];

export const DEFAULT_PIECE: QuotePiece = {
  pieceName: "",
  printHours: 0,
  printMinutes: 0,
  grams: 0,
  extraSupplies: 0,
  profitMultiplier: 4,
};

export const SUPPLIES_SURCHARGE = 0.3; // +30% sobre insumos extra

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function computeQuote(
  config: QuoteConfig,
  piece: QuotePiece,
): QuoteBreakdown {
  const totalHours =
    Math.max(0, piece.printHours) + Math.max(0, piece.printMinutes) / 60;

  const material = (Math.max(0, piece.grams) / 1000) * config.filamentPricePerKg;

  // Cuando hay una impressora elegida con costo/hora declarado, ese valor
  // reemplaza el cálculo detallado de luz + desgaste. Es el patrón que usa
  // Lunaro: una vez que la impresora está caracterizada, no hace falta
  // recalcular watts × kWh + amortización por separado.
  let electricity: number;
  let machineWear: number;
  if (
    config.printerHourlyCostOverride != null &&
    config.printerHourlyCostOverride > 0
  ) {
    electricity = config.printerHourlyCostOverride * totalHours;
    machineWear = 0;
  } else {
    electricity = (config.printerWatts / 1000) * totalHours * config.kwhPrice;
    machineWear =
      config.machineLifeHours > 0
        ? (config.sparePartCost / config.machineLifeHours) * totalHours
        : 0;
  }
  const errorMargin =
    (material + electricity + machineWear) * (config.errorMarginPct / 100);

  const operativos = material + electricity + machineWear + errorMargin;
  const suppliesBase = Math.max(0, piece.extraSupplies);
  const supplies = suppliesBase * (1 + SUPPLIES_SURCHARGE);
  const subtotal = operativos * piece.profitMultiplier + supplies;

  // Inflación por comisión de marketplace: para que después de que el canal
  // se quede su %, te queden los `subtotal` deseados.
  const feePct = Math.max(0, Math.min(99, config.marketplaceFeePct));
  const total = feePct > 0 ? subtotal / (1 - feePct / 100) : subtotal;
  const marketplaceFee = total - subtotal;

  return {
    material: round2(material),
    electricity: round2(electricity),
    machineWear: round2(machineWear),
    errorMargin: round2(errorMargin),
    operativos: round2(operativos),
    suppliesBase: round2(suppliesBase),
    supplies: round2(supplies),
    subtotal: round2(subtotal),
    marketplaceFee: round2(marketplaceFee),
    total: round2(total),
  };
}

/**
 * Rentabilidad de un pedido. Los conceptos `per_unit` escalan con la cantidad;
 * los costos únicos del pedido (reimpresión / extras) cuentan una sola vez.
 */
export interface Profitability {
  quantity: number;
  /** Suma de los costos por unidad (sin multiplicar por la cantidad). */
  unitCost: number;
  totalCost: number;
  revenue: number;
  profit: number;
  /** Margen sobre el valor cobrado, en %. null si no hay valor. */
  marginPct: number | null;
}

export interface CostItemForProfit {
  amount: number;
  per_unit: boolean;
}

export function computeProfitability(
  items: CostItemForProfit[],
  quantity: number,
  revenue: number | null,
): Profitability {
  const qty = Math.max(1, Math.floor(quantity || 1));
  const perUnit = round2(
    items.filter((i) => i.per_unit).reduce((a, b) => a + b.amount, 0),
  );
  const perOrder = round2(
    items.filter((i) => !i.per_unit).reduce((a, b) => a + b.amount, 0),
  );
  const totalCost = round2(perUnit * qty + perOrder);
  const rev = revenue ?? 0;
  const profit = round2(rev - totalCost);
  return {
    quantity: qty,
    unitCost: perUnit,
    totalCost,
    revenue: rev,
    profit,
    marginPct: rev > 0 ? round2((profit / rev) * 100) : null,
  };
}

export interface CostConcept {
  concept: string;
  amount: number;
}

/**
 * Conceptos de COSTO REAL para la rentabilidad (sin ganancia).
 * Insumos van SIN el 30%: ese recargo es ganancia, no costo.
 */
export function breakdownToCostItems(b: QuoteBreakdown): CostConcept[] {
  return [
    { concept: "Material (filamento)", amount: b.material },
    { concept: "Luz", amount: b.electricity },
    { concept: "Desgaste máquina", amount: b.machineWear },
    { concept: "Margen de error", amount: b.errorMargin },
    { concept: "Insumos", amount: b.suppliesBase },
  ].filter((c) => c.amount > 0);
}
