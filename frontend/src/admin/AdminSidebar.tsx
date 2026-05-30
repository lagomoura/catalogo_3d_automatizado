import { useEffect, useRef } from "react";

/**
 * Identificadores de los módulos del back-office. Es la fuente de verdad del
 * tipo `Tab`: `AdminPage` lo importa desde acá para no duplicarlo.
 */
export type Tab =
  | "catalogo"
  | "reportes"
  | "caja"
  | "pedidos"
  | "calculadora"
  | "impressoras"
  | "estoque"
  | "clientes"
  | "orcamento";

interface NavItem {
  key: Tab;
  label: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Módulos agrupados por temática. El orden define cómo se ven en el menú.
 * Las `key` son los valores de `Tab` (no cambian); solo se reordena/agrupa
 * la presentación.
 */
const GROUPS: NavGroup[] = [
  {
    label: "Catálogo",
    items: [{ key: "catalogo", label: "Catálogo" }],
  },
  {
    label: "Comercial",
    items: [
      { key: "calculadora", label: "Calculadora & Cotizaciones" },
      { key: "orcamento", label: "Presupuestos (PDF)" },
      { key: "pedidos", label: "Pedidos & Producción" },
      { key: "clientes", label: "Clientes" },
    ],
  },
  {
    label: "Finanzas",
    items: [
      { key: "caja", label: "Control de caja" },
      { key: "reportes", label: "Reportes" },
    ],
  },
  {
    label: "Operación",
    items: [
      { key: "impressoras", label: "Impresoras" },
      { key: "estoque", label: "Inventario" },
    ],
  },
];

interface Props {
  tab: Tab;
  onSelect: (t: Tab) => void;
  /** En móvil el sidebar es un drawer; `open` controla su visibilidad. */
  open: boolean;
  onClose: () => void;
}

/**
 * Menú vertical del back-office. En desktop es una columna fija a la izquierda;
 * en móvil/tablet se colapsa en un drawer deslizante con overlay.
 *
 * Es un menú de navegación de secciones (no tabs ARIA): usa `<nav>` + botones
 * con `aria-current="page"` en el activo.
 */
export function AdminSidebar({ tab, onSelect, open, onClose }: Props) {
  const navRef = useRef<HTMLElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  // Distingue "cerré para navegar a un módulo" de "cancelé (Escape/overlay)":
  // al navegar movemos el foco al contenido; al cancelar lo devolvemos al disparador.
  const navigatingRef = useRef(false);

  // Mientras el drawer está abierto (solo móvil): mover el foco al panel,
  // atrapar Tab dentro, cerrar con Escape, bloquear el scroll del body y
  // restaurar el foco al cerrar.
  useEffect(() => {
    if (!open) return;
    const nav = navRef.current;

    navigatingRef.current = false;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const focusables = () => nav?.querySelectorAll<HTMLElement>("button") ?? null;
    focusables()?.[0]?.focus();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const items = focusables();
        if (!items || items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (navigatingRef.current) {
        // Navegación: llevar el foco al contenido recién cargado.
        document.querySelector<HTMLElement>(".admin-main")?.focus();
      } else {
        // Cancelación: devolver el foco a quien abrió el drawer.
        restoreFocusRef.current?.focus();
      }
    };
  }, [open, onClose]);

  // Al elegir un módulo, además de cambiar de vista cerramos el drawer (móvil).
  const handleSelect = (t: Tab) => {
    onSelect(t);
    navigatingRef.current = true;
    onClose();
  };

  return (
    <>
      {open && (
        <div className="admin-sidebar__backdrop" onClick={onClose} aria-hidden="true" />
      )}
      <nav
        ref={navRef}
        id="admin-nav"
        className={`admin-sidebar ${open ? "admin-sidebar--open" : ""}`}
        aria-label="Navegación del back-office"
      >
        {GROUPS.map((group) => (
          <div className="admin-sidebar__group" key={group.label}>
            <p className="admin-sidebar__group-title">{group.label}</p>
            {group.items.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-current={tab === item.key ? "page" : undefined}
                className={`admin-sidebar__item ${
                  tab === item.key ? "admin-sidebar__item--active" : ""
                }`}
                onClick={() => handleSelect(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </nav>
    </>
  );
}
