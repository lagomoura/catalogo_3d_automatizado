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
  created_at: string;
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

export interface CashSummary {
  balance: number;
  total_credit: number;
  total_debit: number;
  count: number;
  monthly: MonthlyPoint[];
  by_product: ProductPoint[];
}

export type OrderStatus = "CREADO" | "EJECUTANDO" | "EJECUTADO" | "ENTREGADO";
export type PaymentStatus = "PENDIENTE" | "PAGADO";
export type OrderPriority = 1 | 2 | 3;

export interface Order {
  id: number;
  catalog_item: { id: number; name: string } | null;
  catalog_cover_url: string | null;
  contact: { id: number; name: string } | null;
  person_label: string | null;
  quantity: number;
  note: string | null;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  priority: OrderPriority | null;
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
