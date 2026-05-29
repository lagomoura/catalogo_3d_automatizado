import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCatalogItem, resolveStorageUrl } from "../api/client";
import { ImageLightbox } from "../components/ImageLightbox";
import { Model3DLightbox } from "../components/Model3DLightbox";
import { Skeleton } from "../components/Skeleton";
import type { CatalogItem } from "../types";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const numericId = id ? Number(id) : NaN;
  const [item, setItem] = useState<CatalogItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxStart, setLightboxStart] = useState<number | null>(null);
  const [show3d, setShow3d] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(numericId)) {
      setError("Producto no encontrado");
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    getCatalogItem(numericId, ctrl.signal)
      .then((data) => {
        setItem(data);
        setActiveIndex(0);
        setError(null);
      })
      .catch(() => {
        if (ctrl.signal.aborted) return;
        setError("Producto no encontrado");
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [numericId]);

  if (loading) {
    return (
      <div className="product-detail">
        <div className="product-detail__top">
          <Link to="/" className="product-detail__back">← Volver</Link>
        </div>
        <div className="product-detail__layout">
          <Skeleton height="min(80vw, 480px)" radius="var(--r-md)" />
          <div className="product-detail__info">
            <Skeleton width="70%" height="1.75rem" />
            <Skeleton width="40%" height="1rem" style={{ marginTop: "0.75rem" }} />
          </div>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="product-detail product-detail--missing">
        <h2>Producto no encontrado</h2>
        <p>El producto que buscas no existe o fue eliminado.</p>
        <Link to="/" className="btn btn--primary">← Volver a la vitrina</Link>
      </div>
    );
  }

  const active = item.images[activeIndex] ?? item.images[0];

  return (
    <div className="product-detail">
      <div className="product-detail__top">
        <Link to="/" className="product-detail__back">← Volver</Link>
      </div>

      <div className="product-detail__layout">
        <section className="product-detail__gallery">
          {active ? (
            <button
              type="button"
              className="product-detail__hero"
              onClick={() => setLightboxStart(activeIndex)}
              aria-label="Ampliar imagen"
            >
              <img
                src={resolveStorageUrl(active.styled_url)}
                alt={item.name}
                className="product-detail__hero-img"
              />
            </button>
          ) : (
            <div className="product-detail__placeholder">Sin imágenes</div>
          )}

          {item.images.length > 1 && (
            <div className="product-detail__thumbs">
              {item.images.map((img, idx) => (
                <button
                  type="button"
                  key={img.id}
                  className={`product-detail__thumb${idx === activeIndex ? " is-active" : ""}`}
                  onClick={() => setActiveIndex(idx)}
                  aria-label={`Imagen ${idx + 1}`}
                >
                  <img src={resolveStorageUrl(img.styled_url)} alt="" />
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="product-detail__info">
          <h1 className="product-detail__name">{item.name}</h1>
          {item.category && (
            <span className="product-detail__category">{item.category.name_es}</span>
          )}
          {item.model_3d_url && (
            <button
              type="button"
              className="btn-primary product-detail__view3d"
              onClick={() => setShow3d(true)}
            >
              Ver en 3D
            </button>
          )}
        </aside>
      </div>

      {lightboxStart !== null && (
        <ImageLightbox
          images={item.images}
          startIndex={lightboxStart}
          title={item.name}
          onClose={() => setLightboxStart(null)}
        />
      )}

      {show3d && item.model_3d_url && (
        <Model3DLightbox
          src={resolveStorageUrl(item.model_3d_url)}
          poster={active ? resolveStorageUrl(active.styled_url) : undefined}
          title={item.name}
          onClose={() => setShow3d(false)}
        />
      )}
    </div>
  );
}
