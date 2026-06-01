import type { Order } from "../../../types";
import { DeliveryCard } from "./DeliveryCard";

interface DeliveryItem {
  order: Order;
  awaitingReady: boolean;
}

interface DeliveryColumnProps {
  items: DeliveryItem[];
  onAdvance: (id: number) => void;
  onPayment: (id: number, paid: boolean) => void;
  onEditar: (order: Order) => void;
  onCostoExtra: (order: Order) => void;
  onDelete: (id: number) => void;
}

export function DeliveryColumn({
  items,
  onAdvance,
  onPayment,
  onEditar,
  onCostoExtra,
  onDelete,
}: DeliveryColumnProps) {
  return (
    <section className="pb-col" aria-label="Listos para entrega">
      <header className="pb-col__head">
        Listos para entrega <span className="pb-col__count">{items.length}</span>
      </header>
      {items.length === 0 ? (
        <p className="pb-col__empty">Nada para entregar todavía.</p>
      ) : (
        <div className="pb-col__list">
          {items.map(({ order, awaitingReady }) => (
            <DeliveryCard
              key={order.id}
              order={order}
              awaitingReady={awaitingReady}
              onAdvance={onAdvance}
              onPayment={onPayment}
              onEditar={onEditar}
              onCostoExtra={onCostoExtra}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
}
