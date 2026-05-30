import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
}

export default function SignupPage() {
  const { session, signup } = useAuth();
  const navigate = useNavigate();
  const [storeName, setStoreName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session) {
    navigate("/admin", { replace: true });
  }

  const effectiveSlug = slugTouched ? slug : slugify(storeName);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signup({
        store_name: storeName.trim(),
        slug: effectiveSlug,
        email: email.trim(),
        password,
      });
      navigate("/admin", { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("409")) setError("Ese slug o email ya está en uso.");
      else if (msg.includes("422")) setError("Revisá los datos: slug (3-63, minúsculas/guiones) y contraseña (8+).");
      else setError("No se pudo crear la tienda. Intentá de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-gate">
      <form className="admin-gate__form" onSubmit={handleSubmit}>
        <h2>Creá tu tienda</h2>
        <p className="admin-gate__hint">Empezá a gestionar tu negocio de impresión 3D.</p>
        <input
          className="admin-gate__input"
          placeholder="Nombre de la tienda"
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          autoFocus
        />
        <input
          className="admin-gate__input"
          placeholder="slug (tu-tienda)"
          value={effectiveSlug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(slugify(e.target.value));
          }}
        />
        <p className="admin-gate__hint">Tu vitrina: <code>{effectiveSlug || "tu-tienda"}.aura3d.com</code></p>
        <input
          type="email"
          className="admin-gate__input"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input
          type="password"
          className="admin-gate__input"
          placeholder="Contraseña (mínimo 8 caracteres)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
        {error && <p className="admin-gate__error">{error}</p>}
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? "Creando…" : "Crear tienda"}
        </button>
        <p className="admin-gate__hint">
          ¿Ya tenés cuenta? <Link to="/login">Ingresá</Link>
        </p>
        <Link to="/" className="admin-gate__back">← Volver a la vitrina</Link>
      </form>
    </div>
  );
}
