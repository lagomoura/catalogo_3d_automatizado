/**
 * Pieza impresa en 3D, representada como un bloque isométrico con líneas de capa
 * (la marca visual de la impresión FDM). Puramente decorativo → `aria-hidden`.
 *
 * Hereda el color del contenedor vía `currentColor`, así el mismo objeto se puede
 * teñir distinto en cada card del catálogo y mostrarse "gris" (Original) vs "con
 * tu marca" (re-estilizado) en el before/after, sin duplicar el SVG.
 */
export function PieceSilhouette({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 72"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* cara superior */}
      <path d="M32 6 56 19 32 32 8 19Z" fill="currentColor" opacity="0.95" />
      {/* cara izquierda */}
      <path d="M8 19 32 32 32 60 8 47Z" fill="currentColor" opacity="0.5" />
      {/* cara derecha */}
      <path d="M56 19 32 32 32 60 56 47Z" fill="currentColor" opacity="0.72" />
      {/* líneas de capa (impresión por capas) */}
      <g stroke="currentColor" strokeWidth="0.7" opacity="0.35">
        <path d="M8 26 32 39 56 26" />
        <path d="M8 33 32 46 56 33" />
        <path d="M8 40 32 53 56 40" />
      </g>
    </svg>
  );
}
