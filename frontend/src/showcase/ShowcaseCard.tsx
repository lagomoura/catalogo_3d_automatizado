import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { resolveStorageUrl } from "../api/client";
import type { CatalogItem } from "../types";
import { getCategoryColor } from "../utils/categoryColor";

interface Props {
  item: CatalogItem;
}

export function ShowcaseCard({ item }: Props) {
  const cover = item.images[0];
  const catColor = getCategoryColor(item.category);

  return (
    <Link
      to={`/producto/${item.id}`}
      className="showcase-card"
      aria-label={item.name}
      style={{ "--cat": catColor } as CSSProperties}
    >
      <div className="showcase-card__media">
        {cover ? (
          <img
            className="showcase-card__image"
            src={resolveStorageUrl(cover.styled_url)}
            alt={item.name}
            loading="lazy"
          />
        ) : (
          <div className="showcase-card__placeholder">Sin imagen</div>
        )}
        {item.model_3d_url && (
          <span className="showcase-card__badge-3d">3D</span>
        )}
        <div className="showcase-card__overlay">
          <span className="showcase-card__name">{item.name}</span>
        </div>
      </div>
      {item.category ? (
        <span className="showcase-card__category">{item.category.name_es}</span>
      ) : (
        <span className="showcase-card__category showcase-card__category--none">
          Sin categoría
        </span>
      )}
    </Link>
  );
}
