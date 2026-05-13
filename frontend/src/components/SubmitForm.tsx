import { useState, type FormEvent } from "react";

interface Props {
  onSubmit: (url: string, n: number, generate3d: boolean) => Promise<void> | void;
  disabled?: boolean;
}

export function SubmitForm({ onSubmit, disabled }: Props) {
  const [url, setUrl] = useState("");
  const [n, setN] = useState(4);
  const [generate3d, setGenerate3d] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = url.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
      setError("Ingresa una URL válida (http:// o https://)");
      return;
    }
    setBusy(true);
    try {
      await onSubmit(trimmed, n, generate3d);
      setUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el job");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="submit-form" onSubmit={handleSubmit}>
      <label className="field field--url">
        <span>URL del modelo (MakerWorld)</span>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://makerworld.com/en/models/..."
          required
          disabled={busy || disabled}
        />
      </label>
      <label className="field field--n">
        <span>Fotos</span>
        <input
          type="number"
          min={1}
          max={10}
          value={n}
          onChange={(e) => setN(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
          disabled={busy || disabled}
        />
      </label>
      <button type="submit" disabled={busy || disabled}>
        {busy ? "Enviando…" : "Procesar"}
      </button>
      <label className="field field--3d">
        <input
          type="checkbox"
          checked={generate3d}
          onChange={(e) => setGenerate3d(e.target.checked)}
          disabled={busy || disabled}
        />
        <span>Generar vista 3D (Trellis 2, ~1 min extra)</span>
      </label>
      {error && <p className="form-error">{error}</p>}
    </form>
  );
}
