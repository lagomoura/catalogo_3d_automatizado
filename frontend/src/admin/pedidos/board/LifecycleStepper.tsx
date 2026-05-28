import type { OrderStatus } from "../../../types";

const STEPS: { key: OrderStatus; label: string }[] = [
  { key: "CREADO", label: "Creado" },
  { key: "EJECUTANDO", label: "Producción" },
  { key: "EJECUTADO", label: "Listo" },
  { key: "ENTREGADO", label: "Entregado" },
];

function stepState(
  step: OrderStatus,
  current: OrderStatus,
): "done" | "current" | "pending" {
  const idxStep = STEPS.findIndex((s) => s.key === step);
  const idxCurrent = STEPS.findIndex((s) => s.key === current);
  if (idxStep < idxCurrent) return "done";
  if (idxStep === idxCurrent) return "current";
  return "pending";
}

export function LifecycleStepper({ status }: { status: OrderStatus }) {
  return (
    <div className="pb-stepper" role="progressbar" aria-label="Ciclo de vida del pedido">
      {STEPS.map((s) => {
        const st = stepState(s.key, status);
        return (
          <div className="pb-stepper__step" key={s.key} data-state={st}>
            <span className="pb-stepper__dot" aria-hidden="true" />
            <span className="pb-stepper__label">{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}
