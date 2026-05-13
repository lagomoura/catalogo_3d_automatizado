import type { CatalogItem, CategoryNode, Job } from "../types";

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

export function resolveStorageUrl(relativeOrAbsolute: string): string {
  if (/^https?:\/\//i.test(relativeOrAbsolute)) return relativeOrAbsolute;
  if (relativeOrAbsolute.startsWith("/")) return `${STORAGE_BASE}${relativeOrAbsolute}`;
  return `${STORAGE_BASE}/${relativeOrAbsolute}`;
}
