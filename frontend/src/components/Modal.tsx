import { useEffect, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Optional max-width override (default ~520px). */
  size?: "sm" | "md" | "lg";
  /** If false, clicking the backdrop does NOT close. Default true. */
  closeOnBackdrop?: boolean;
  /** If false, pressing Escape does NOT close. Default true. */
  closeOnEscape?: boolean;
  children: ReactNode;
  /** Optional class on the panel for feature-specific tweaks. */
  panelClassName?: string;
  /** A11y: visible heading id ties the dialog to its title. */
  labelledBy?: string;
}

/**
 * Generic modal shell. Replaces the per-feature `position: fixed` markup that
 * `OrderEditModal` and similar were doing. Designed so each feature module
 * composes its own form with `<Modal.Header>` / `<Modal.Body>` / `<Modal.Footer>`.
 */
export function Modal({
  open,
  onClose,
  size = "md",
  closeOnBackdrop = true,
  closeOnEscape = true,
  children,
  panelClassName = "",
  labelledBy,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, closeOnEscape]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onMouseDown={(e) => {
        if (!closeOnBackdrop) return;
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`modal-panel modal-panel--${size} ${panelClassName}`}>
        {children}
      </div>
    </div>
  );
}

Modal.Header = function Header({
  children,
  onClose,
  id,
}: {
  children: ReactNode;
  onClose?: () => void;
  id?: string;
}) {
  return (
    <header className="modal-panel__head">
      <h3 className="modal-panel__title" id={id}>
        {children}
      </h3>
      {onClose ? (
        <button
          type="button"
          aria-label="Cerrar"
          className="modal-panel__close"
          onClick={onClose}
        >
          ×
        </button>
      ) : null}
    </header>
  );
};

Modal.Body = function Body({ children }: { children: ReactNode }) {
  return <div className="modal-panel__body">{children}</div>;
};

Modal.Footer = function Footer({ children }: { children: ReactNode }) {
  return <footer className="modal-panel__foot">{children}</footer>;
};
