export type JobStatus =
  | "pending"
  | "scraping"
  | "styling"
  | "generating_3d"
  | "done"
  | "failed";

export interface JobProgress {
  done: number;
  total: number;
}

export interface Job {
  job_id: number;
  status: JobStatus;
  url: string;
  n_images: number;
  progress: JobProgress;
  stage_detail: string | null;
  error: string | null;
  item_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface CatalogImage {
  id: number;
  index: number;
  original_url: string;
  styled_url: string;
}

export interface CategoryRef {
  id: number;
  slug: string;
  name_es: string;
  parent_id: number | null;
}

export interface CategoryNode {
  id: number;
  makerworld_id: number;
  slug: string;
  name_en: string;
  name_es: string;
  parent_id: number | null;
  sort_order: number;
  children: CategoryNode[];
}

export interface CatalogItem {
  id: number;
  name: string;
  source_url: string;
  created_at: string;
  images: CatalogImage[];
  category: CategoryRef | null;
  model_3d_url: string | null;
}

export type TransactionKind = "credit" | "debit";
export type TxCategoryKind = "credit" | "debit";

export interface TxCategory {
  id: number;
  name: string;
  kind: TxCategoryKind;
  sort_order: number;
  archived: boolean;
  created_at: string;
}

export type ContactDocumentKind = "DNI" | "CUIT" | "OTRO";

export interface Contact {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  document_kind: ContactDocumentKind | null;
  document_number: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  notes: string | null;
  created_at: string;
}

export interface ContactCreatePayload {
  name: string;
  email?: string | null;
  phone?: string | null;
  document_kind?: ContactDocumentKind | null;
  document_number?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  notes?: string | null;
}

export type ContactUpdatePayload = Partial<ContactCreatePayload>;

export interface ClientLink {
  token: string;
  public_path: string;
  expires_at: string | null;
  contact_id: number | null;
  order_id: number | null;
}

export interface PublicClientInfo {
  token: string;
  expired: boolean;
  consumed: boolean;
  contact: Contact | null;
  order_summary: string | null;
}

export interface PublicClientRegisterPayload {
  name: string;
  email?: string | null;
  phone?: string | null;
  document_kind?: ContactDocumentKind | null;
  document_number?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
}

export interface Account {
  id: number;
  name: string;
  opening_balance: number;
  sort_order: number;
  archived: boolean;
  created_at: string;
}

export interface CashTransaction {
  id: number;
  kind: TransactionKind;
  amount: number;
  occurred_on: string;
  description: string | null;
  product_label: string | null;
  catalog_item: { id: number; name: string } | null;
  contact: { id: number; name: string } | null;
  person_label: string | null;
  account: { id: number; name: string } | null;
  category: string | null;
  category_id: number | null;
  created_at: string;
}

export interface CashTransactionPage {
  items: CashTransaction[];
  total: number;
  limit: number;
  offset: number;
}

export interface MonthlyPoint {
  month: string;
  credit: number;
  debit: number;
}

export interface ProductPoint {
  label: string;
  credit: number;
  debit: number;
}

export interface CategoryPoint {
  category: string;
  credit: number;
  debit: number;
}

export interface ContactPoint {
  contact: string;
  credit: number;
  debit: number;
}

export interface DailyPoint {
  day: string;
  credit: number;
  debit: number;
  net: number;
  cumulative: number;
}

export interface AccountBalance {
  account_id: number;
  name: string;
  opening_balance: number;
  credit: number;
  debit: number;
  balance: number;
}

export interface PeriodTotals {
  total_credit: number;
  total_debit: number;
  balance: number;
  count: number;
}

export interface CashSummary {
  balance: number;
  net: number;
  opening_balance: number;
  total_credit: number;
  total_debit: number;
  count: number;
  monthly: MonthlyPoint[];
  by_product: ProductPoint[];
  by_category: CategoryPoint[];
  by_contact: ContactPoint[];
  daily: DailyPoint[];
  accounts: AccountBalance[];
  previous: PeriodTotals | null;
}

export interface RecurringExpense {
  id: number;
  concept: string;
  amount: number;
  category: string | null;
  category_id: number | null;
  day_of_month: number | null;
  active: boolean;
  created_at: string;
}

export interface Receivable {
  order_id: number;
  value: number;
  contact: string | null;
  product: string | null;
  order_status: OrderStatus;
  quantity: number;
  created_at: string;
}

export interface ReceivablesSummary {
  total: number;
  count: number;
  items: Receivable[];
}

export interface ProfitRow {
  label: string;
  orders_count: number;
  units: number;
  revenue: number;
  cost: number;
  profit: number;
  margin_pct: number;
}

export interface ProfitabilitySummary {
  revenue: number;
  cost: number;
  profit: number;
  margin_pct: number;
  orders_count: number;
  orders_without_cost: number;
  by_product: ProfitRow[];
}

export interface ContactStatement {
  contact: { id: number; name: string };
  total_credit: number;
  total_debit: number;
  balance: number;
  transactions: CashTransaction[];
  receivables_total: number;
  receivables: Receivable[];
}

export type OrderStatus = "CREADO" | "EJECUTANDO" | "EJECUTADO" | "ENTREGADO";
export type PaymentStatus = "PENDIENTE" | "PAGADO";
export type OrderPriority = 1 | 2 | 3;

export interface OrderCostItem {
  id: number;
  concept: string;
  amount: number;
  /** true: costo por unidad (×cantidad). false: costo único del pedido. */
  per_unit: boolean;
  sort_order: number;
}

/** Cotización que la calculadora entrega al formulario de pedido. */
export interface PendingQuote {
  /** Total a cobrar por TODO el pedido (= total unitario × cantidad). */
  value: number;
  /** Cantidad de unidades de la cotización (precarga la cantidad del pedido). */
  quantity: number;
  /** Conceptos de costo POR UNIDAD a snapshotear en el pedido. */
  costItems: { concept: string; amount: number }[];
  /**
   * Material consumido por unidad (Estoque integration). Si se completa,
   * al crear el pedido se registra un OUT de `gramsPerUnit × quantity`
   * gramos vinculado al `order_id` recién creado.
   */
  materialId?: number | null;
  gramsPerUnit?: number | null;
  /** Impresora seleccionada en la calculadora (informativo por ahora). */
  printerId?: number | null;
}

export interface Order {
  id: number;
  catalog_item: { id: number; name: string } | null;
  catalog_cover_url: string | null;
  contact: { id: number; name: string } | null;
  person_label: string | null;
  quantity: number;
  value: number | null;
  note: string | null;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  priority: OrderPriority | null;
  cost_items: OrderCostItem[];
  sale_date: string | null; // ISO date
  deadline: string | null; // ISO date
  is_draft: boolean;
  created_at: string;
  started_at: string | null;
  updated_at: string;
}

export interface OrderSummary {
  em_aberto: number;
  prazo_proximo: number;
  atrasados: number;
  em_producao: number;
  entregues_no_mes: number;
  valor_pendente: number;
  prazo_window_days: number;
}

// ---------------------------------------------------------------------------
// Printers (Impressoras)
// ---------------------------------------------------------------------------

export interface Printer {
  id: number;
  name: string;
  brand: string | null;
  model: string | null;
  environment: string | null;
  purchase_cost: number | null;
  purchase_date: string | null; // ISO date (YYYY-MM-DD)
  kwh_cost: number | null;
  cost_per_hour: number;
  notes: string | null;
  archived: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PrinterCreatePayload {
  name: string;
  brand?: string | null;
  model?: string | null;
  environment?: string | null;
  purchase_cost?: number | null;
  purchase_date?: string | null;
  kwh_cost?: number | null;
  cost_per_hour?: number;
  notes?: string | null;
  sort_order?: number;
}

export type PrinterUpdatePayload = Partial<
  PrinterCreatePayload & { archived: boolean }
>;

// ---------------------------------------------------------------------------
// Materiais (Estoque)
// ---------------------------------------------------------------------------

export type MaterialKind = "PLA" | "PETG" | "ABS" | "TPU" | "RESIN" | "OTRO";
export type MaterialMovementKind = "IN" | "OUT" | "ADJUST";
// Unidad de medida del material. "g" = gramos (filamentos/resinas),
// "un" = unidades (imanes, tornillos, packaging), "ml" = mililitros.
// stock_g y cost_per_g se reinterpretan según esta unidad.
export type MaterialUnit = "g" | "un" | "ml";

export interface Material {
  id: number;
  name: string;
  type: MaterialKind;
  color: string | null;
  brand: string | null;
  model: string | null;
  stock_g: number;
  cost_per_g: number;
  unit: MaterialUnit;
  notes: string | null;
  archived: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MaterialCreatePayload {
  name: string;
  type?: MaterialKind;
  color?: string | null;
  brand?: string | null;
  model?: string | null;
  stock_g?: number;
  cost_per_g?: number;
  unit?: MaterialUnit;
  notes?: string | null;
  sort_order?: number;
}

export type MaterialUpdatePayload = Partial<
  Omit<MaterialCreatePayload, "stock_g"> & { archived: boolean }
>;

export interface MaterialMovement {
  id: number;
  material_id: number;
  kind: MaterialMovementKind;
  grams: number;
  order_id: number | null;
  occurred_on: string; // ISO date
  note: string | null;
  created_at: string;
}

export interface MaterialMovementCreatePayload {
  kind: MaterialMovementKind;
  grams: number;
  order_id?: number | null;
  occurred_on?: string | null;
  note?: string | null;
}

// ---------------------------------------------------------------------------
// Production runs
// ---------------------------------------------------------------------------

export type ProductionStatus =
  | "PENDENTE"
  | "EM_PRODUCAO"
  | "PAUSADA"
  | "CONCLUIDA"
  | "CANCELADA";

export interface OrderRefMini {
  id: number;
  catalog_item: { id: number; name: string } | null;
}

export interface PrinterRefMini {
  id: number;
  name: string;
}

export interface MaterialRefMini {
  id: number;
  name: string;
}

export interface ProductionRun {
  id: number;
  order: OrderRefMini | null;
  printer: PrinterRefMini | null;
  material: MaterialRefMini | null;
  piece_name: string;
  tag: string | null;
  status: ProductionStatus;
  estimated_minutes: number | null;
  grams: number | null;
  started_at: string | null;
  paused_at: string | null;
  ended_at: string | null;
  total_paused_seconds: number;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProductionRunCreatePayload {
  order_id?: number | null;
  printer_id?: number | null;
  material_id?: number | null;
  piece_name: string;
  tag?: string | null;
  estimated_minutes?: number | null;
  grams?: number | null;
  notes?: string | null;
  sort_order?: number;
}

export interface ProductionRunUpdatePayload {
  printer_id?: number | null;
  clear_printer?: boolean;
  material_id?: number | null;
  clear_material?: boolean;
  piece_name?: string;
  tag?: string | null;
  clear_tag?: boolean;
  estimated_minutes?: number | null;
  clear_estimated?: boolean;
  grams?: number | null;
  clear_grams?: boolean;
  notes?: string | null;
}

export interface ProductionSummary {
  total: number;
  pendente: number;
  em_producao: number;
  pausada: number;
  concluida: number;
  cancelada: number;
  horas_concluidas: number;
  gramos_concluidas: number;
}

// ---------------------------------------------------------------------------
// Quotes / Orçamentos
// ---------------------------------------------------------------------------

export interface QuoteItem {
  description: string;
  quantity: number;
  unit_price: number;
}

export interface Quote {
  id: number;
  number: string;
  share_token: string;
  business_name: string;
  business_slogan: string | null;
  business_logo_path: string | null;
  business_logo_url: string | null;
  business_email: string | null;
  business_phone: string | null;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  service_description: string | null;
  items: QuoteItem[];
  total: number;
  valid_until: string; // ISO date
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuoteCreatePayload {
  business_name: string;
  business_slogan?: string | null;
  business_logo_path?: string | null;
  business_email?: string | null;
  business_phone?: string | null;
  client_name: string;
  client_email?: string | null;
  client_phone?: string | null;
  service_description?: string | null;
  items: QuoteItem[];
  valid_until?: string | null;
  notes?: string | null;
}

export interface QuoteUpdatePayload {
  business_name?: string;
  business_slogan?: string | null;
  business_logo_path?: string | null;
  clear_logo?: boolean;
  business_email?: string | null;
  business_phone?: string | null;
  client_name?: string;
  client_email?: string | null;
  client_phone?: string | null;
  service_description?: string | null;
  items?: QuoteItem[];
  valid_until?: string | null;
  notes?: string | null;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          alt?: string;
          "camera-controls"?: boolean | "";
          "auto-rotate"?: boolean | "";
          "shadow-intensity"?: string | number;
          "environment-image"?: string;
          exposure?: string | number;
          ar?: boolean | "";
          poster?: string;
          loading?: "auto" | "lazy" | "eager";
          reveal?: "auto" | "manual";
        },
        HTMLElement
      >;
    }
  }
}
