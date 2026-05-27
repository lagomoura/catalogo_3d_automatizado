import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPublicQuote, quotePdfUrl } from "../api/client";
import type { Quote } from "../types";
import { QuotePreview } from "../admin/orcamento/QuotePreview";
import "../admin/orcamento/orcamento.css";
import "./quote-public.css";

export default function QuotePublicPage() {
  const { token } = useParams<{ token: string }>();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getPublicQuote(token)
      .then(setQuote)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Link inválido."),
      )
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="qpub">
        <p>Cargando…</p>
      </div>
    );
  }
  if (error || !quote) {
    return (
      <div className="qpub">
        <div className="qpub__panel">
          <h1>Link no válido</h1>
          <p>{error ?? "Pedile al emisor un link nuevo."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="qpub">
      <div className="qpub__panel">
        <div className="qpub__actions">
          <a
            className="btn-primary"
            href={quotePdfUrl(quote.id)}
            target="_blank"
            rel="noopener"
          >
            Bajar PDF
          </a>
        </div>
        <QuotePreview
          draft={{
            number: quote.number,
            business_name: quote.business_name,
            business_slogan: quote.business_slogan,
            business_logo_url: quote.business_logo_url,
            business_email: quote.business_email,
            business_phone: quote.business_phone,
            client_name: quote.client_name,
            client_email: quote.client_email,
            client_phone: quote.client_phone,
            client_contact_id: quote.client_contact_id,
            service_description: quote.service_description,
            items: quote.items,
            valid_until: quote.valid_until,
            notes: quote.notes,
            created_at: quote.created_at,
          }}
        />
      </div>
    </div>
  );
}
