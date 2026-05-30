import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

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
  if (!session) return null;

  const status = session.tenant.subscription_status;
  const isWarn = suspended || status === "suspended";

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="account-menu">
      <div className="account-menu__info">
        <span className="account-menu__store" title={session.email}>
          {session.tenant.name}
        </span>
        <span
          className={`account-menu__badge account-menu__badge--${isWarn ? "suspended" : status}`}
        >
          {STATUS_LABEL[status] ?? status}
        </span>
      </div>
      <button
        type="button"
        className="app__nav-link account-menu__logout"
        onClick={handleLogout}
      >
        Salir
      </button>
    </div>
  );
}
