import { useMemo } from "react";
import type { Order } from "../../../types";
import { formatARS } from "../../../utils/format";

interface KpiBarProps {
  orders: Order[];
}

export function KpiBar({ orders }: KpiBarProps) {
  const kpis = useMemo(() => {
    let enProduccion = 0;
    let enCola = 0;
    let porEntregar = 0;
    let porCobrar = 0;
    for (const o of orders) {
      if (o.order_status === "EJECUTANDO") enProduccion += 1;
      else if (o.order_status === "CREADO") enCola += 1;
      else if (o.order_status === "EJECUTADO") porEntregar += 1;
      if (
        o.payment_status === "PENDIENTE" &&
        (o.order_status === "EJECUTADO" || o.order_status === "ENTREGADO")
      ) {
        porCobrar += Number(o.value ?? 0);
      }
    }
    return { enProduccion, enCola, porEntregar, porCobrar };
  }, [orders]);

  return (
    <section className="pb-kpis" aria-label="Indicadores">
      <Kpi icon="▶" label="En producción" value={kpis.enProduccion} />
      <Kpi icon="❏" label="En cola" value={kpis.enCola} />
      <Kpi icon="◎" label="Por entregar" value={kpis.porEntregar} />
      <Kpi icon="$" label="Por cobrar" value={formatARS(kpis.porCobrar)} />
    </section>
  );
}

function Kpi({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: number | string;
}) {
  return (
    <div className="pb-kpi">
      <span className="pb-kpi__label">
        <span className="pb-kpi__icon" aria-hidden="true">
          {icon}
        </span>
        {label}
      </span>
      <span className="pb-kpi__value">{value}</span>
    </div>
  );
}
