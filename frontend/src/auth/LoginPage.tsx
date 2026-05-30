import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export default function LoginPage() {
  const { session, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session) {
    navigate("/admin", { replace: true });
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      navigate("/admin", { replace: true });
    } catch {
      setError("Email o contraseña incorrectos.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-gate">
      <form className="admin-gate__form" onSubmit={handleSubmit}>
        <h2>Ingresar</h2>
        <p className="admin-gate__hint">Accedé a tu tienda Aura3D.</p>
        <input
          type="email"
          className="admin-gate__input"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
          autoComplete="email"
        />
        <input
          type="password"
          className="admin-gate__input"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        {error && <p className="admin-gate__error">{error}</p>}
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? "Ingresando…" : "Ingresar"}
        </button>
        <p className="admin-gate__hint">
          ¿No tenés cuenta? <Link to="/signup">Creá tu tienda</Link>
        </p>
        <Link to="/" className="admin-gate__back">← Volver a la vitrina</Link>
      </form>
    </div>
  );
}
