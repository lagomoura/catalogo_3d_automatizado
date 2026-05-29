import type { Order, Printer, ProductionRun } from "../../../types";
import { formatARS } from "../../../utils/format";
import {
  computeRemainingSeconds,
  formatRemainingHMS,
} from "../useProductionTicker";
import { KebabMenu, type KebabItem } from "./KebabMenu";
import { LifecycleStepper } from "./LifecycleStepper";
import { PaymentPill } from "./PaymentPill";
import { ProgressRing } from "./ProgressRing";

export interface HeroOrderActions {
  onEditar: (order: Order) => void;
  onCobrar: (order: Order) => void;
  onCostoExtra: (order: Order) => void;
  onGestionarPiezas: (order: Order) => void;
  onCancelarRun: (runId: number) => void;
  onRequeueRun: (runId: number) => void;
}

interface PrinterHeroCardProps {
  printer: Printer;
  run: ProductionRun;
  order: Order | null;
  pieceIndex: number;
  pieceTotal: number;
  now: number;
  onPause: (runId: number) => void;
  onResume: (runId: number) => void;
  onFinish: (runId: number) => void;
  orderActions: HeroOrderActions;
}

function buyer(o: Order | null): string {
  return o?.contact?.name ?? o?.person_label ?? "—";
}

export function PrinterHeroCard({
  printer,
  run,
  order,
  pieceIndex,
  pieceTotal,
  now,
  onPause,
  onResume,
  onFinish,
  orderActions,
}: PrinterHeroCardProps) {
  const paused = run.status === "PAUSADA";
  const remaining = computeRemainingSeconds(run, now);
  const totalSec =
    run.estimated_minutes != null ? run.estimated_minutes * 60 : null;
  const percent =
    totalSec != null && remaining != null
      ? Math.max(0, Math.min(100, ((totalSec - remaining) / totalSec) * 100))
      : null;

  const endsAt =
    remaining != null && remaining > 0
      ? new Date(now + remaining * 1000).toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

  const value = order?.value ?? null;
  const productName =
    order?.catalog_item?.name ?? run.order?.catalog_item?.name ?? run.piece_name;
  const orderId = order?.id ?? run.order?.id ?? null;

  const kebabItems: KebabItem[] = order
    ? [
        {
          label: "🖨 Gestionar piezas",
          onClick: () => orderActions.onGestionarPiezas(order),
        },
        { label: "✎ Editar pedido", onClick: () => orderActions.onEditar(order) },
        {
          label: "$ Cobrar",
          onClick: () => orderActions.onCobrar(order),
          disabled: order.value == null,
        },
        { label: "＋ Costo extra", onClick: () => orderActions.onCostoExtra(order) },
        {
          label: "↩ Devolver a la cola",
          onClick: () => orderActions.onRequeueRun(run.id),
        },
        {
          label: "Cancelar pieza",
          danger: true,
          onClick: () => orderActions.onCancelarRun(run.id),
        },
      ]
    : [
        {
          label: "↩ Devolver a la cola",
          onClick: () => orderActions.onRequeueRun(run.id),
        },
        {
          label: "Cancelar pieza",
          danger: true,
          onClick: () => orderActions.onCancelarRun(run.id),
        },
      ];

  return (
    <article className="pb-hero pb-hero--active" data-paused={paused ? "true" : "false"}>
      <header className="pb-hero__top">
        <span className="pb-hero__badge" data-paused={paused ? "true" : "false"}>
          <i className="pb-hero__badge-dot" aria-hidden="true" />
          {paused ? "Pausado" : "Imprimiendo"}
        </span>
        <div className="pb-hero__heading">
          <span className="pb-hero__title">
            #{orderId ?? "—"} · {productName}
          </span>
          <span className="pb-hero__sub">
            👤 {buyer(order)} · pieza {pieceIndex} de {pieceTotal} · 🖨 {printer.name}
          </span>
        </div>
        <span className="pb-hero__spacer" />
        <KebabMenu items={kebabItems} />
      </header>

      <div className="pb-hero__body">
        <div className="pb-hero__ring-wrap">
          <ProgressRing percent={percent} />
        </div>

        <div className="pb-hero__times">
          {remaining != null ? (
            <>
              <div className="pb-hero__time-block">
                <span className="pb-hero__time-label">Tiempo restante</span>
                <span
                  className="pb-hero__time"
                  data-paused={paused ? "true" : "false"}
                >
                  {formatRemainingHMS(remaining)}
                </span>
              </div>
              <div className="pb-hero__time-block">
                <span className="pb-hero__time-label">Listo aprox.</span>
                <span className="pb-hero__time pb-hero__time--sm">
                  {endsAt ?? "—"}
                </span>
              </div>
            </>
          ) : (
            <div className="pb-hero__time-block">
              <span className="pb-hero__time-label">Tiempo</span>
              <span className="pb-hero__time pb-hero__time--sm" data-paused="true">
                Sin estimación
              </span>
              <span className="pb-hero__eta-hint">
                Cargá los minutos en “Gestionar piezas”.
              </span>
            </div>
          )}
        </div>
      </div>

      <LifecycleStepper status={order?.order_status ?? "EJECUTANDO"} />

      <footer className="pb-hero__footer">
        <span className="pb-hero__price">
          {value != null ? formatARS(value) : "—"}
        </span>
        {order && <PaymentPill status={order.payment_status} />}
        <span className="pb-hero__spacer" />
        {paused ? (
          <button
            type="button"
            className="tbtn tbtn--go"
            onClick={() => onResume(run.id)}
          >
            ▶ Reanudar
          </button>
        ) : (
          <button type="button" className="tbtn" onClick={() => onPause(run.id)}>
            ⏸ Pausar
          </button>
        )}
        <button type="button" className="tbtn" onClick={() => onFinish(run.id)}>
          ✓ Finalizar
        </button>
      </footer>
    </article>
  );
}
