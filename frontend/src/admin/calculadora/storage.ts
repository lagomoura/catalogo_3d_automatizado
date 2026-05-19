// Persistencia local de la calculadora: parámetros de config y las últimas
// 5 cotizaciones. Es estado de trabajo de un único admin en un navegador;
// no necesita backend. Si se borra, vuelve a los valores por defecto.

import {
  DEFAULT_CONFIG,
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
    return parsed
      .slice(0, MAX_QUOTES)
      .map((q) => ({
        ...q,
        quantity: q.quantity && q.quantity > 0 ? q.quantity : 1,
        chargeOverride: q.chargeOverride ?? null,
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
