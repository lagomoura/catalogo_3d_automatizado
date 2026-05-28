import type { PaymentStatus } from "../../../types";

export function PaymentPill({ status }: { status: PaymentStatus }) {
  const paid = status === "PAGADO";
  return (
    <span className="pb-pill" data-paid={paid ? "true" : "false"}>
      {paid ? "✓ Pagado" : "⊘ Pago pendiente"}
    </span>
  );
}
