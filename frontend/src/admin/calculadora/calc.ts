// Calculadora de costos de impresión 3D — función pura, sin estado ni I/O.
// Las fórmulas son transparentes a propósito: cualquier ajuste de negocio
// es un cambio de una línea acá.

export interface QuoteConfig {
  /**
   * Precio del filamento por kg. Se usa como **fallback** cuando la pieza
   * no tiene `materials[]` asignados desde el Estoque. Si hay materiales
   * elegidos, el precio efectivo es el MÁXIMO `cost_per_g × 1000` entre
   * todos ellos (regla de negocio para piezas multicolor: cobramos como
   * si todo el filamento fuera el más caro de la pieza).
   */
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

/**
 * Una línea de insumo del estoque asignada a la pieza. Puede ser cualquier
 * material (filamento en gramos, imanes en unidades, pintura en ml). El
 * campo `grams` se llama así por historia pero representa la **cantidad en
 * la unidad nativa del material** (g, un o ml — el backend almacena el
 * stock de forma genérica).
 *
 * - `materialId === null` → fila vacía, todavía no eligió material.
 * - `grams === 0` → cuenta el material pero todavía no cargó cantidad.
 *
 * El stock se descuenta línea por línea al crear el pedido: cada material
 * recibe su propio OUT con su qty × cantidad de unidades del pedido.
 */
export interface MaterialLine {
  id: string;
  materialId: number | null;
  /** Cantidad en la unidad nativa del material (g / un / ml). */
  grams: number;
}

export interface QuotePiece {
  pieceName: string;
  printHours: number;
  printMinutes: number;
  /**
   * Gramos totales — fallback histórico para cuando no hay `materials[]`.
   * Cuando hay líneas con gramos, este campo se ignora (se calcula la suma).
   */
  grams: number;
  extraSupplies: number;
  profitMultiplier: ProfitMultiplier;
  /**
   * Líneas de material asignadas. Vacío = comportamiento clásico
   * (un único filamento + `piece.grams` + `config.filamentPricePerKg`).
   */
  materials: MaterialLine[];
}

export interface QuoteBreakdown {
  /** Costo total del material (filamento + insumos del estoque). */
  material: number;
  /** Porción del costo de material que es filamento (`g`). */
  materialFilament: number;
  /** Porción del costo de material que son insumos (`un`/`ml`). */
  materialAccessories: number;
  electricity: number;
  machineWear: number;
  errorMargin: number;
  /** Gastos operativos total: material + luz + desgaste + margen error. */
  operativos: number;
  /** Insumos extra (campo $ libre) SIN recargo (costo real, rentabilidad). */
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
  /**
   * Gramos de filamento efectivamente usados — Σ líneas `g`, o `piece.grams`
   * si no hay líneas. Sirve para la UI y para descontar stock.
   */
  totalGrams: number;
  /**
   * Precio por kg efectivamente usado — `max(cost_per_g × 1000)` entre las
   * líneas de filamento, o `config.filamentPricePerKg` si no hay líneas.
   */
  pricePerKgUsed: number;
  /** Total de unidades de insumos no-filamento (de líneas un/ml). */
  accessoriesQty: number;
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
  materials: [],
};

export const SUPPLIES_SURCHARGE = 0.3; // +30% sobre insumos extra

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Crea una `MaterialLine` vacía con id estable para usar como key en React. */
export function makeMaterialLine(): MaterialLine {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `ml-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return { id, materialId: null, grams: 0 };
}

/**
 * Información mínima que la calculadora necesita por material para calcular
 * el costo: el costo por unidad nativa del material y la unidad. Es lo que
 * la UI le inyecta al resolver — un slim de `Material` del backend.
 */
export interface ResolvedMaterial {
  /** Costo por unidad nativa del material (por g, por un, o por ml). */
  costPer: number;
  unit: "g" | "un" | "ml";
}

/**
 * Desglose del costo total de materiales. Separa filamentos (regla
 * multicolor: max precio/kg × Σg) de los insumos sueltos del estoque
 * (imanes, pintura, etc. — simple qty × costo unitario por cada uno).
 *
 * `null` cuando no hay ninguna línea válida.
 */
export interface MaterialsTotals {
  /** Σ gramos entre líneas con unidad "g". */
  filamentG: number;
  /** Máximo costo/kg entre los filamentos elegidos (regla multicolor). */
  filamentMaxCostPerKg: number;
  /** Costo del filamento: (filamentG/1000) × filamentMaxCostPerKg. */
  filamentCost: number;
  /** Suma de qty × costo unitario para todas las líneas con unidad != "g". */
  accessoriesCost: number;
  /** Total de unidades de insumos no-filamento (suma de qty de líneas un/ml). */
  accessoriesQty: number;
  /** filamentCost + accessoriesCost. */
  totalCost: number;
}

export function materialsTotals(
  lines: MaterialLine[],
  resolve: (materialId: number) => ResolvedMaterial | null,
): MaterialsTotals | null {
  let filamentG = 0;
  let maxFilamentCostPerG = 0;
  let accessoriesCost = 0;
  let accessoriesQty = 0;
  let any = false;
  for (const line of lines) {
    if (line.materialId == null) continue;
    const qty = Math.max(0, line.grams || 0);
    if (qty <= 0) continue;
    const mat = resolve(line.materialId);
    if (!mat || !Number.isFinite(mat.costPer) || mat.costPer <= 0) continue;
    any = true;
    if (mat.unit === "g") {
      filamentG += qty;
      if (mat.costPer > maxFilamentCostPerG) maxFilamentCostPerG = mat.costPer;
    } else {
      accessoriesCost += qty * mat.costPer;
      accessoriesQty += qty;
    }
  }
  if (!any) return null;
  const filamentCost = (filamentG / 1000) * (maxFilamentCostPerG * 1000);
  return {
    filamentG: round2(filamentG),
    filamentMaxCostPerKg: round2(maxFilamentCostPerG * 1000),
    filamentCost: round2(filamentCost),
    accessoriesCost: round2(accessoriesCost),
    accessoriesQty: round2(accessoriesQty),
    totalCost: round2(filamentCost + accessoriesCost),
  };
}

export function computeQuote(
  config: QuoteConfig,
  piece: QuotePiece,
  /**
   * Opcional: resuelve `{ costPer, unit }` por `materialId`. Si se pasa y la
   * pieza tiene `materials[]`, el costo de material = filamentos (Σg × max
   * $/kg) + insumos (Σ qty × costo unitario), y se ignoran `piece.grams` y
   * `config.filamentPricePerKg` para la porción de filamento.
   */
  resolveMaterial?: (materialId: number) => ResolvedMaterial | null,
): QuoteBreakdown {
  const totalHours =
    Math.max(0, piece.printHours) + Math.max(0, piece.printMinutes) / 60;

  // Resolución del costo de material:
  //  - Con líneas válidas: filamento (Σg × max $/kg) + insumos (Σ qty × $u).
  //  - Sin líneas: cae al modo histórico (piece.grams × filamentPricePerKg).
  const totals = resolveMaterial
    ? materialsTotals(piece.materials ?? [], resolveMaterial)
    : null;

  let material: number;
  let materialFilament: number;
  let materialAccessories: number;
  let effectiveGrams: number;
  let effectivePricePerKg: number;
  let accessoriesQty: number;
  if (totals) {
    material = totals.totalCost;
    materialFilament = totals.filamentCost;
    materialAccessories = totals.accessoriesCost;
    effectiveGrams = totals.filamentG;
    effectivePricePerKg =
      totals.filamentMaxCostPerKg || config.filamentPricePerKg;
    accessoriesQty = totals.accessoriesQty;
  } else {
    effectiveGrams = Math.max(0, piece.grams);
    effectivePricePerKg = config.filamentPricePerKg;
    materialFilament = (effectiveGrams / 1000) * effectivePricePerKg;
    materialAccessories = 0;
    material = materialFilament;
    accessoriesQty = 0;
  }

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
    materialFilament: round2(materialFilament),
    materialAccessories: round2(materialAccessories),
    electricity: round2(electricity),
    machineWear: round2(machineWear),
    errorMargin: round2(errorMargin),
    operativos: round2(operativos),
    suppliesBase: round2(suppliesBase),
    supplies: round2(supplies),
    subtotal: round2(subtotal),
    marketplaceFee: round2(marketplaceFee),
    total: round2(total),
    totalGrams: round2(effectiveGrams),
    pricePerKgUsed: round2(effectivePricePerKg),
    accessoriesQty: round2(accessoriesQty),
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
