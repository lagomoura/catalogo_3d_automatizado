import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "admin_ok";
// Token base64 que el cliente API inyecta como `Authorization: Basic ...` en
// las requests admin contra el backend (ver `src/api/client.ts`).
const AUTH_TOKEN_KEY = "admin_basic_auth";
const ADMIN_USERNAME = "admin";
const EXPECTED: string | undefined = import.meta.env.VITE_ADMIN_PASSWORD as string | undefined;

interface Props {
  children: ReactNode;
}

export function AdminGate({ children }: Props) {
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    if (!EXPECTED) return true;
    return window.sessionStorage.getItem(STORAGE_KEY) === "1";
  });
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (unlocked) return <>{children}</>;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!EXPECTED) {
      setUnlocked(true);
      return;
    }
    if (pwd === EXPECTED) {
      window.sessionStorage.setItem(STORAGE_KEY, "1");
      // Guardamos también el token Basic para que `client.ts` lo inyecte en
      // cada request admin contra el backend. El usuario admin del backend
      // es fijo ("admin"); el password viene de VITE_ADMIN_PASSWORD y debe
      // matchear con ADMIN_PASSWORD del backend.
      window.sessionStorage.setItem(
        AUTH_TOKEN_KEY,
        window.btoa(`${ADMIN_USERNAME}:${pwd}`),
      );
      setUnlocked(true);
      setError(null);
    } else {
      setError("Contraseña incorrecta");
    }
  };

  return (
    <div className="admin-gate">
      <form className="admin-gate__form" onSubmit={handleSubmit}>
        <h2>Acceso restringido</h2>
        <p className="admin-gate__hint">Ingresa la contraseña de administrador para continuar.</p>
        <input
          type="password"
          className="admin-gate__input"
          placeholder="Contraseña"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          autoFocus
        />
        {error && <p className="admin-gate__error">{error}</p>}
        <button type="submit" className="btn btn--primary">Entrar</button>
        <Link to="/" className="admin-gate__back">← Volver a la vitrina</Link>
      </form>
    </div>
  );
}
