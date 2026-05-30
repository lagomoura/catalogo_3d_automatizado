import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { deleteAccount } from "../api/client";
import { Modal } from "../components/Modal";
import { useAuth } from "../auth/AuthProvider";

const STATUS_LABEL: Record<string, string> = {
  trialing: "Prueba",
  active: "Activa",
  suspended: "Suspendida",
};

/** Panel de cuenta: info de la tienda + zona de peligro (baja irreversible).
 * Consume `DELETE /api/account`; la confirmación por slug evita borrados
 * accidentales (mismo patrón que GitHub al borrar un repo). */
export function AccountModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!session) return null;
  const { tenant, email } = session;
  const matches = confirm.trim().toLowerCase() === tenant.slug;

  const handleDelete = async (e: FormEvent) => {
    e.preventDefault();
    if (!matches || busy) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(confirm.trim().toLowerCase());
      logout();
      navigate("/login", { replace: true });
    } catch {
      setError("No se pudo dar de baja la tienda. Intentá de nuevo.");
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="account-modal-title">
      <Modal.Header onClose={onClose} id="account-modal-title">
        Cuenta
      </Modal.Header>
      <Modal.Body>
        <dl className="account-info">
          <dt>Tienda</dt>
          <dd>{tenant.name} <code>({tenant.slug})</code></dd>
          <dt>Email</dt>
          <dd>{email}</dd>
          <dt>Suscripción</dt>
          <dd>{STATUS_LABEL[tenant.subscription_status] ?? tenant.subscription_status}</dd>
        </dl>

        <form className="danger-zone" onSubmit={handleDelete}>
          <h4 className="danger-zone__title">Zona de peligro</h4>
          <p className="danger-zone__text">
            Dar de baja la tienda borra <strong>todos</strong> tus datos y archivos
            (catálogo, pedidos, caja, presupuestos…). Esta acción no se puede
            deshacer.
          </p>
          <label className="danger-zone__label" htmlFor="confirm-slug">
            Para confirmar, escribí el slug de tu tienda: <code>{tenant.slug}</code>
          </label>
          <input
            id="confirm-slug"
            className="admin-gate__input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={tenant.slug}
            autoComplete="off"
          />
          {error && <p className="admin-gate__error">{error}</p>}
          <button type="submit" className="btn btn--danger" disabled={!matches || busy}>
            {busy ? "Eliminando…" : "Eliminar tienda"}
          </button>
        </form>
      </Modal.Body>
      <Modal.Footer>
        <button type="button" className="btn" onClick={onClose}>
          Cerrar
        </button>
      </Modal.Footer>
    </Modal>
  );
}
