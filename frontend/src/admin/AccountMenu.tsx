import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { AccountModal } from "./AccountModal";

const STATUS_LABEL: Record<string, string> = {
  trialing: "Prueba",
  active: "Activa",
  suspended: "Suspendida",
};

/** Chip de cuenta en el header admin: nombre de tienda, estado de suscripción
 * y logout. La integración del cobro real es una fase posterior; por ahora el
 * estado es un flag (trialing/active/suspended). */
export function AccountMenu() {
  const { session, suspended, logout } = useAuth();
  const navigate = useNavigate();
  const [accountOpen, setAccountOpen] = useState(false);
  if (!session) return null;

  const status = session.tenant.subscription_status;
  const isWarn = suspended || status === "suspended";

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="account-menu">
      <button
        type="button"
        className="account-menu__info account-menu__trigger"
        onClick={() => setAccountOpen(true)}
        title="Cuenta y suscripción"
      >
        <span className="account-menu__store">{session.tenant.name}</span>
        <span
          className={`account-menu__badge account-menu__badge--${isWarn ? "suspended" : status}`}
        >
          {STATUS_LABEL[status] ?? status}
        </span>
      </button>
      <button
        type="button"
        className="app__nav-link account-menu__logout"
        onClick={handleLogout}
      >
        Salir
      </button>
      <AccountModal open={accountOpen} onClose={() => setAccountOpen(false)} />
    </div>
  );
}
