import { useEffect, useState } from "react";
import { Modal } from "../../components/Modal";
import type {
  Contact,
  ContactCreatePayload,
  ContactDocumentKind,
  ContactUpdatePayload,
} from "../../types";

interface Props {
  open: boolean;
  contact?: Contact | null;
  onClose: () => void;
  onCreate: (payload: ContactCreatePayload) => Promise<void>;
  onUpdate: (id: number, payload: ContactUpdatePayload) => Promise<void>;
}

const DOC_KINDS: (ContactDocumentKind | null)[] = [
  null,
  "DNI",
  "CUIT",
  "OTRO",
];

const initialState = (c: Contact | null | undefined) => ({
  name: c?.name ?? "",
  email: c?.email ?? "",
  phone: c?.phone ?? "",
  document_kind: c?.document_kind ?? null,
  document_number: c?.document_number ?? "",
  address: c?.address ?? "",
  city: c?.city ?? "",
  province: c?.province ?? "",
  postal_code: c?.postal_code ?? "",
  notes: c?.notes ?? "",
});

export function ClientForm({
  open,
  contact,
  onClose,
  onCreate,
  onUpdate,
}: Props) {
  const isEdit = !!contact;
  const [form, setForm] = useState(() => initialState(contact));
  const [showAddress, setShowAddress] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(initialState(contact));
      setShowAddress(
        !!(
          contact?.address ||
          contact?.city ||
          contact?.province ||
          contact?.postal_code
        ),
      );
      setError(null);
    }
  }, [open, contact?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload: ContactCreatePayload = {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        document_kind: form.document_kind,
        document_number: form.document_number.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        province: form.province.trim() || null,
        postal_code: form.postal_code.trim() || null,
        notes: form.notes.trim() || null,
      };
      if (isEdit && contact) {
        await onUpdate(contact.id, payload);
      } else {
        await onCreate(payload);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="md" labelledBy="client-form-title">
      <form onSubmit={handleSubmit}>
        <Modal.Header onClose={onClose} id="client-form-title">
          {isEdit ? "Editar cliente" : "Nuevo cliente"}
        </Modal.Header>
        <Modal.Body>
          <div className="form-grid client-form-grid">
            <div className="client-form-grid__section">Datos de contacto</div>
            <label className="field field--full">
              Nombre <span className="client-form-grid__req">*</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                autoFocus
                placeholder="Nombre completo"
              />
            </label>
            <label className="field">
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="cliente@email.com"
              />
            </label>
            <label className="field">
              Teléfono
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+54 11 5555-1234"
              />
            </label>

            <div className="client-form-grid__section">Documento</div>
            <label className="field">
              Tipo
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
                    {k ?? "Sin especificar"}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Número
              <input
                type="text"
                value={form.document_number}
                onChange={(e) =>
                  setForm({ ...form, document_number: e.target.value })
                }
                placeholder="30111222"
              />
            </label>

            <button
              type="button"
              className="client-form-grid__toggle"
              onClick={() => setShowAddress((s) => !s)}
              aria-expanded={showAddress}
            >
              <span>Dirección</span>
              <span
                className="client-form-grid__toggle-chev"
                aria-hidden="true"
              >
                {showAddress ? "−" : "+"}
              </span>
            </button>

            {showAddress ? (
              <>
                <label className="field field--full">
                  Calle y número
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) =>
                      setForm({ ...form, address: e.target.value })
                    }
                    placeholder="Av. Siempreviva 742, Depto 3B"
                  />
                </label>
                <label className="field">
                  Ciudad
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                </label>
                <label className="field">
                  Provincia
                  <input
                    type="text"
                    value={form.province}
                    onChange={(e) =>
                      setForm({ ...form, province: e.target.value })
                    }
                  />
                </label>
                <label className="field field--full">
                  Código postal
                  <input
                    type="text"
                    value={form.postal_code}
                    onChange={(e) =>
                      setForm({ ...form, postal_code: e.target.value })
                    }
                  />
                </label>
              </>
            ) : null}

            <div className="client-form-grid__section">Notas internas</div>
            <label className="field field--full">
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Observaciones, preferencias, historial breve…"
              />
            </label>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
        </Modal.Body>
        <Modal.Footer>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting
              ? "Guardando…"
              : isEdit
                ? "Guardar"
                : "Cadastrar cliente"}
          </button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
