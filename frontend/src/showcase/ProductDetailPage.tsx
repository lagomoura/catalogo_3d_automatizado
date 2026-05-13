import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCatalogItem, resolveStorageUrl } from "../api/client";
import { ImageLightbox } from "../components/ImageLightbox";
import type { CatalogItem } from "../types";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const numericId = id ? Number(id) : NaN;
  const [item, setItem] = useState<CatalogItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxStart, setLightboxStart] = useState<number | null>(null);

  useEffect(() => {
    if (!Number.isFinite(numericId)) {
      setError("Producto no encontrado");
      setLoading(false);
      return;
    }
    setLoading(true);
    getCatalogItem(numericId)
      .then((data) => {
        setItem(data);
        setActiveIndex(0);
        setError(null);
      })
      .catch(() => setError("Producto no encontrado"))
      .finally(() => setLoading(false));
  }, [numericId]);

  if (loading) {
    return (
      <div className="product-detail">
        <p className="showcase__loading">Cargando…</p>
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
    </div>
  );
}
