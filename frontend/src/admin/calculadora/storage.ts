// Persistencia local de la calculadora: config global del negocio y dos
// cubetas de cotizaciones (activas + archivadas). Estado de trabajo de un
// único admin en un navegador; no necesita backend. Si se borra, vuelve a
// los valores por defecto.

import {
  DEFAULT_CONFIG,
  type QuoteBreakdown,
  type QuoteConfig,
  type QuotePiece,
} from "./calc";

const CONFIG_KEY = "calc.config.v1";
const QUOTES_KEY = "calc.quotes.v1";
const ARCHIVED_QUOTES_KEY = "calc.quotes.archived.v1";
export const MAX_QUOTES = 20;
export const MAX_ARCHIVED = 20;

export interface SavedQuote {
  id: string;
  createdAt: string;
  updatedAt?: string;
  /** Si está seteado, la quote está en la cubeta de archivadas. */
  archivedAt?: string;
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

function readQuotes(key: string, cap: number): SavedQuote[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedQuote[];
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, cap).map((q) => ({
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

function writeQuotes(key: string, list: SavedQuote[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* no crítico */
  }
}

export function loadQuotes(): SavedQuote[] {
  return readQuotes(QUOTES_KEY, MAX_QUOTES);
}

export function loadArchivedQuotes(): SavedQuote[] {
  return readQuotes(ARCHIVED_QUOTES_KEY, MAX_ARCHIVED);
}

/**
 * Agrega una cotización al frente de la lista activa. Si el resultado supera
 * MAX_QUOTES, la(s) más vieja(s) se mueven a la cubeta de archivadas en vez
 * de eliminarse (preserva trabajo del usuario ante explosiones de uso).
 */
export function pushQuote(
  quote: Omit<SavedQuote, "id" | "createdAt">,
): { active: SavedQuote[]; archived: SavedQuote[] } {
  const entry: SavedQuote = {
    ...quote,
    archivedAt: undefined,
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : String(Date.now()),
    createdAt: new Date().toISOString(),
  };
  const combined = [entry, ...loadQuotes()];
  const active = combined.slice(0, MAX_QUOTES);
  const overflow = combined.slice(MAX_QUOTES);
  writeQuotes(QUOTES_KEY, active);
  const archived = overflow.length ? archiveOverflow(overflow) : loadArchivedQuotes();
  return { active, archived };
}

/** Marca las quotes como archivadas y las prepende al archivo, capeando. */
function archiveOverflow(quotes: SavedQuote[]): SavedQuote[] {
  const now = new Date().toISOString();
  const stamped = quotes.map((q) => ({ ...q, archivedAt: now }));
  const next = [...stamped, ...loadArchivedQuotes()].slice(0, MAX_ARCHIVED);
  writeQuotes(ARCHIVED_QUOTES_KEY, next);
  return next;
}

/**
 * Actualiza una cotización activa in place preservando `id` y `createdAt`.
 * La mueve al frente para mantener orden por recencia. Si el id no existe,
 * la lista vuelve sin cambios (idempotente).
 */
export function updateQuote(
  id: string,
  partial: Omit<SavedQuote, "id" | "createdAt" | "updatedAt">,
): SavedQuote[] {
  const all = loadQuotes();
  const idx = all.findIndex((q) => q.id === id);
  if (idx === -1) return all;
  const merged: SavedQuote = {
    ...partial,
    id,
    createdAt: all[idx].createdAt,
    updatedAt: new Date().toISOString(),
  };
  const rest = all.filter((q) => q.id !== id);
  const next = [merged, ...rest];
  writeQuotes(QUOTES_KEY, next);
  return next;
}

/**
 * Elimina sin archivar. Se usa para "Deshacer" un guardado recién hecho —
 * el usuario nunca pidió guardarla, no tiene sentido archivarla.
 */
export function deleteQuote(id: string): SavedQuote[] {
  const next = loadQuotes().filter((q) => q.id !== id);
  writeQuotes(QUOTES_KEY, next);
  return next;
}

/**
 * Mueve una quote activa al archivo. Esta es la acción "Archivar" del UI:
 * recuperable mientras quede espacio en el archivo (cap FIFO).
 */
export function archiveQuote(
  id: string,
): { active: SavedQuote[]; archived: SavedQuote[] } {
  const all = loadQuotes();
  const target = all.find((q) => q.id === id);
  if (!target) {
    return { active: all, archived: loadArchivedQuotes() };
  }
  const active = all.filter((q) => q.id !== id);
  writeQuotes(QUOTES_KEY, active);
  const stamped: SavedQuote = { ...target, archivedAt: new Date().toISOString() };
  const archived = [stamped, ...loadArchivedQuotes()].slice(0, MAX_ARCHIVED);
  writeQuotes(ARCHIVED_QUOTES_KEY, archived);
  return { active, archived };
}

/**
 * Mueve una quote archivada a activas. Si la activación deja >MAX_QUOTES,
 * la activa más vieja vuelve al archivo (efecto rebote esperado).
 */
export function restoreArchivedQuote(
  id: string,
): { active: SavedQuote[]; archived: SavedQuote[] } {
  const archivedAll = loadArchivedQuotes();
  const target = archivedAll.find((q) => q.id === id);
  if (!target) {
    return { active: loadQuotes(), archived: archivedAll };
  }
  const archivedRest = archivedAll.filter((q) => q.id !== id);
  writeQuotes(ARCHIVED_QUOTES_KEY, archivedRest);
  const { archivedAt: _drop, ...restored } = target;
  const restoredQuote = restored as SavedQuote;
  const combined = [restoredQuote, ...loadQuotes()];
  const active = combined.slice(0, MAX_QUOTES);
  const overflow = combined.slice(MAX_QUOTES);
  writeQuotes(QUOTES_KEY, active);
  const archived = overflow.length
    ? archiveOverflow(overflow)
    : loadArchivedQuotes();
  return { active, archived };
}

/** Borrado definitivo desde el archivo. No tiene undo. */
export function deleteArchivedQuote(id: string): SavedQuote[] {
  const next = loadArchivedQuotes().filter((q) => q.id !== id);
  writeQuotes(ARCHIVED_QUOTES_KEY, next);
  return next;
}
