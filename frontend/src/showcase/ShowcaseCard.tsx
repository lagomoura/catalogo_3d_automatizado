import { Link } from "react-router-dom";
import { resolveStorageUrl } from "../api/client";
import type { CatalogItem } from "../types";

interface Props {
  item: CatalogItem;
}

export function ShowcaseCard({ item }: Props) {
  const cover = item.images[0];

  return (
    <Link to={`/producto/${item.id}`} className="showcase-card" aria-label={item.name}>
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
        <div className="showcase-card__overlay">
          <span className="showcase-card__name">{item.name}</span>
        </div>
      </div>
      {item.category && (
        <span className="showcase-card__category">{item.category.name_es}</span>
      )}
    </Link>
  );
}
