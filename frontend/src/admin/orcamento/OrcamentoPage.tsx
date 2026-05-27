import { useEffect, useMemo, useState } from "react";
import {
  createQuote,
  deleteQuote,
  getBusinessProfile,
  getQuotes,
  putBusinessProfile,
  quotePdfUrl,
  resolveStorageUrl,
  updateQuote,
  uploadQuoteLogo,
} from "../../api/client";
import type {
  BusinessProfile,
  BusinessProfileWritePayload,
  Quote,
  QuoteCreatePayload,
  QuoteItem,
  QuoteUpdatePayload,
} from "../../types";
import { OnboardingModal } from "./OnboardingModal";
import { QuotePreview, type QuoteDraft } from "./QuotePreview";
import "./orcamento.css";

const todayISO = () => new Date().toISOString().slice(0, 10);
const inDays = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

const emptyDraft = (): QuoteDraft => ({
  number: "ORC-—",
  business_name: "",
  business_slogan: null,
  business_logo_url: null,
  business_email: null,
  business_phone: null,
  client_name: "",
  client_email: null,
  client_phone: null,
  client_contact_id: null,
  service_description: null,
  items: [],
  valid_until: inDays(30),
  notes: null,
  created_at: todayISO(),
});

const fromQuote = (q: Quote): QuoteDraft => ({
  number: q.number,
  business_name: q.business_name,
  business_slogan: q.business_slogan,
  business_logo_url: q.business_logo_url,
  business_email: q.business_email,
  business_phone: q.business_phone,
  client_name: q.client_name,
  client_email: q.client_email,
  client_phone: q.client_phone,
  client_contact_id: q.client_contact_id,
  service_description: q.service_description,
  items: q.items,
  valid_until: q.valid_until,
  notes: q.notes,
  created_at: q.created_at,
});

export function OrcamentoPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [editing, setEditing] = useState<Quote | null>(null);
  const [draft, setDraft] = useState<QuoteDraft>(() => emptyDraft());
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  useEffect(() => {
    void getQuotes().then(setQuotes).catch(() => {});
    void getBusinessProfile().then(setProfile).catch(() => {});
  }, []);

  const startNew = () => {
    setEditing(null);
    const base = emptyDraft();
    if (profile) {
      base.business_name = profile.business_name ?? "";
      base.business_slogan = profile.business_slogan;
      base.business_logo_url = profile.business_logo_url;
      base.business_email = profile.business_email;
      base.business_phone = profile.business_phone;
    }
    setDraft(base);
    setLogoPath(profile?.business_logo_path ?? null);
    setError(null);
  };

  useEffect(() => {
    if (!editing) startNew();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const startEdit = (q: Quote) => {
    setEditing(q);
    setDraft(fromQuote(q));
    setLogoPath(q.business_logo_path);
    setError(null);
  };

  const patch = (p: Partial<QuoteDraft>) =>
    setDraft((prev) => ({ ...prev, ...p }));

  const addItem = () =>
    patch({
      items: [...draft.items, { description: "", quantity: 1, unit_price: 0 }],
    });

  const updateItem = (idx: number, p: Partial<QuoteItem>) =>
    patch({
      items: draft.items.map((it, i) => (i === idx ? { ...it, ...p } : it)),
    });

  const removeItem = (idx: number) =>
    patch({ items: draft.items.filter((_, i) => i !== idx) });

  const handleLogoUpload = async (file: File | null) => {
    if (!file) return;
    try {
      const { path, url } = await uploadQuoteLogo(file);
      setLogoPath(path);
      patch({ business_logo_url: url });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir logo");
    }
  };

  const removeLogo = () => {
    setLogoPath(null);
    patch({ business_logo_url: null });
  };

  const handleSave = async () => {
    if (!draft.business_name.trim() || !draft.client_name.trim()) {
      setError("Empresa y cliente son obligatorios.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        const payload: QuoteUpdatePayload = {
          business_name: draft.business_name,
          business_slogan: draft.business_slogan,
          business_logo_path: logoPath,
          clear_logo: logoPath === null,
          business_email: draft.business_email,
          business_phone: draft.business_phone,
          client_name: draft.client_name,
          client_email: draft.client_email,
          client_phone: draft.client_phone,
          service_description: draft.service_description,
          items: draft.items,
          valid_until: draft.valid_until,
          notes: draft.notes,
        };
        const saved = await updateQuote(editing.id, payload);
        setQuotes((prev) =>
          prev.map((q) => (q.id === saved.id ? saved : q)),
        );
        setEditing(saved);
        setDraft(fromQuote(saved));
      } else {
        const payload: QuoteCreatePayload = {
          business_name: draft.business_name,
          business_slogan: draft.business_slogan,
          business_logo_path: logoPath,
          business_email: draft.business_email,
          business_phone: draft.business_phone,
          client_name: draft.client_name,
          client_email: draft.client_email,
          client_phone: draft.client_phone,
          service_description: draft.service_description,
          items: draft.items,
          valid_until: draft.valid_until,
          notes: draft.notes,
        };
        const saved = await createQuote(payload);
        setQuotes((prev) => [saved, ...prev]);
        setEditing(saved);
        setDraft(fromQuote(saved));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAsDefault = async () => {
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const payload: BusinessProfileWritePayload = {
        business_name: draft.business_name || null,
        business_slogan: draft.business_slogan,
        business_logo_path: logoPath,
        clear_logo: logoPath === null,
        business_email: draft.business_email,
        business_phone: draft.business_phone,
      };
      const saved = await putBusinessProfile(payload);
      setProfile(saved);
      setProfileMsg("Guardado. Se usará como default en los próximos.");
    } catch (err) {
      setProfileMsg(
        err instanceof Error ? err.message : "Error al guardar el perfil",
      );
    } finally {
      setSavingProfile(false);
      window.setTimeout(() => setProfileMsg(null), 4000);
    }
  };

  const handleDownloadPdf = () => {
    if (!editing) {
      setError("Guardá el presupuesto antes de descargar el PDF.");
      return;
    }
    window.open(quotePdfUrl(editing.id), "_blank", "noopener");
  };

  const handleCopyLink = async () => {
    if (!editing) {
      setError("Guardá el presupuesto antes de generar el link.");
      return;
    }
    const url = `${window.location.origin}/q/${editing.share_token}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {}
    setError(null);
    window.alert(`Link copiado:\n${url}`);
  };

  const handleDelete = async () => {
    if (!editing) return;
    if (!confirm(`¿Eliminar presupuesto ${editing.number}?`)) return;
    await deleteQuote(editing.id);
    setQuotes((prev) => prev.filter((q) => q.id !== editing.id));
    startNew();
  };

  const total = useMemo(
    () => draft.items.reduce((s, it) => s + it.quantity * it.unit_price, 0),
    [draft.items],
  );

  return (
    <div className="orc">
      <header className="orc__header">
        <div>
          <p className="orc__eyebrow">Comercial</p>
          <h2>Generador de Presupuestos</h2>
          <p className="orc__subtitle">
            Personalizá el branding, sumá items y exportá un PDF con
            número de presupuesto y validez 30 días.
          </p>
        </div>
        <div className="orc__head-actions">
          <button
            type="button"
            className="help-btn"
            onClick={() => setOnboardingOpen(true)}
            aria-label="Qué son los Presupuestos y cómo se conectan"
            title="¿Qué es esto?"
          >
            ?
          </button>
          <button type="button" className="btn-ghost" onClick={startNew}>
            + Nuevo
          </button>
          {editing ? (
            <>
              <button
                type="button"
                className="btn-ghost"
                onClick={handleCopyLink}
              >
                Copiar link público
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={handleDownloadPdf}
              >
                Bajar PDF
              </button>
              <button
                type="button"
                className="tbtn tbtn--danger"
                onClick={handleDelete}
              >
                Eliminar
              </button>
            </>
          ) : null}
          <button
            type="button"
            className="btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Guardando…" : editing ? "Guardar cambios" : "Guardar"}
          </button>
        </div>
      </header>

      <OnboardingModal
        open={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
      />

      {quotes.length > 0 ? (
        <div className="orc__history">
          <span className="orc__history-label">Recientes:</span>
          {quotes.slice(0, 8).map((q) => (
            <button
              key={q.id}
              type="button"
              className={`orc__chip ${
                editing?.id === q.id ? "orc__chip--active" : ""
              }`}
              onClick={() => startEdit(q)}
            >
              {q.number} · {q.client_name}
            </button>
          ))}
        </div>
      ) : null}

      {error ? <p className="error-banner">{error}</p> : null}

      <div className="orc__cols">
        <section className="orc__form">
          <h3>Tu empresa</h3>
          <div className="orc__profile-row">
            <button
              type="button"
              className="btn-ghost btn-ghost--sm"
              onClick={handleSaveAsDefault}
              disabled={savingProfile || !draft.business_name.trim()}
              title="Guarda estos datos como default para los próximos presupuestos"
            >
              {savingProfile ? "Guardando…" : "Guardar como datos por defecto"}
            </button>
            {profileMsg ? (
              <span className="orc__profile-msg">{profileMsg}</span>
            ) : null}
            {!profile && !profileMsg ? (
              <span className="orc__profile-hint">
                Llená tu marca una vez y la reusás en cada presupuesto.
              </span>
            ) : null}
          </div>
          <div className="form-grid">
            <label className="field field--full">
              Nombre de la empresa *
              <input
                type="text"
                value={draft.business_name}
                onChange={(e) => patch({ business_name: e.target.value })}
                required
              />
            </label>
            <label className="field field--full">
              Slogan / especialidad
              <input
                type="text"
                value={draft.business_slogan ?? ""}
                onChange={(e) =>
                  patch({ business_slogan: e.target.value || null })
                }
              />
            </label>
            <label className="field">
              Email
              <input
                type="email"
                value={draft.business_email ?? ""}
                onChange={(e) =>
                  patch({ business_email: e.target.value || null })
                }
              />
            </label>
            <label className="field">
              Teléfono
              <input
                type="tel"
                value={draft.business_phone ?? ""}
                onChange={(e) =>
                  patch({ business_phone: e.target.value || null })
                }
              />
            </label>
            <label className="field field--full">
              Logo
              <div className="orc__logo-row">
                {logoPath ? (
                  <img
                    src={resolveStorageUrl(`/${logoPath}`)}
                    alt="logo"
                    className="orc__logo-preview"
                  />
                ) : (
                  <span className="orc__logo-empty">Sin logo</span>
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={(e) =>
                    handleLogoUpload(e.target.files?.[0] ?? null)
                  }
                />
                {logoPath ? (
                  <button
                    type="button"
                    className="btn--inline"
                    onClick={removeLogo}
                  >
                    Quitar
                  </button>
                ) : null}
              </div>
            </label>
          </div>

          <h3>Cliente</h3>
          <div className="form-grid">
            <label className="field field--full">
              Nombre *
              <input
                type="text"
                value={draft.client_name}
                onChange={(e) => patch({ client_name: e.target.value })}
                required
              />
            </label>
            <label className="field">
              Email
              <input
                type="email"
                value={draft.client_email ?? ""}
                onChange={(e) =>
                  patch({ client_email: e.target.value || null })
                }
              />
            </label>
            <label className="field">
              Teléfono
              <input
                type="tel"
                value={draft.client_phone ?? ""}
                onChange={(e) =>
                  patch({ client_phone: e.target.value || null })
                }
              />
            </label>
            <label className="field field--full">
              Descripción del servicio
              <textarea
                rows={3}
                value={draft.service_description ?? ""}
                onChange={(e) =>
                  patch({ service_description: e.target.value || null })
                }
              />
            </label>
          </div>

          <h3>Items</h3>
          <div className="orc__items">
            {draft.items.length === 0 ? (
              <p className="form-hint">
                Sumá al menos un item — descripción + cantidad + valor unitario.
              </p>
            ) : null}
            {draft.items.map((it, idx) => (
              <div className="orc__item" key={idx}>
                <input
                  type="text"
                  placeholder="Descripción"
                  value={it.description}
                  onChange={(e) =>
                    updateItem(idx, { description: e.target.value })
                  }
                />
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="Qtd"
                  value={it.quantity || ""}
                  onChange={(e) =>
                    updateItem(idx, { quantity: Number(e.target.value) || 0 })
                  }
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Valor unit."
                  value={it.unit_price || ""}
                  onChange={(e) =>
                    updateItem(idx, { unit_price: Number(e.target.value) || 0 })
                  }
                />
                <button
                  type="button"
                  className="tbtn tbtn--danger"
                  onClick={() => removeItem(idx)}
                  aria-label="Quitar"
                >
                  ✕
                </button>
              </div>
            ))}
            <button type="button" className="btn-ghost" onClick={addItem}>
              + Sumar item
            </button>
          </div>

          <h3>Detalles</h3>
          <div className="form-grid">
            <label className="field">
              Válido hasta
              <input
                type="date"
                value={draft.valid_until}
                onChange={(e) => patch({ valid_until: e.target.value })}
              />
            </label>
            <label className="field field--full">
              Notas (opcional)
              <textarea
                rows={2}
                value={draft.notes ?? ""}
                onChange={(e) => patch({ notes: e.target.value || null })}
              />
            </label>
          </div>

          <div className="orc__total-row">
            Total: <strong>${total.toLocaleString("es-AR")}</strong>
          </div>
        </section>

        <aside className="orc__preview">
          <h3>Pre-vista</h3>
          <QuotePreview draft={draft} />
        </aside>
      </div>
    </div>
  );
}
