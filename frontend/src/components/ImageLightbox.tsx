import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { resolveStorageUrl } from "../api/client";
import { useFocusTrap } from "../hooks/useFocusTrap";
import type { CatalogImage } from "../types";

interface Props {
  images: CatalogImage[];
  startIndex: number;
  title: string;
  onClose: () => void;
}

export function ImageLightbox({ images, startIndex, title, onClose }: Props) {
  const [index, setIndex] = useState(() =>
    Math.max(0, Math.min(startIndex, images.length - 1)),
  );

  const total = images.length;
  const hasMany = total > 1;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const touchStartX = useRef<number | null>(null);

  useFocusTrap(total > 0, containerRef);

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => (i + delta + total) % total);
    },
    [total],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (hasMany && e.key === "ArrowRight") go(1);
      else if (hasMany && e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [hasMany, go, onClose]);

  if (total === 0) return null;
  const current = images[index];

  return createPortal(
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      ref={containerRef}
      tabIndex={-1}
      onClick={onClose}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        if (!hasMany || touchStartX.current === null) return;
        const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        touchStartX.current = null;
      }}
    >
      <button
        type="button"
        className="lightbox__close"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Cerrar"
      >
        ×
      </button>

      {hasMany && (
        <button
          type="button"
          className="lightbox__nav lightbox__nav--prev"
          onClick={(e) => {
            e.stopPropagation();
            go(-1);
          }}
          aria-label="Anterior"
        >
          ‹
        </button>
      )}

      <figure
        className="lightbox__figure"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          className="lightbox__image"
          src={resolveStorageUrl(current.styled_url)}
          alt={title}
        />
        <figcaption className="lightbox__caption">
          <span className="lightbox__title">{title}</span>
          {hasMany && (
            <span className="lightbox__counter" aria-live="polite">
              {index + 1} / {total}
            </span>
          )}
        </figcaption>
      </figure>

      {hasMany && (
        <button
          type="button"
          className="lightbox__nav lightbox__nav--next"
          onClick={(e) => {
            e.stopPropagation();
            go(1);
          }}
          aria-label="Siguiente"
        >
          ›
        </button>
      )}

      {hasMany && (
        <div
          className="lightbox__dots"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              className={`lightbox__dot${i === index ? " lightbox__dot--active" : ""}`}
              onClick={() => setIndex(i)}
              aria-label={`Imagen ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
