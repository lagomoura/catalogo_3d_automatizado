import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { Logo, ThemeToggle } from "../../components/Brand";

const ANCHORS = [
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#funciones", label: "Funciones" },
];

/** Nav sticky de la landing. Único componente con estado (menú mobile). */
export function LandingNav() {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

  // Cierra el menú con Escape y al volver a desktop (≥960px).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const mq = window.matchMedia("(min-width: 960px)");
    const onChange = () => mq.matches && setOpen(false);
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onChange);
    return () => {
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onChange);
    };
  }, [open]);

  // Scroll-lock del body mientras el menú overlay está abierto.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Focus management: al abrir, foco al primer ítem del panel; al cerrar,
  // devuelve el foco al botón hamburguesa (solo si venía de estar abierto).
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();
      });
    } else if (wasOpen.current) {
      toggleRef.current?.focus();
    }
    wasOpen.current = open;
  }, [open]);

  // Focus-trap: Tab/Shift+Tab ciclan dentro del panel abierto.
  const onPanelKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return;
    const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled])',
    );
    if (!focusables || focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <header className={`landing__nav${open ? " landing__nav--open" : ""}`}>
      <div className="landing__container landing__nav-inner">
        <Link to="/" className="landing__nav-brand" aria-label="Aura3D — inicio">
          <Logo size={32} subtitle="Tiendas 3D" />
        </Link>

        <nav className="landing__nav-links" aria-label="Secciones">
          {ANCHORS.map((a) => (
            <a key={a.href} href={a.href} onClick={() => setOpen(false)}>
              {a.label}
            </a>
          ))}
        </nav>

        <div className="landing__nav-cta">
          <ThemeToggle />
          <Link to="/login" className="btn landing__btn">
            Ingresar
          </Link>
          <Link to="/signup" className="btn btn--primary landing__btn">
            Crear mi tienda
          </Link>
        </div>

        <button
          ref={toggleRef}
          type="button"
          className="landing__nav-toggle"
          aria-expanded={open}
          aria-controls="landing-mobile-menu"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {open && (
        <div
          className="landing__nav-scrim"
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        id="landing-mobile-menu"
        ref={panelRef}
        className="landing__nav-mobile"
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
        hidden={!open}
        onKeyDown={onPanelKeyDown}
      >
        {ANCHORS.map((a) => (
          <a key={a.href} href={a.href} onClick={() => setOpen(false)}>
            {a.label}
          </a>
        ))}
        <div className="landing__nav-mobile-theme">
          <ThemeToggle />
        </div>
        <Link to="/login" className="btn landing__btn" onClick={() => setOpen(false)}>
          Ingresar
        </Link>
        <Link
          to="/signup"
          className="btn btn--primary landing__btn"
          onClick={() => setOpen(false)}
        >
          Crear mi tienda
        </Link>
      </div>
    </header>
  );
}
