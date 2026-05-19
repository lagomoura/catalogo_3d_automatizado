import type {
  Account,
  CashSummary,
  CashTransaction,
  CashTransactionPage,
  CatalogItem,
  CategoryNode,
  Contact,
  ContactStatement,
  Job,
  Order,
  OrderPriority,
  OrderStatus,
  PaymentStatus,
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
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

export function getCatalog(categoryId: number | null = null): Promise<CatalogItem[]> {
  const qs = categoryId != null ? `?category_id=${categoryId}` : "";
  return request<CatalogItem[]>(`/api/catalog${qs}`);
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

export function createContact(payload: {
  name: string;
  notes?: string | null;
}): Promise<Contact> {
  return request<Contact>(`/api/cash/contacts`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteContact(id: number): Promise<void> {
  return request<void>(`/api/cash/contacts/${id}`, { method: "DELETE" });
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
  cost_items?: OrderCostItemInput[];
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

export function resolveStorageUrl(relativeOrAbsolute: string): string {
  if (/^https?:\/\//i.test(relativeOrAbsolute)) return relativeOrAbsolute;
  if (relativeOrAbsolute.startsWith("/")) return `${STORAGE_BASE}${relativeOrAbsolute}`;
  return `${STORAGE_BASE}/${relativeOrAbsolute}`;
}
