import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "../hooks/useFocusTrap";

const MODEL_VIEWER_SRC =
  "https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js";

let modelViewerPromise: Promise<void> | null = null;

/** Inyecta el script de model-viewer una sola vez, la primera vez que se usa. */
function ensureModelViewer(): Promise<void> {
  if (typeof window !== "undefined" && "customElements" in window && customElements.get("model-viewer")) {
    return Promise.resolve();
  }
  if (!modelViewerPromise) {
    modelViewerPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.type = "module";
      script.src = MODEL_VIEWER_SRC;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("model-viewer failed to load"));
      document.head.appendChild(script);
    });
  }
  return modelViewerPromise;
}

interface Props {
  src: string;
  title: string;
  /** Imagen de respaldo mientras carga el .glb (evita el cuadro vacío). */
  poster?: string;
  onClose: () => void;
}

export function Model3DLightbox({ src, title, poster, onClose }: Props) {
  const viewerRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  useFocusTrap(true, containerRef);

  useEffect(() => {
    let alive = true;
    ensureModelViewer()
      .then(() => {
        if (alive) setReady(true);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

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

  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;
    const onError = () => setFailed(true);
    el.addEventListener("error", onError);
    return () => el.removeEventListener("error", onError);
  }, []);

  return createPortal(
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      ref={containerRef}
      tabIndex={-1}
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
        {failed ? (
          <div className="lightbox__model lightbox__model--error">
            <p>No pudimos cargar el modelo 3D.</p>
            <p className="lightbox__model-hint">Probá recargar la página.</p>
          </div>
        ) : !ready ? (
          <div className="lightbox__model lightbox__model--error">
            <p className="lightbox__model-hint">Cargando modelo 3D…</p>
          </div>
        ) : (
          <model-viewer
            ref={viewerRef}
            className="lightbox__model"
            src={src}
            alt={title}
            poster={poster}
            camera-controls
            auto-rotate
            reveal="auto"
            shadow-intensity="1"
            exposure="1"
          />
        )}
        <figcaption className="lightbox__caption">
          <span className="lightbox__title">{title}</span>
          <span className="lightbox__counter">Vista 3D</span>
        </figcaption>
      </figure>
    </div>,
    document.body,
  );
}
