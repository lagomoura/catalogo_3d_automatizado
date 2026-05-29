import type { QuoteItem } from "../../types";
import { resolveStorageUrl } from "../../api/client";
import { AuraMark } from "../../components/Brand";

interface Props {
  /** Datos en edición — el preview los renderiza tal cual. */
  draft: {
    number: string;
    business_name: string;
    business_slogan: string | null;
    business_logo_url: string | null;
    business_email: string | null;
    business_phone: string | null;
    client_name: string;
    client_email: string | null;
    client_phone: string | null;
    client_contact_id: number | null;
    service_description: string | null;
    items: QuoteItem[];
    valid_until: string;
    notes: string | null;
    created_at: string;
  };
}

const fmtMoney = (n: number) =>
  n.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

export function QuotePreview({ draft }: Props) {
  const total = draft.items.reduce(
    (s, it) => s + it.quantity * it.unit_price,
    0,
  );
  const logoSrc = draft.business_logo_url
    ? resolveStorageUrl(draft.business_logo_url)
    : null;
  return (
    <div className="quote-preview" aria-label="Vista previa del presupuesto">
      <header className="quote-preview__head">
        <div className="quote-preview__brand">
          {logoSrc ? (
            <img
              src={logoSrc}
              alt="logo"
              className="quote-preview__logo"
            />
          ) : (
            <AuraMark size={42} />
          )}
          <div>
            <h2>{draft.business_name || "Tu Empresa"}</h2>
            {draft.business_slogan ? (
              <p className="quote-preview__slogan">{draft.business_slogan}</p>
            ) : null}
            <p className="quote-preview__contact">
              {draft.business_email}
              {draft.business_email && draft.business_phone ? " · " : ""}
              {draft.business_phone}
            </p>
          </div>
        </div>
        <div className="quote-preview__meta">
          <span className="quote-preview__badge">PRESUPUESTO</span>
          <div className="quote-preview__meta-row">
            <strong>{draft.number || "ORC-—"}</strong>
          </div>
          <div className="quote-preview__meta-row">
            Fecha: {fmtDate(draft.created_at)}
          </div>
          <div className="quote-preview__meta-row">
            Válido hasta: {fmtDate(draft.valid_until)}
          </div>
        </div>
      </header>

      <section className="quote-preview__section">
        <h3>Propuesta destinada a</h3>
        <p>
          <strong>{draft.client_name || "—"}</strong>
        </p>
        {draft.client_email || draft.client_phone ? (
          <p className="quote-preview__muted">
            {draft.client_email}
            {draft.client_email && draft.client_phone ? " · " : ""}
            {draft.client_phone}
          </p>
        ) : null}
      </section>

      {draft.service_description ? (
        <section className="quote-preview__section">
          <h3>Descripción del servicio</h3>
          <p>{draft.service_description}</p>
        </section>
      ) : null}

      <section className="quote-preview__section">
        <h3>Items y valores</h3>
        <table className="quote-preview__items">
          <thead>
            <tr>
              <th>Descripción</th>
              <th className="quote-preview__num">Qtd.</th>
              <th className="quote-preview__num">Valor unit.</th>
              <th className="quote-preview__num">Total</th>
            </tr>
          </thead>
          <tbody>
            {draft.items.length === 0 ? (
              <tr>
                <td colSpan={4} className="quote-preview__muted">
                  Agregá items para verlos acá.
                </td>
              </tr>
            ) : (
              draft.items.map((it, idx) => (
                <tr key={idx}>
                  <td>{it.description || "—"}</td>
                  <td className="quote-preview__num">{it.quantity}</td>
                  <td className="quote-preview__num">
                    {fmtMoney(it.unit_price)}
                  </td>
                  <td className="quote-preview__num">
                    {fmtMoney(it.quantity * it.unit_price)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="quote-preview__total">
          Total: <strong>{fmtMoney(total)}</strong>
        </div>
      </section>

      {draft.notes ? (
        <footer className="quote-preview__notes">{draft.notes}</footer>
      ) : null}
    </div>
  );
}

export type QuoteDraft = Props["draft"];
