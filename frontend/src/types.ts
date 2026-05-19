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

export interface Contact {
  id: number;
  name: string;
  notes: string | null;
  created_at: string;
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
  account: { id: number; name: string } | null;
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
  created_at: string;
  started_at: string | null;
  updated_at: string;
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
