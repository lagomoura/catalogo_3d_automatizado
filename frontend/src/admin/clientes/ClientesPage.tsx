import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createContact,
  getContacts,
  updateContact,
} from "../../api/client";
import type {
  Contact,
  ContactCreatePayload,
  ContactUpdatePayload,
} from "../../types";
import { ClientForm } from "./ClientForm";
import { OnboardingModal } from "./OnboardingModal";
import "./clientes.css";

export function ClientesPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getContacts();
      setContacts(list);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar clientes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) =>
      [
        c.name,
        c.email,
        c.phone,
        c.document_number,
        c.city,
        c.province,
      ]
        .filter(Boolean)
        .some((s) => s!.toLowerCase().includes(q)),
    );
  }, [contacts, query]);

  const handleCreate = async (payload: ContactCreatePayload) => {
    const created = await createContact(payload);
    setContacts((prev) => {
      const exists = prev.some((c) => c.id === created.id);
      return exists
        ? prev.map((c) => (c.id === created.id ? created : c))
        : [...prev, created];
    });
  };

  const handleUpdate = async (id: number, payload: ContactUpdatePayload) => {
    const updated = await updateContact(id, payload);
    setContacts((prev) => prev.map((c) => (c.id === id ? updated : c)));
  };

  return (
    <div className="clientes">
      <header className="clientes__header">
        <div>
          <p className="clientes__eyebrow">Panel</p>
          <h2>Clientes</h2>
          <p className="clientes__subtitle">
            Registrá clientes y su historial de pedidos por persona.
          </p>
        </div>
        <div className="clientes__head-actions">
          <button
            type="button"
            className="clientes__help"
            onClick={() => setOnboardingOpen(true)}
            aria-label="Qué es Clientes y cómo se conecta"
            title="¿Qué es esto?"
          >
            ?
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            + Adicionar cliente
          </button>
        </div>
      </header>

      <div className="clientes__toolbar">
        <input
          className="clientes__search"
          type="search"
          placeholder="Buscar nombre, email, teléfono, documento, ciudad…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="clientes__count">
          {filtered.length} {filtered.length === 1 ? "cliente" : "clientes"}
        </span>
      </div>

      {error ? <p className="error-banner">{error}</p> : null}

      <div className="clientes__table" role="table">
        <div className="clientes__row clientes__row--head" role="row">
          <span>Nombre</span>
          <span>Email</span>
          <span>Teléfono</span>
          <span>Documento</span>
          <span>Ciudad</span>
          <span>Acciones</span>
        </div>

        {loading ? (
          <div className="clientes__empty">Cargando…</div>
        ) : filtered.length === 0 ? (
          <div className="clientes__empty">
            {contacts.length === 0
              ? "No hay clientes todavía. Tocá “+ Adicionar cliente”."
              : "Ninguno coincide con la búsqueda."}
          </div>
        ) : (
          filtered.map((c) => (
            <div key={c.id} className="clientes__row" role="row">
              <span>
                <strong>{c.name}</strong>
                {c.notes ? (
                  <span className="clientes__row-sub">{c.notes}</span>
                ) : null}
              </span>
              <span>{c.email ?? "—"}</span>
              <span>{c.phone ?? "—"}</span>
              <span>
                {c.document_kind && c.document_number
                  ? `${c.document_kind} ${c.document_number}`
                  : "—"}
              </span>
              <span>{c.city ?? "—"}</span>
              <span className="clientes__actions">
                <button
                  type="button"
                  className="tbtn tbtn--edit"
                  onClick={() => {
                    setEditing(c);
                    setFormOpen(true);
                  }}
                >
                  Editar
                </button>
              </span>
            </div>
          ))
        )}
      </div>

      <OnboardingModal
        open={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
      />
      <ClientForm
        open={formOpen}
        contact={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
