/* =============================================================================
   Aura3D — marca + control de tema.
   - AuraMark: isotipo (anillos = capas de impresión + chispa de filamento).
   - Logo: isotipo + wordmark "Aura3D".
   - ThemeToggle: alterna claro/oscuro y persiste en localStorage.
   El tema se inicializa antes del paint vía un script inline en index.html
   (evita el flash), por eso aquí solo leemos/escribimos el atributo.
   ============================================================================= */
import { useEffect, useState } from "react";

const THEME_KEY = "aura-theme";
export type Theme = "light" | "dark";

function currentTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return (document.documentElement.getAttribute("data-theme") as Theme) || "light";
}

/** Hook de tema: refleja y controla `data-theme` en <html>, persistiendo. */
export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(currentTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* almacenamiento no disponible — se ignora */
    }
  }, [theme]);

  return [theme, () => setTheme((t) => (t === "dark" ? "light" : "dark"))];
}

export function AuraMark({ size = 28 }: { size?: number }) {
  const id = "auraGrad";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={id} x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#12B5A5" />
          <stop offset="1" stopColor="#84CC16" />
        </linearGradient>
      </defs>
      <circle
        cx="32"
        cy="32"
        r="22"
        stroke={`url(#${id})`}
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeDasharray="104 34"
        transform="rotate(135 32 32)"
      />
      <circle
        cx="32"
        cy="32"
        r="12.5"
        stroke={`url(#${id})`}
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeDasharray="56 23"
        transform="rotate(135 32 32)"
        opacity="0.9"
      />
      <circle cx="49" cy="20" r="4.6" fill="#84CC16" />
    </svg>
  );
}

/** Logo completo: isotipo + wordmark. `subtitle` opcional para cabeceras. */
export function Logo({ size = 28, subtitle }: { size?: number; subtitle?: string }) {
  return (
    <span className="brand">
      <AuraMark size={size} />
      <span className="brand__text">
        <span className="brand__word">
          Aura<span className="brand__word-accent">3D</span>
        </span>
        {subtitle && <span className="brand__sub">{subtitle}</span>}
      </span>
    </span>
  );
}

/** Botón de alternancia de tema claro/oscuro. */
export function ThemeToggle() {
  const [theme, toggle] = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      title={isDark ? "Tema claro" : "Tema oscuro"}
    >
      {isDark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}
