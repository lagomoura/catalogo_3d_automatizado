import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";
import { createManualProduct } from "../api/client";
import type { CategoryNode } from "../types";

interface Props {
  categories: CategoryNode[];
  onCreated: () => Promise<void> | void;
  disabled?: boolean;
}

function fileKey(f: File) {
  return `${f.name}-${f.size}-${f.lastModified}`;
}

export function ManualProductForm({ categories, onCreated, disabled }: Props) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );

  useEffect(
    () => () => previews.forEach((p) => URL.revokeObjectURL(p.url)),
    [previews],
  );

  const addFiles = (incoming: File[]) => {
    const imgs = incoming.filter((f) => f.type.startsWith("image/"));
    if (imgs.length === 0) return;
    setFiles((prev) => {
      const seen = new Set(prev.map(fileKey));
      return [...prev, ...imgs.filter((f) => !seen.has(fileKey(f)))];
    });
  };

  const removeFile = (key: string) => {
    setFiles((prev) => prev.filter((f) => fileKey(f) !== key));
  };

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (disabled || busy) return;
    addFiles(Array.from(e.dataTransfer.files ?? []));
  };

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

  const isBusy = busy || !!disabled;

  return (
    <form className="manual-form" onSubmit={handleSubmit}>
      <div className="manual-form__grid">
        <label className="field field--full">
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
        <label className="field">
          <span>URL del modelo (opcional)</span>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://… (si está publicado)"
            disabled={isBusy}
          />
        </label>
        <label className="field">
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
      </div>

      <label
        className={`manual-form__drop${dragActive ? " is-drag" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!isBusy) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
          disabled={isBusy}
        />
        <span className="manual-form__drop-hint">
          {files.length > 0 ? (
            <>
              {files.length} foto{files.length === 1 ? "" : "s"} seleccionada
              {files.length === 1 ? "" : "s"} ·{" "}
              <strong>agregar más</strong>
            </>
          ) : (
            <>
              Arrastrá las fotos acá o <strong>elegí archivos</strong>
            </>
          )}
        </span>
      </label>

      {previews.length > 0 && (
        <div className="manual-form__previews">
          {previews.map(({ file, url: src }) => {
            const key = fileKey(file);
            return (
              <div className="manual-form__thumb" key={key}>
                <img src={src} alt={file.name} />
                <button
                  type="button"
                  className="manual-form__thumb-del"
                  onClick={() => removeFile(key)}
                  disabled={isBusy}
                  aria-label={`Quitar ${file.name}`}
                  title="Quitar"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="manual-form__footer">
        {error && <p className="form-error">{error}</p>}
        <button type="submit" disabled={isBusy}>
          {busy ? "Subiendo…" : "Subir producto"}
        </button>
      </div>
    </form>
  );
}
