import type { ReactNode } from "react";
import { Modal } from "./Modal";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Estiliza el botón de confirmación como acción destructiva. */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Diálogo de confirmación delgado sobre el Modal genérico. Pensado para
 * acciones reversibles (archivar) y destructivas (eliminar definitivamente).
 */
export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      size="sm"
      labelledBy="confirm-modal-title"
    >
      <Modal.Header onClose={onCancel} id="confirm-modal-title">
        {title}
      </Modal.Header>
      <Modal.Body>
        <div className="confirm-modal__message">{message}</div>
      </Modal.Body>
      <Modal.Footer>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`btn ${danger ? "btn--danger" : "btn--primary"}`}
          onClick={onConfirm}
          autoFocus
        >
          {confirmLabel}
        </button>
      </Modal.Footer>
    </Modal>
  );
}
