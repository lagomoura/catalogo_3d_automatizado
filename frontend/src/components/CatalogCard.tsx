import { memo, useEffect, useState, type CSSProperties } from "react";
import {
  deleteCatalogImage,
  deleteCatalogItem,
  resolveStorageUrl,
  restyleCatalogImage,
  updateCatalogItem,
} from "../api/client";
import type { CatalogImage, CatalogItem, CategoryNode } from "../types";
import { getCategoryColor } from "../utils/categoryColor";
import { ImageLightbox } from "./ImageLightbox";
import { Model3DLightbox } from "./Model3DLightbox";

interface Props {
  item: CatalogItem;
  selectionMode: boolean;
  selected: boolean;
  categories: CategoryNode[];
  onToggleSelect: (id: number) => void;
  onItemChanged: (item: CatalogItem) => void;
  onItemDeleted: (id: number) => void;
}

function CatalogCardImpl({
  item,
  selectionMode,
  selected,
  categories,
  onToggleSelect,
  onItemChanged,
  onItemDeleted,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(item.name);
  const [draftCategoryId, setDraftCategoryId] = useState<number | null>(item.category?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [pendingImageId, setPendingImageId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lightboxStart, setLightboxStart] = useState<number | null>(null);
  const [showing3d, setShowing3d] = useState(false);

  useEffect(() => {
    if (!editing) {
      setDraftName(item.name);
      setDraftCategoryId(item.category?.id ?? null);
    }
  }, [item.name, item.category?.id, editing]);

  useEffect(() => {
    if (selectionMode) {
      setEditing(false);
      setError(null);
    }
  }, [selectionMode]);

  const handleCardClick = () => {
    if (selectionMode) onToggleSelect(item.id);
  };

  const handleSaveEdit = async () => {
    const name = draftName.trim();
    const currentCategoryId = item.category?.id ?? null;
    const nameChanged = name && name !== item.name;
    const categoryChanged = draftCategoryId !== currentCategoryId;

    if (!nameChanged && !categoryChanged) {
      setEditing(false);
      return;
    }
    if (!name) {
      setError("El nombre no puede estar vacío");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const payload: { name?: string; category_id?: number | null; clear_category?: boolean } = {};
      if (nameChanged) payload.name = name;
      if (categoryChanged) {
        if (draftCategoryId === null) payload.clear_category = true;
        else payload.category_id = draftCategoryId;
      }
      const updated = await updateCatalogItem(item.id, payload);
      onItemChanged(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteItem = async () => {
    const confirmed = window.confirm(
      `¿Eliminar "${item.name}" del catálogo? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    try {
      await deleteCatalogItem(item.id);
      onItemDeleted(item.id);
    } catch (err) {
      // El backend devuelve 409 con action=archive cuando hay pedidos/runs
      // que dependen del producto. Ofrecemos archivar como salida limpia.
      const msg = err instanceof Error ? err.message : "";
      if (msg.startsWith("409") && /"action":\s*"archive"/.test(msg)) {
        const ok = window.confirm(
          `"${item.name}" tiene pedidos o producciones asociadas y no puede ` +
            `eliminarse sin perder historial.\n\n¿Archivar el producto? ` +
            `(quedará oculto del catálogo pero seguirá visible en sus pedidos).`,
        );
        if (ok) {
          try {
            const updated = await updateCatalogItem(item.id, { archived: true });
            onItemChanged(updated);
          } catch (e2) {
            setError(e2 instanceof Error ? e2.message : "No se pudo archivar");
          }
        }
      } else {
        setError(err instanceof Error ? err.message : "No se pudo eliminar");
      }
      setBusy(false);
    }
  };

  const handleToggleArchived = async () => {
    setBusy(true);
    setError(null);
    try {
      const updated = await updateCatalogItem(item.id, {
        archived: !item.archived,
      });
      onItemChanged(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar el estado");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    const confirmed = window.confirm("¿Eliminar esta imagen del producto?");
    if (!confirmed) return;
    setPendingImageId(imageId);
    setError(null);
    try {
      const updated = await deleteCatalogImage(item.id, imageId);
      onItemChanged(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la imagen");
    } finally {
      setPendingImageId(null);
    }
  };

  const handleRestyleImage = async (imageId: number) => {
    setPendingImageId(imageId);
    setError(null);
    try {
      const updated = await restyleCatalogImage(item.id, imageId);
      onItemChanged(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo re-estilizar");
    } finally {
      setPendingImageId(null);
    }
  };

  const cover = item.images[0];
  const catColor = getCategoryColor(item.category);
  const cardClass = [
    "card",
    selectionMode ? "card--selectable" : "",
    selectionMode && selected ? "card--selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article
      className={cardClass}
      onClick={selectionMode ? handleCardClick : undefined}
      style={{ "--cat": catColor } as CSSProperties}
    >
      {selectionMode && (
        <input
          type="checkbox"
          className="card__select"
          checked={selected}
          onChange={() => onToggleSelect(item.id)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Seleccionar ${item.name}`}
        />
      )}

      {cover ? (
        <Thumb
          image={cover}
          alt={item.name}
          isPending={pendingImageId === cover.id}
          disabled={selectionMode || busy}
          onRestyle={() => handleRestyleImage(cover.id)}
          onDelete={() => handleDeleteImage(cover.id)}
          onOpen={selectionMode ? undefined : () => setLightboxStart(0)}
          onView3d={
            item.model_3d_url && !selectionMode ? () => setShowing3d(true) : undefined
          }
          large
        />
      ) : (
        <div className="card__image card__image--empty">sin imagen</div>
      )}

      {item.model_3d_url && (
        <span className="card__badge-3d" title="Tiene modelo 3D">3D</span>
      )}

      <div className="card__body">
        {editing ? (
          <div className="card__edit">
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              autoFocus
              disabled={busy}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSaveEdit();
                if (e.key === "Escape") {
                  setDraftName(item.name);
                  setDraftCategoryId(item.category?.id ?? null);
                  setEditing(false);
                }
              }}
            />
            <select
              className="card__edit-select"
              value={draftCategoryId ?? ""}
              onChange={(e) =>
                setDraftCategoryId(e.target.value === "" ? null : Number(e.target.value))
              }
              disabled={busy}
            >
              <option value="">— Sin categoría —</option>
              {categories.map((root) => (
                <optgroup key={root.id} label={root.name_es}>
                  <option value={root.id}>{root.name_es}</option>
                  {root.children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {`  ${child.name_es}`}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <div className="card__edit-actions">
              <button
                type="button"
                className="btn btn--small"
                onClick={handleSaveEdit}
                disabled={busy}
              >
                {busy ? "Guardando…" : "Guardar"}
              </button>
              <button
                type="button"
                className="btn btn--small btn--ghost"
                onClick={() => {
                  setDraftName(item.name);
                  setDraftCategoryId(item.category?.id ?? null);
                  setEditing(false);
                }}
                disabled={busy}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <>
            <h3 className="card__title" title={item.name}>{item.name}</h3>
            {item.category ? (
              <span className="card__category">{item.category.name_es}</span>
            ) : (
              <span className="card__category card__category--none">
                Sin categoría
              </span>
            )}
          </>
        )}

        <a
          className="card__link"
          href={item.source_url}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          <span>Ver original</span>
          <span className="card__link-arrow" aria-hidden="true">↗</span>
        </a>

        {error && <p className="card__error">{error}</p>}

        {item.images.length > 1 && (
          <div className="card__thumbs">
            {item.images.slice(1).map((img, i) => (
              <Thumb
                key={img.id}
                image={img}
                alt=""
                isPending={pendingImageId === img.id}
                disabled={selectionMode || busy}
                onRestyle={() => handleRestyleImage(img.id)}
                onDelete={() => handleDeleteImage(img.id)}
                onOpen={selectionMode ? undefined : () => setLightboxStart(i + 1)}
              />
            ))}
          </div>
        )}

        {!selectionMode && !editing && (
          <div className="card__actions">
            <button
              type="button"
              className="card__action-btn"
              onClick={() => setEditing(true)}
              disabled={busy}
              title="Renombrar"
            >
              Renombrar
            </button>
            <button
              type="button"
              className="card__action-btn"
              onClick={handleToggleArchived}
              disabled={busy}
              title={
                item.archived
                  ? "Volver a mostrar este producto en el catálogo"
                  : "Ocultar del catálogo sin perder pedidos/producciones asociadas"
              }
            >
              {item.archived ? "Desarchivar" : "Archivar"}
            </button>
            <button
              type="button"
              className="card__action-btn card__action-btn--danger"
              onClick={handleDeleteItem}
              disabled={busy}
              title="Eliminar producto (si no tiene pedidos asociados)"
            >
              {busy ? "…" : "Eliminar"}
            </button>
          </div>
        )}
      </div>

      {lightboxStart !== null && item.images.length > 0 && (
        <ImageLightbox
          images={item.images}
          startIndex={lightboxStart}
          title={item.name}
          onClose={() => setLightboxStart(null)}
        />
      )}

      {showing3d && item.model_3d_url && (
        <Model3DLightbox
          src={resolveStorageUrl(item.model_3d_url)}
          title={item.name}
          onClose={() => setShowing3d(false)}
        />
      )}
    </article>
  );
}

interface ThumbProps {
  image: CatalogImage;
  alt: string;
  isPending: boolean;
  disabled: boolean;
  onRestyle: () => void;
  onDelete: () => void;
  onOpen?: () => void;
  onView3d?: () => void;
  large?: boolean;
}

function Thumb({
  image,
  alt,
  isPending,
  disabled,
  onRestyle,
  onDelete,
  onOpen,
  onView3d,
  large = false,
}: ThumbProps) {
  const className = large ? "thumb thumb--cover" : "thumb";
  const clickable = !!onOpen;
  return (
    <div
      className={`${className}${isPending ? " thumb--pending" : ""}${clickable ? " thumb--clickable" : ""}`}
      onClick={
        clickable
          ? (e) => {
              e.stopPropagation();
              onOpen?.();
            }
          : undefined
      }
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen?.();
              }
            }
          : undefined
      }
    >
      <img
        className={large ? "card__image" : ""}
        src={resolveStorageUrl(image.styled_url)}
        alt={alt}
        loading="lazy"
      />
      {!disabled && (
        <div className={`thumb__overlay${large ? " thumb__overlay--cover" : ""}`}>
          <button
            type="button"
            className="thumb__corner thumb__corner--left"
            onClick={(e) => {
              e.stopPropagation();
              onRestyle();
            }}
            disabled={isPending}
            title="Re-estilizar con Gemini"
            aria-label="Re-estilizar"
          >
            ↻
          </button>
          <button
            type="button"
            className="thumb__corner thumb__corner--right thumb__corner--danger"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            disabled={isPending}
            title="Eliminar imagen"
            aria-label="Eliminar"
          >
            ×
          </button>
          {large && onView3d && (
            <button
              type="button"
              className="thumb__cta"
              onClick={(e) => {
                e.stopPropagation();
                onView3d();
              }}
              disabled={isPending}
              title="Ver en 3D"
            >
              Vista 3D
            </button>
          )}
        </div>
      )}
      {isPending && <div className="thumb__spinner" aria-label="Procesando" />}
    </div>
  );
}

/* Memoizado: una card solo se re-renderiza si cambian sus props (item, selected,
   selectionMode, categories o callbacks), no por cada cambio del grid. */
export const CatalogCard = memo(CatalogCardImpl);

