import { useRef, useState, type FormEvent } from "react";
import { createManualProduct } from "../api/client";
import type { CategoryNode } from "../types";

interface Props {
  categories: CategoryNode[];
  onCreated: () => Promise<void> | void;
  disabled?: boolean;
}

export function ManualProductForm({ categories, onCreated, disabled }: Props) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Ingresa el nombre del producto");
      return;
    }
    if (files.length === 0) {
      setError("Subí al menos una foto");
      return;
    }
    const trimmedUrl = url.trim();
    if (trimmedUrl && !/^https?:\/\//i.test(trimmedUrl)) {
      setError("La URL debe empezar con http:// o https://");
      return;
    }

    setBusy(true);
    try {
      await createManualProduct({
        name: trimmedName,
        source_url: trimmedUrl || null,
        category_id: categoryId ? Number(categoryId) : null,
        images: files,
      });
      setName("");
      setUrl("");
      setCategoryId("");
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir el producto");
    } finally {
      setBusy(false);
    }
  };

  const isBusy = busy || disabled;

  return (
    <form className="submit-form" onSubmit={handleSubmit}>
      <label className="field field--url">
        <span>Nombre del producto</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Organizador de Escritorio Modular"
          required
          disabled={isBusy}
        />
      </label>
      <label className="field field--url">
        <span>URL del modelo (opcional)</span>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://… (si está publicado en otro lado)"
          disabled={isBusy}
        />
      </label>
      <label className="field field--n">
        <span>Categoría (opcional)</span>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          disabled={isBusy}
        >
          <option value="">— Sin categoría —</option>
          {categories.map((root) => (
            <optgroup key={root.id} label={root.name_es}>
              <option value={root.id}>{root.name_es}</option>
              {root.children.map((child) => (
                <option key={child.id} value={child.id}>
                  {`  ${child.name_es}`}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <label className="field field--url">
        <span>Fotos del producto</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          required
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          disabled={isBusy}
        />
      </label>
      <button type="submit" disabled={isBusy}>
        {busy ? "Subiendo…" : "Subir producto"}
      </button>
      {error && <p className="form-error">{error}</p>}
    </form>
  );
}
