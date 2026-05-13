import { useEffect } from "react";
import { createPortal } from "react-dom";

interface Props {
  src: string;
  title: string;
  onClose: () => void;
}

export function Model3DLightbox({ src, title, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
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

      <figure
        className="lightbox__figure"
        onClick={(e) => e.stopPropagation()}
      >
        <model-viewer
          src={src}
          alt={title}
          camera-controls
          auto-rotate
          shadow-intensity="1"
          exposure="1"
          style={{
            display: "block",
            width: "min(1100px, 92vw)",
            height: "80vh",
            borderRadius: "8px",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.45)",
            backgroundColor: "#1a1a1a",
          }}
        />
        <figcaption className="lightbox__caption">
          <span className="lightbox__title">{title}</span>
          <span className="lightbox__counter">Vista 3D</span>
        </figcaption>
      </figure>
    </div>,
    document.body,
  );
}
