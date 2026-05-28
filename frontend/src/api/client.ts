import type {
  Account,
  BusinessProfile,
  BusinessProfileWritePayload,
  CashSummary,
  CashTransaction,
  CashTransactionPage,
  CatalogItem,
  CatalogItemQuote,
  CategoryNode,
  ClientLink as ClientLinkRef,
  Contact,
  ContactCreatePayload,
  ContactStatement,
  ContactUpdatePayload,
  Job,
  PublicClientInfo,
  PublicClientRegisterPayload,
  Material,
  MaterialCreatePayload,
  MaterialMovement,
  MaterialMovementCreatePayload,
  MaterialUpdatePayload,
  Order,
  OrderPriority,
  OrderStatus,
  OrderSummary,
  ProductionRun,
  ProductionRunCreatePayload,
  ProductionRunUpdatePayload,
  ProductionSummary,
  Quote,
  QuoteCreatePayload,
  QuoteUpdatePayload,
  PaymentStatus,
  Printer,
  PrinterCreatePayload,
  PrinterUpdatePayload,
  ProfitabilitySummary,
  ReceivablesSummary,
  RecurringExpense,
  TransactionKind,
  TxCategory,
  TxCategoryKind,
} from "../types";

const API_BASE: string =
  (import.meta.env.VITE_API_BASE as string | undefined) ??
  "http://localhost:8000";

export const STORAGE_BASE = API_BASE;

const ADMIN_AUTH_STORAGE_KEY = "admin_basic_auth";

/**
 * Devuelve los headers de auth admin si `AdminGate` ya validó la password.
 * El backend descarta el header en rutas públicas (catalog GET, /storage, etc.),
 * así que sumarlo siempre es safe y simplifica el call site.
 */
function adminAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = window.sessionStorage.getItem(ADMIN_AUTH_STORAGE_KEY);
  return token ? { Authorization: `Basic ${token}` } : {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...adminAuthHeaders(),
    ...((init?.headers as Record<string, string> | undefined) ?? {}),
  };
  const resp = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`${resp.status} ${resp.statusText}: ${text}`);
  }
  if (resp.status === 204 || resp.headers.get("content-length") === "0") {
    return undefined as T;
  }
  return (await resp.json()) as T;
}

export function createJob(url: string, n_images: number, generate_3d: boolean = true): Promise<Job> {
  return request<Job>("/api/jobs", {
    method: "POST",
    body: JSON.stringify({ url, n_images, generate_3d }),
  });
}

export async function createManualProduct(data: {
  name: string;
  source_url?: string | null;
  category_id?: number | null;
  images: File[];
}): Promise<CatalogItem> {
  const form = new FormData();
  form.append("name", data.name);
  if (data.source_url) form.append("source_url", data.source_url);
  if (data.category_id != null) form.append("category_id", String(data.category_id));
  for (const file of data.images) form.append("images", file);

  // No seteamos Content-Type: el browser agrega el boundary del multipart.
  const resp = await fetch(`${API_BASE}/api/catalog/manual`, {
    method: "POST",
    body: form,
    headers: adminAuthHeaders(),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`${resp.status} ${resp.statusText}: ${text}`);
  }
  return (await resp.json()) as CatalogItem;
}

export function getJob(jobId: number): Promise<Job> {
  return request<Job>(`/api/jobs/${jobId}`);
}

export function getCatalog(
  categoryId: number | null = null,
  options: { include_archived?: boolean } = {},
): Promise<CatalogItem[]> {
  const params = new URLSearchParams();
  if (categoryId != null) params.set("category_id", String(categoryId));
  if (options.include_archived) params.set("include_archived", "true");
  const qs = params.toString();
  return request<CatalogItem[]>(`/api/catalog${qs ? `?${qs}` : ""}`);
}

export function getCatalogItemLatestQuote(id: number): Promise<CatalogItemQuote | null> {
  // El endpoint devuelve 404 si no hay quote. Convertimos a null para que el
  // caller no tenga que distinguir 404 de otros errores.
  return request<CatalogItemQuote>(`/api/catalog/${id}/quotes/latest`).catch((err) => {
    if (err instanceof Error && /^404\b/.test(err.message)) return null;
    throw err;
  });
}

export function saveCatalogItemQuote(
  id: number,
  payload: Record<string, unknown>,
): Promise<CatalogItemQuote> {
  return request<CatalogItemQuote>(`/api/catalog/${id}/quotes`, {
    method: "POST",
    body: JSON.stringify({ payload }),
  });
}

export function getCatalogItem(id: number): Promise<CatalogItem> {
  return request<CatalogItem>(`/api/catalog/${id}`);
}

export function getCategories(): Promise<CategoryNode[]> {
  return request<CategoryNode[]>("/api/categories");
}

export interface CatalogItemUpdatePayload {
  name?: string;
  category_id?: number | null;
  clear_category?: boolean;
  /** Toggle de soft-delete (archivar / desarchivar). */
  archived?: boolean;
}

export function updateCatalogItem(
  id: number,
  payload: CatalogItemUpdatePayload,
): Promise<CatalogItem> {
  return request<CatalogItem>(`/api/catalog/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteCatalogItem(id: number): Promise<void> {
  return request<void>(`/api/catalog/${id}`, { method: "DELETE" });
}

export function bulkDeleteCatalogItems(ids: number[]): Promise<{ deleted: number }> {
  return request<{ deleted: number }>(`/api/catalog/bulk-delete`, {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

export interface BulkUpdatePayload {
  ids: number[];
  category_id?: number | null;
  clear_category?: boolean;
}

export function bulkUpdateCatalogItems(payload: BulkUpdatePayload): Promise<CatalogItem[]> {
  return request<CatalogItem[]>(`/api/catalog/bulk-update`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteCatalogImage(itemId: number, imageId: number): Promise<CatalogItem> {
  return request<CatalogItem>(`/api/catalog/${itemId}/images/${imageId}`, {
    method: "DELETE",
  });
}

export function restyleCatalogImage(itemId: number, imageId: number): Promise<CatalogItem> {
  return request<CatalogItem>(`/api/catalog/${itemId}/images/${imageId}/restyle`, {
    method: "POST",
  });
}

// ---------------------------------------------------------------------------
// Control de caja
// ---------------------------------------------------------------------------

export interface TransactionFilters {
  start?: string;
  end?: string;
  kind?: TransactionKind;
  contact_id?: number;
  category_id?: number;
  q?: string;
  limit?: number;
  offset?: number;
}

export interface CashTransactionPayload {
  kind: TransactionKind;
  amount: number;
  occurred_on: string;
  description?: string | null;
  product_label?: string | null;
  catalog_item_id?: number | null;
  contact_id?: number | null;
  person_label?: string | null;
  category_id?: number | null;
  save_contact?: boolean;
}

export interface CashTransactionUpdatePayload {
  kind?: TransactionKind;
  amount?: number;
  occurred_on?: string;
  description?: string | null;
  product_label?: string | null;
  catalog_item_id?: number | null;
  clear_catalog_item?: boolean;
  contact_id?: number | null;
  clear_contact?: boolean;
  person_label?: string | null;
  category_id?: number | null;
  clear_category?: boolean;
}

function buildQuery(params: object): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "" && v !== null) qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export function getCashTransactions(
  filters: TransactionFilters = {},
): Promise<CashTransactionPage> {
  return request<CashTransactionPage>(
    `/api/cash/transactions${buildQuery(filters)}`,
  );
}

export function cashExportUrl(filters: TransactionFilters = {}): string {
  return `${API_BASE}/api/cash/transactions/export${buildQuery(filters)}`;
}

export function createCashTransaction(
  payload: CashTransactionPayload,
): Promise<CashTransaction> {
  return request<CashTransaction>(`/api/cash/transactions`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateCashTransaction(
  id: number,
  payload: CashTransactionUpdatePayload,
): Promise<CashTransaction> {
  return request<CashTransaction>(`/api/cash/transactions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteCashTransaction(id: number): Promise<void> {
  return request<void>(`/api/cash/transactions/${id}`, { method: "DELETE" });
}

export function getCashSummary(range: {
  start?: string;
  end?: string;
} = {}): Promise<CashSummary> {
  return request<CashSummary>(`/api/cash/summary${buildQuery(range)}`);
}

export function getContacts(): Promise<Contact[]> {
  return request<Contact[]>(`/api/cash/contacts`);
}

export function createContact(
  payload: ContactCreatePayload,
): Promise<Contact> {
  return request<Contact>(`/api/cash/contacts`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateContact(
  id: number,
  payload: ContactUpdatePayload,
): Promise<Contact> {
  return request<Contact>(`/api/cash/contacts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteContact(id: number): Promise<void> {
  return request<void>(`/api/cash/contacts/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Public client links (auto-cadastro)
// ---------------------------------------------------------------------------

export function createClientLink(payload: {
  contact_id?: number | null;
  order_id?: number | null;
  ttl_days?: number;
}): Promise<ClientLinkRef> {
  return request<ClientLinkRef>(`/api/public/clients/links`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getPublicClientInfo(token: string): Promise<PublicClientInfo> {
  return request<PublicClientInfo>(
    `/api/public/clients/info?token=${encodeURIComponent(token)}`,
  );
}

export function publicRegisterClient(
  token: string,
  payload: PublicClientRegisterPayload,
): Promise<Contact> {
  return request<Contact>(
    `/api/public/clients/register?token=${encodeURIComponent(token)}`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export function getContactStatement(id: number): Promise<ContactStatement> {
  return request<ContactStatement>(`/api/cash/contacts/${id}/statement`);
}

// ----- Cuenta única (saldo / balances) -----

export function getAccounts(includeArchived = false): Promise<Account[]> {
  const qs = includeArchived ? "?include_archived=true" : "";
  return request<Account[]>(`/api/cash/accounts${qs}`);
}

// ----- Categorías de movimiento (ingreso / egreso) -----

export function getTxCategories(
  kind?: TxCategoryKind,
  includeArchived = false,
): Promise<TxCategory[]> {
  return request<TxCategory[]>(
    `/api/cash/categories${buildQuery({
      kind,
      include_archived: includeArchived || undefined,
    })}`,
  );
}

export function createTxCategory(payload: {
  name: string;
  kind: TxCategoryKind;
  sort_order?: number;
}): Promise<TxCategory> {
  return request<TxCategory>(`/api/cash/categories`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateTxCategory(
  id: number,
  payload: { name?: string; sort_order?: number; archived?: boolean },
): Promise<TxCategory> {
  return request<TxCategory>(`/api/cash/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteTxCategory(id: number): Promise<void> {
  return request<void>(`/api/cash/categories/${id}`, { method: "DELETE" });
}

// ----- Gastos recurrentes -----

export interface RecurringPayload {
  concept: string;
  amount: number;
  category_id?: number | null;
  day_of_month?: number | null;
}

export interface RecurringUpdatePayload {
  concept?: string;
  amount?: number;
  category_id?: number | null;
  clear_category?: boolean;
  day_of_month?: number | null;
  active?: boolean;
}

export function getRecurring(): Promise<RecurringExpense[]> {
  return request<RecurringExpense[]>(`/api/cash/recurring`);
}

export function createRecurring(
  payload: RecurringPayload,
): Promise<RecurringExpense> {
  return request<RecurringExpense>(`/api/cash/recurring`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateRecurring(
  id: number,
  payload: RecurringUpdatePayload,
): Promise<RecurringExpense> {
  return request<RecurringExpense>(`/api/cash/recurring/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteRecurring(id: number): Promise<void> {
  return request<void>(`/api/cash/recurring/${id}`, { method: "DELETE" });
}

export function postRecurring(
  id: number,
  occurred_on: string,
): Promise<CashTransaction> {
  return request<CashTransaction>(`/api/cash/recurring/${id}/post`, {
    method: "POST",
    body: JSON.stringify({ occurred_on }),
  });
}

// ----- Cuentas por cobrar / rentabilidad -----

export function getReceivables(): Promise<ReceivablesSummary> {
  return request<ReceivablesSummary>(`/api/cash/receivables`);
}

export function getProfitability(range: {
  start?: string;
  end?: string;
} = {}): Promise<ProfitabilitySummary> {
  return request<ProfitabilitySummary>(
    `/api/cash/profitability${buildQuery(range)}`,
  );
}

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------

export interface OrderFilters {
  catalog_item_id?: number;
  order_status?: OrderStatus;
  payment_status?: PaymentStatus;
}

export interface OrderCostItemInput {
  concept: string;
  amount: number;
  /** Omitido = true en el server (costo por unidad). */
  per_unit?: boolean;
}

export interface OrderCreatePayload {
  catalog_item_id: number;
  quantity: number;
  value?: number | null;
  note?: string | null;
  contact_id?: number | null;
  person_label?: string | null;
  save_contact?: boolean;
  priority?: OrderPriority | null;
  /** Fijar al tope de la cola desde el alta (reemplaza el viejo priority). */
  is_pinned?: boolean;
  cost_items?: OrderCostItemInput[];
  sale_date?: string | null;
  deadline?: string | null;
  is_draft?: boolean;
  quote_id?: number | null;
  /** Minutos por pieza para propagar a las ProductionRun que el backend genera. */
  estimated_minutes_per_unit?: number | null;
  /**
   * Snapshot completo del estado de la Calculadora. Si está presente, el backend
   * lo persiste como `latest_quote` del producto — template para próximos pedidos.
   */
  quote_payload?: Record<string, unknown> | null;
}

export interface OrderUpdatePayload {
  quantity?: number;
  value?: number | null;
  clear_value?: boolean;
  note?: string | null;
  priority?: OrderPriority | null;
  clear_priority?: boolean;
  contact_id?: number | null;
  clear_contact?: boolean;
  person_label?: string | null;
  sale_date?: string | null;
  clear_sale_date?: boolean;
  deadline?: string | null;
  clear_deadline?: boolean;
  is_draft?: boolean;
  /** Fijación manual al tope de la cola. */
  is_pinned?: boolean;
}

export function getOrders(filters: OrderFilters = {}): Promise<Order[]> {
  return request<Order[]>(`/api/orders${buildQuery(filters)}`);
}

export function createOrder(payload: OrderCreatePayload): Promise<Order> {
  return request<Order>(`/api/orders`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateOrder(
  id: number,
  payload: OrderUpdatePayload,
): Promise<Order> {
  return request<Order>(`/api/orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function getOrdersSummary(range: {
  start?: string;
  end?: string;
  prazo_window_days?: number;
} = {}): Promise<OrderSummary> {
  return request<OrderSummary>(`/api/orders/summary${buildQuery(range)}`);
}

export function replaceOrderCosts(
  id: number,
  items: OrderCostItemInput[],
): Promise<Order> {
  return request<Order>(`/api/orders/${id}/costs`, {
    method: "PUT",
    body: JSON.stringify({ items }),
  });
}

export function appendOrderCost(
  id: number,
  item: { concept: string; amount: number; per_unit?: boolean },
): Promise<Order> {
  return request<Order>(`/api/orders/${id}/costs/item`, {
    method: "POST",
    body: JSON.stringify(item),
  });
}

export function startOrder(id: number): Promise<Order> {
  return request<Order>(`/api/orders/${id}/start`, { method: "POST" });
}

export function advanceOrder(id: number): Promise<Order> {
  return request<Order>(`/api/orders/${id}/advance`, { method: "POST" });
}

export function setOrderPayment(id: number, paid: boolean): Promise<Order> {
  return request<Order>(`/api/orders/${id}/payment`, {
    method: "POST",
    body: JSON.stringify({ paid }),
  });
}

export function setOrderPriority(
  id: number,
  priority: OrderPriority | null,
): Promise<Order> {
  return request<Order>(`/api/orders/${id}/priority`, {
    method: "PATCH",
    body: JSON.stringify({ priority }),
  });
}

export function deleteOrder(id: number): Promise<void> {
  return request<void>(`/api/orders/${id}`, { method: "DELETE" });
}

export function cancelOrderRuns(id: number): Promise<Order> {
  return request<Order>(`/api/orders/${id}/cancel-runs`, { method: "POST" });
}

export function resolveStorageUrl(relativeOrAbsolute: string): string {
  if (/^https?:\/\//i.test(relativeOrAbsolute)) return relativeOrAbsolute;
  if (relativeOrAbsolute.startsWith("/")) return `${STORAGE_BASE}${relativeOrAbsolute}`;
  return `${STORAGE_BASE}/${relativeOrAbsolute}`;
}

// ---------------------------------------------------------------------------
// Printers
// ---------------------------------------------------------------------------

export function getPrinters(includeArchived = false): Promise<Printer[]> {
  const qs = includeArchived ? "?include_archived=true" : "";
  return request<Printer[]>(`/api/printers${qs}`);
}

export function createPrinter(payload: PrinterCreatePayload): Promise<Printer> {
  return request<Printer>(`/api/printers`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updatePrinter(
  id: number,
  payload: PrinterUpdatePayload,
): Promise<Printer> {
  return request<Printer>(`/api/printers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function archivePrinter(id: number): Promise<void> {
  return request<void>(`/api/printers/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Materials (Estoque)
// ---------------------------------------------------------------------------

export function getMaterials(filters: {
  type?: string;
  include_archived?: boolean;
} = {}): Promise<Material[]> {
  return request<Material[]>(`/api/materials${buildQuery(filters)}`);
}

export function createMaterial(payload: MaterialCreatePayload): Promise<Material> {
  return request<Material>(`/api/materials`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateMaterial(
  id: number,
  payload: MaterialUpdatePayload,
): Promise<Material> {
  return request<Material>(`/api/materials/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function archiveMaterial(id: number): Promise<void> {
  return request<void>(`/api/materials/${id}`, { method: "DELETE" });
}

export function getMaterialMovements(
  materialId: number,
): Promise<MaterialMovement[]> {
  return request<MaterialMovement[]>(`/api/materials/${materialId}/movements`);
}

export function createMaterialMovement(
  materialId: number,
  payload: MaterialMovementCreatePayload,
): Promise<MaterialMovement> {
  return request<MaterialMovement>(`/api/materials/${materialId}/movements`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// Production runs
// ---------------------------------------------------------------------------

export function getProductionRuns(filters: {
  status?: string;
  printer_id?: number;
  order_id?: number;
} = {}): Promise<ProductionRun[]> {
  return request<ProductionRun[]>(`/api/production${buildQuery(filters)}`);
}

export function getProductionSummary(range: {
  start?: string;
  end?: string;
} = {}): Promise<ProductionSummary> {
  return request<ProductionSummary>(`/api/production/summary${buildQuery(range)}`);
}

export function createProductionRun(
  payload: ProductionRunCreatePayload,
): Promise<ProductionRun> {
  return request<ProductionRun>(`/api/production`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateProductionRun(
  id: number,
  payload: ProductionRunUpdatePayload,
): Promise<ProductionRun> {
  return request<ProductionRun>(`/api/production/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function startProductionRun(id: number): Promise<ProductionRun> {
  return request<ProductionRun>(`/api/production/${id}/start`, { method: "POST" });
}

export function pauseProductionRun(id: number): Promise<ProductionRun> {
  return request<ProductionRun>(`/api/production/${id}/pause`, { method: "POST" });
}

export function resumeProductionRun(id: number): Promise<ProductionRun> {
  return request<ProductionRun>(`/api/production/${id}/resume`, { method: "POST" });
}

export function finishProductionRun(id: number): Promise<ProductionRun> {
  return request<ProductionRun>(`/api/production/${id}/finish`, { method: "POST" });
}

export function cancelProductionRun(id: number): Promise<ProductionRun> {
  return request<ProductionRun>(`/api/production/${id}/cancel`, { method: "POST" });
}

export function reopenProductionRun(id: number): Promise<ProductionRun> {
  return request<ProductionRun>(`/api/production/${id}/reopen`, { method: "POST" });
}

export function deleteProductionRun(id: number): Promise<void> {
  return request<void>(`/api/production/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Quotes
// ---------------------------------------------------------------------------

export function getQuotes(limit = 50): Promise<Quote[]> {
  return request<Quote[]>(`/api/quotes?limit=${limit}`);
}

export function getQuote(id: number): Promise<Quote> {
  return request<Quote>(`/api/quotes/${id}`);
}

export function createQuote(payload: QuoteCreatePayload): Promise<Quote> {
  return request<Quote>(`/api/quotes`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateQuote(
  id: number,
  payload: QuoteUpdatePayload,
): Promise<Quote> {
  return request<Quote>(`/api/quotes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteQuote(id: number): Promise<void> {
  return request<void>(`/api/quotes/${id}`, { method: "DELETE" });
}

export function getPublicQuote(token: string): Promise<Quote> {
  return request<Quote>(`/api/quotes/public/${encodeURIComponent(token)}`);
}

/** URL absoluta del PDF del quote (para `<a download>` o `window.open`). */
export function quotePdfUrl(id: number): string {
  return `${API_BASE}/api/quotes/${id}/pdf`;
}

export async function uploadQuoteLogo(
  file: File,
): Promise<{ path: string; url: string }> {
  const form = new FormData();
  form.append("file", file);
  const resp = await fetch(`${API_BASE}/api/quotes/upload-logo`, {
    method: "POST",
    body: form,
    headers: adminAuthHeaders(),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`${resp.status} ${resp.statusText}: ${text}`);
  }
  return (await resp.json()) as { path: string; url: string };
}

// ---------------------------------------------------------------------------
// Business profile
// ---------------------------------------------------------------------------

export function getBusinessProfile(): Promise<BusinessProfile | null> {
  return request<BusinessProfile | null>(`/api/business-profile`);
}

export function putBusinessProfile(
  payload: BusinessProfileWritePayload,
): Promise<BusinessProfile> {
  return request<BusinessProfile>(`/api/business-profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
