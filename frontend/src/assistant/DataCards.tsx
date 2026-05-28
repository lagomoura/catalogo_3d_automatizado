import type { DataCard } from "./types";

interface Props {
  cards: DataCard[];
}

/**
 * Renderiza tarjetas inline para resultados de tools de lectura. Cada tool
 * tiene un formato propio — si no reconocemos la tool, mostramos un JSON
 * compacto como fallback.
 */
export function DataCards({ cards }: Props) {
  return (
    <div className="assistant-data">
      {cards.map((c, idx) => (
        <DataCardItem key={`${c.tool}-${idx}`} card={c} />
      ))}
    </div>
  );
}

function formatMoney(n: unknown): string {
  if (typeof n !== "number") return String(n);
  return `$${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

function fmtDate(iso: unknown): string {
  if (typeof iso !== "string") return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}`;
}

interface RowsCard {
  title: string;
  empty: string;
  rows: { primary: string; secondary?: string; trailing?: string }[];
}

function buildRows(c: DataCard): RowsCard | null {
  const r = c.result as Record<string, unknown>;

  if (c.tool === "list_orders") {
    const pedidos = (r.pedidos as Record<string, unknown>[]) ?? [];
    return {
      title: `Pedidos (${r.total ?? pedidos.length})`,
      empty: "Sin pedidos con esos filtros.",
      rows: pedidos.slice(0, 6).map((p) => ({
        primary: `#${p.id} · ${p.producto ?? "(?)"}`,
        secondary: `${p.cliente ?? "—"} · ${p.estado} · ${p.pago}`,
        trailing: p.vence
          ? `vence ${fmtDate(p.vence)}`
          : p.valor
            ? formatMoney(p.valor)
            : undefined,
      })),
    };
  }

  if (c.tool === "list_materials") {
    const mats = (r.materiales as Record<string, unknown>[]) ?? [];
    return {
      title: `Materiales (${r.total ?? mats.length})`,
      empty: "Sin materiales.",
      rows: mats.slice(0, 8).map((m) => ({
        primary: `${m.nombre} · ${m.tipo}${m.color ? ` ${m.color}` : ""}`,
        secondary: m.bajo_stock ? "⚠ stock bajo" : undefined,
        trailing: `${m.stock} ${m.unidad}`,
      })),
    };
  }

  if (c.tool === "list_contacts") {
    const cs = (r.clientes as Record<string, unknown>[]) ?? [];
    return {
      title: `Clientes (${r.total ?? cs.length})`,
      empty: "Sin clientes.",
      rows: cs.slice(0, 8).map((cc) => ({
        primary: String(cc.nombre),
        secondary: cc.telefono ? String(cc.telefono) : (cc.email as string),
        trailing:
          typeof cc.deuda === "number" && cc.deuda > 0
            ? `debe ${formatMoney(cc.deuda)}`
            : undefined,
      })),
    };
  }

  if (c.tool === "search_catalog") {
    const items = (r.productos as Record<string, unknown>[]) ?? [];
    return {
      title: `Productos (${r.total ?? items.length})`,
      empty: "Sin resultados.",
      rows: items.slice(0, 8).map((p) => ({
        primary: String(p.nombre),
        secondary: p.categoria ? String(p.categoria) : undefined,
        trailing: `#${p.id}`,
      })),
    };
  }

  if (c.tool === "list_printers") {
    const ps = (r.impresoras as Record<string, unknown>[]) ?? [];
    return {
      title: `Impresoras (${r.total ?? ps.length})`,
      empty: "Sin impresoras.",
      rows: ps.map((p) => ({
        primary: String(p.nombre),
        secondary: `${p.marca ?? ""} ${p.modelo ?? ""}`.trim() || undefined,
        trailing: p.ocupada ? "ocupada" : "libre",
      })),
    };
  }

  if (c.tool === "get_cash_summary") {
    return {
      title: `Caja ${r.periodo}`,
      empty: "Sin movimientos.",
      rows: [
        {
          primary: "Ingresos",
          trailing: formatMoney(r.ingresos),
        },
        {
          primary: "Egresos",
          trailing: formatMoney(r.egresos),
        },
        {
          primary: "Neto",
          trailing: formatMoney(r.neto),
        },
      ],
    };
  }

  if (c.tool === "get_order_detail") {
    return {
      title: `Pedido #${r.id}`,
      empty: "—",
      rows: [
        { primary: "Producto", trailing: String(r.producto ?? "—") },
        { primary: "Cliente", trailing: String(r.cliente ?? "—") },
        { primary: "Estado", trailing: `${r.estado} · ${r.pago}` },
        ...(r.valor
          ? [{ primary: "Valor", trailing: formatMoney(r.valor) }]
          : []),
        ...(r.vence
          ? [{ primary: "Vence", trailing: fmtDate(r.vence) }]
          : []),
      ],
    };
  }

  return null;
}

function DataCardItem({ card }: { card: DataCard }) {
  const built = buildRows(card);
  if (!built) return null;
  if (built.rows.length === 0) {
    return (
      <div className="assistant-data__card">
        <div className="assistant-data__title">{built.title}</div>
        <div className="assistant-data__empty">{built.empty}</div>
      </div>
    );
  }
  return (
    <div className="assistant-data__card">
      <div className="assistant-data__title">{built.title}</div>
      <ul className="assistant-data__rows">
        {built.rows.map((r, i) => (
          <li key={i} className="assistant-data__row">
            <div className="assistant-data__row-main">
              <span className="assistant-data__row-primary">{r.primary}</span>
              {r.secondary && (
                <span className="assistant-data__row-secondary">
                  {r.secondary}
                </span>
              )}
            </div>
            {r.trailing && (
              <span className="assistant-data__row-trailing">{r.trailing}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
