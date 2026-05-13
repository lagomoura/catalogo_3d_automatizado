export type JobStatus =
  | "pending"
  | "scraping"
  | "styling"
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
}
