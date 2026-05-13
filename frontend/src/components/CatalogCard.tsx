import { useEffect, useState } from "react";
import {
  deleteCatalogImage,
  deleteCatalogItem,
  resolveStorageUrl,
  restyleCatalogImage,
  updateCatalogItem,
} from "../api/client";
import type { CatalogImage, CatalogItem, CategoryNode } from "../types";
import { ImageLightbox } from "./ImageLightbox";

interface Props {
  item: CatalogItem;
  selectionMode: boolean;
  selected: boolean;
  categories: CategoryNode[];
  onToggleSelect: (id: number) => void;
  onItemChanged: (item: CatalogItem) => void;
  onItemDeleted: (id: number) => void;
}

export function CatalogCard({
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
      setError(err instanceof Error ? err.message : "No se pudo eliminar");
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
          large
        />
      ) : (
        <div className="card__image card__image--empty">sin imagen</div>
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
            <h3 className="card__title">{item.name}</h3>
            {item.category && (
              <span className="card__category">{item.category.name_es}</span>
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
          Ver original
        </a>

        {!selectionMode && !editing && (
          <div className="card__actions">
            <button
              type="button"
              className="btn btn--small btn--ghost"
              onClick={() => setEditing(true)}
              disabled={busy}
            >
              Renombrar
            </button>
            <button
              type="button"
              className="btn btn--small btn--danger-ghost"
              onClick={handleDeleteItem}
              disabled={busy}
            >
              {busy ? "…" : "Eliminar"}
            </button>
          </div>
        )}

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
      </div>

      {lightboxStart !== null && item.images.length > 0 && (
        <ImageLightbox
          images={item.images}
          startIndex={lightboxStart}
          title={item.name}
          onClose={() => setLightboxStart(null)}
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
        <div className="thumb__overlay">
          <button
            type="button"
            className="thumb__action"
            onClick={(e) => {
              e.stopPropagation();
              onRestyle();
            }}
            disabled={isPending}
            title="Re-estilizar con Gemini"
          >
            Re-estilizar
          </button>
          <button
            type="button"
            className="thumb__action thumb__action--danger"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            disabled={isPending}
            title="Eliminar imagen"
          >
            Borrar
          </button>
        </div>
      )}
      {isPending && <div className="thumb__spinner" aria-label="Procesando" />}
    </div>
  );
}
