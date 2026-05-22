import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getPublicClientInfo,
  publicRegisterClient,
} from "../api/client";
import type {
  ContactDocumentKind,
  PublicClientInfo,
  PublicClientRegisterPayload,
} from "../types";
import "./client-register.css";

const DOC_KINDS: (ContactDocumentKind | null)[] = [
  null,
  "DNI",
  "CUIT",
  "CPF",
  "CNPJ",
  "OTRO",
];

export default function ClientRegisterPage() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<PublicClientInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [form, setForm] = useState<PublicClientRegisterPayload>({
    name: "",
    email: "",
    phone: "",
    document_kind: null,
    document_number: "",
    address: "",
    city: "",
    province: "",
    postal_code: "",
  });

  useEffect(() => {
    if (!token) return;
    getPublicClientInfo(token)
      .then((data) => {
        setInfo(data);
        if (data.contact) {
          setForm({
            name: data.contact.name,
            email: data.contact.email ?? "",
            phone: data.contact.phone ?? "",
            document_kind: data.contact.document_kind,
            document_number: data.contact.document_number ?? "",
            address: data.contact.address ?? "",
            city: data.contact.city ?? "",
            province: data.contact.province ?? "",
            postal_code: data.contact.postal_code ?? "",
          });
        }
        setError(null);
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Link inválido o expirado.",
        );
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!form.name?.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await publicRegisterClient(token, {
        name: form.name!.trim(),
        email: form.email?.trim() || null,
        phone: form.phone?.trim() || null,
        document_kind: form.document_kind,
        document_number: form.document_number?.trim() || null,
        address: form.address?.trim() || null,
        city: form.city?.trim() || null,
        province: form.province?.trim() || null,
        postal_code: form.postal_code?.trim() || null,
      });
      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al guardar los datos.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="creg">
        <p className="creg__status">Cargando…</p>
      </div>
    );
  }

  if (!info || error && !info) {
    return (
      <div className="creg">
        <div className="creg__panel">
          <h1>Link no válido</h1>
          <p>{error ?? "Pedile a tu vendedor un link nuevo."}</p>
        </div>
      </div>
    );
  }

  if (info.expired) {
    return (
      <div className="creg">
        <div className="creg__panel">
          <h1>Este link expiró</h1>
          <p>Pedile a tu vendedor que te genere uno nuevo.</p>
        </div>
      </div>
    );
  }

  if (info.consumed || done) {
    return (
      <div className="creg">
        <div className="creg__panel creg__panel--success">
          <h1>✔ Listo, recibimos tus datos</h1>
          <p>Podés cerrar esta página. Nos pondremos en contacto pronto.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="creg">
      <form className="creg__panel" onSubmit={handleSubmit}>
        <h1>Completá tus datos</h1>
        {info.order_summary ? (
          <p className="creg__order">{info.order_summary}</p>
        ) : null}
        <p className="creg__hint">
          Nos ayudás a registrar tu pedido y agilizar la entrega.
        </p>

        <div className="form-grid">
          <label className="field field--full">
            Nombre completo *
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              autoFocus
            />
          </label>
          <label className="field">
            Email
            <input
              type="email"
              value={form.email ?? ""}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label className="field">
            Teléfono / WhatsApp
            <input
              type="tel"
              value={form.phone ?? ""}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+54 11 5555-1234"
            />
          </label>
          <label className="field">
            Tipo de documento
            <select
              value={form.document_kind ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  document_kind: e.target.value
                    ? (e.target.value as ContactDocumentKind)
                    : null,
                })
              }
            >
              {DOC_KINDS.map((k) => (
                <option key={k ?? "none"} value={k ?? ""}>
                  {k ?? "Ninguno"}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            N° documento
            <input
              type="text"
              value={form.document_number ?? ""}
              onChange={(e) =>
                setForm({ ...form, document_number: e.target.value })
              }
            />
          </label>
          <label className="field field--full">
            Dirección
            <input
              type="text"
              value={form.address ?? ""}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </label>
          <label className="field">
            Ciudad
            <input
              type="text"
              value={form.city ?? ""}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </label>
          <label className="field">
            Provincia
            <input
              type="text"
              value={form.province ?? ""}
              onChange={(e) => setForm({ ...form, province: e.target.value })}
            />
          </label>
          <label className="field">
            Código postal
            <input
              type="text"
              value={form.postal_code ?? ""}
              onChange={(e) =>
                setForm({ ...form, postal_code: e.target.value })
              }
            />
          </label>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <button
          type="submit"
          className="btn-primary creg__submit"
          disabled={submitting}
        >
          {submitting ? "Enviando…" : "Enviar mis datos"}
        </button>
      </form>
    </div>
  );
}
