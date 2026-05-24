// Persistencia local de la calculadora: parámetros de config y las últimas
// 5 cotizaciones. Es estado de trabajo de un único admin en un navegador;
// no necesita backend. Si se borra, vuelve a los valores por defecto.

import {
  DEFAULT_CONFIG,
  type MaterialLine,
  type QuoteBreakdown,
  type QuoteConfig,
  type QuotePiece,
} from "./calc";

const CONFIG_KEY = "calc.config.v1";
const QUOTES_KEY = "calc.quotes.v1";
const MAX_QUOTES = 5;

export interface SavedQuote {
  id: string;
  createdAt: string;
  /** Unidades cotizadas. Las cotizaciones viejas sin este campo asumen 1. */
  quantity: number;
  /** Total a cobrar pisado a mano. null = usar el calculado. */
  chargeOverride: number | null;
  config: QuoteConfig;
  piece: QuotePiece;
  breakdown: QuoteBreakdown;
  /**
   * Material principal (legacy / atajo). Las cotizaciones nuevas guardan la
   * lista completa en `piece.materials`. Se mantiene este campo para que las
   * cotizaciones viejas sigan abriendo bien.
   */
  materialId?: number | null;
  printerId?: number | null;
}

const SELECTION_KEY = "calc.selection.v1";

export interface CalcSelection {
  /**
   * Líneas de material del último estado. La calculadora arranca con esto;
   * si la pieza tenía sólo 1 material en versiones viejas, se hidrata como
   * una única línea sin gramos (el usuario la completa).
   */
  materialLines: MaterialLine[];
  printerId: number | null;
}

export function loadSelection(): CalcSelection {
  try {
    const raw = localStorage.getItem(SELECTION_KEY);
    if (!raw) return { materialLines: [], printerId: null };
    const parsed = JSON.parse(raw) as Partial<CalcSelection> & {
      // formato viejo: { materialId, printerId }
      materialId?: number | null;
    };
    if (Array.isArray(parsed.materialLines)) {
      return {
        materialLines: parsed.materialLines.filter(
          (l): l is MaterialLine =>
            !!l && typeof l.id === "string" && "materialId" in l,
        ),
        printerId: parsed.printerId ?? null,
      };
    }
    // Migración del formato viejo: un único materialId se hidrata como una
    // línea sin gramos. El usuario completa los gramos en la UI.
    if (parsed.materialId != null) {
      return {
        materialLines: [
          { id: `legacy-${parsed.materialId}`, materialId: parsed.materialId, grams: 0 },
        ],
        printerId: parsed.printerId ?? null,
      };
    }
    return { materialLines: [], printerId: parsed.printerId ?? null };
  } catch {
    return { materialLines: [], printerId: null };
  }
}

export function saveSelection(sel: CalcSelection): void {
  try {
    localStorage.setItem(SELECTION_KEY, JSON.stringify(sel));
  } catch {
    /* no crítico */
  }
}

export function loadConfig(): QuoteConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    const parsed = JSON.parse(raw) as Partial<QuoteConfig>;
    // Merge sobre defaults: tolera versiones viejas sin alguna clave.
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: QuoteConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch {
    /* almacenamiento lleno o no disponible: no es crítico */
  }
}

export function loadQuotes(): SavedQuote[] {
  try {
    const raw = localStorage.getItem(QUOTES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedQuote[];
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_QUOTES).map((q) => ({
      ...q,
      quantity: q.quantity && q.quantity > 0 ? q.quantity : 1,
      chargeOverride: q.chargeOverride ?? null,
      piece: {
        ...q.piece,
        materials: Array.isArray(q.piece?.materials) ? q.piece.materials : [],
      },
    }));
  } catch {
    return [];
  }
}

/** Agrega una cotización al frente y conserva sólo las últimas 5. */
export function pushQuote(
  quote: Omit<SavedQuote, "id" | "createdAt">,
): SavedQuote[] {
  const entry: SavedQuote = {
    ...quote,
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : String(Date.now()),
    createdAt: new Date().toISOString(),
  };
  const next = [entry, ...loadQuotes()].slice(0, MAX_QUOTES);
  try {
    localStorage.setItem(QUOTES_KEY, JSON.stringify(next));
  } catch {
    /* no crítico */
  }
  return next;
}

export function deleteQuote(id: string): SavedQuote[] {
  const next = loadQuotes().filter((q) => q.id !== id);
  try {
    localStorage.setItem(QUOTES_KEY, JSON.stringify(next));
  } catch {
    /* no crítico */
  }
  return next;
}
