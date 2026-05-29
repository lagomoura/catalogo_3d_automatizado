import type { CSSProperties } from "react";

interface SkeletonProps {
  /** Ancho CSS (ej. "100%", "12rem"). Default 100%. */
  width?: string;
  /** Alto CSS (ej. "1rem", "200px"). Default 1rem. */
  height?: string;
  /** Radio del borde. Default --r-sm. */
  radius?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Bloque de carga con shimmer sutil (cubierto por el bloque global de
 * `prefers-reduced-motion`). Reemplaza los "Cargando…" de texto plano.
 */
export function Skeleton({ width = "100%", height = "1rem", radius, className = "", style }: SkeletonProps) {
  return (
    <span
      className={`skeleton ${className}`.trim()}
      aria-hidden="true"
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

/** Grilla de tarjetas-fantasma para la vitrina mientras carga el catálogo. */
export function ShowcaseGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="showcase__grid" aria-busy="true" aria-label="Cargando productos">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card">
          <Skeleton height="100%" radius="var(--r-md)" className="skeleton-card__media" />
          <Skeleton width="60%" height="0.8rem" />
        </div>
      ))}
    </div>
  );
}
