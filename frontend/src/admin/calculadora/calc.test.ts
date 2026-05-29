import { describe, it, expect } from "vitest";
import {
  round2,
  computeQuote,
  materialsTotals,
  computeProfitability,
  DEFAULT_CONFIG,
  DEFAULT_PIECE,
  type QuoteConfig,
  type QuotePiece,
  type ResolvedMaterial,
} from "./calc";

describe("round2", () => {
  it("redondea a 2 decimales sin errores de coma flotante", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(2.005)).toBe(2.01);
    expect(round2(1.004)).toBe(1);
  });
});

describe("computeQuote — modo histórico (sin líneas de material)", () => {
  const config: QuoteConfig = {
    ...DEFAULT_CONFIG,
    filamentPricePerKg: 20000,
    kwhPrice: 100,
    printerWatts: 100,
    machineLifeHours: 0, // anula desgaste para aislar el cálculo
    sparePartCost: 0,
    errorMarginPct: 0,
    marketplaceFeePct: 0,
  };
  const piece: QuotePiece = {
    ...DEFAULT_PIECE,
    printHours: 2,
    grams: 100,
    profitMultiplier: 4,
  };

  it("calcula material, electricidad, operativos y total", () => {
    const b = computeQuote(config, piece);
    expect(b.material).toBe(2000); // 100g/1000 * 20000
    expect(b.electricity).toBe(20); // 100W/1000 * 2h * 100
    expect(b.machineWear).toBe(0);
    expect(b.operativos).toBe(2020);
    expect(b.subtotal).toBe(8080); // 2020 * 4
    expect(b.total).toBe(8080);
    expect(b.marketplaceFee).toBe(0);
  });

  it("infla el total por la comisión del marketplace", () => {
    const b = computeQuote({ ...config, marketplaceFeePct: 20 }, piece);
    expect(b.subtotal).toBe(8080);
    expect(b.total).toBe(10100); // 8080 / (1 - 0.20)
    expect(b.marketplaceFee).toBe(2020);
  });

  it("usa el override de costo/hora de la impresora en vez de luz+desgaste", () => {
    const b = computeQuote(
      { ...config, printerHourlyCostOverride: 50, machineLifeHours: 1000, sparePartCost: 100000 },
      piece,
    );
    expect(b.electricity).toBe(100); // 50 * 2h
    expect(b.machineWear).toBe(0); // anulado por el override
  });

  it("computa el desgaste de máquina cuando hay vida útil", () => {
    const b = computeQuote(
      { ...config, machineLifeHours: 1000, sparePartCost: 100000 },
      piece,
    );
    expect(b.machineWear).toBe(200); // (100000/1000) * 2h
  });
});

describe("materialsTotals — regla multicolor + insumos", () => {
  const resolve = (id: number): ResolvedMaterial | null => {
    const map: Record<number, ResolvedMaterial> = {
      1: { costPer: 0.02, unit: "g" }, // $20/kg
      2: { costPer: 0.03, unit: "g" }, // $30/kg (el más caro)
      3: { costPer: 50, unit: "un" }, // insumo suelto
    };
    return map[id] ?? null;
  };

  it("cobra todos los gramos al filamento más caro y suma insumos aparte", () => {
    const totals = materialsTotals(
      [
        { id: "a", materialId: 1, grams: 100 },
        { id: "b", materialId: 2, grams: 50 },
        { id: "c", materialId: 3, grams: 2 }, // 2 unidades del insumo
      ],
      resolve,
    );
    expect(totals).not.toBeNull();
    expect(totals!.filamentG).toBe(150);
    expect(totals!.filamentMaxCostPerKg).toBe(30); // regla multicolor
    expect(totals!.filamentCost).toBe(4.5); // 150/1000 * 30
    expect(totals!.accessoriesCost).toBe(100); // 2 * 50
    expect(totals!.accessoriesQty).toBe(2);
    expect(totals!.totalCost).toBe(104.5);
  });

  it("devuelve null cuando no hay ninguna línea válida", () => {
    expect(materialsTotals([], resolve)).toBeNull();
    expect(materialsTotals([{ id: "x", materialId: null, grams: 10 }], resolve)).toBeNull();
  });
});

describe("computeProfitability", () => {
  it("escala los costos per_unit por cantidad y los únicos una sola vez", () => {
    const p = computeProfitability(
      [
        { amount: 100, per_unit: true },
        { amount: 50, per_unit: false },
      ],
      3,
      500,
    );
    expect(p.unitCost).toBe(100);
    expect(p.totalCost).toBe(350); // 100*3 + 50
    expect(p.profit).toBe(150); // 500 - 350
    expect(p.marginPct).toBe(30); // 150/500 * 100
  });

  it("marginPct es null sin ingreso", () => {
    const p = computeProfitability([{ amount: 10, per_unit: true }], 2, null);
    expect(p.revenue).toBe(0);
    expect(p.marginPct).toBeNull();
  });
});
