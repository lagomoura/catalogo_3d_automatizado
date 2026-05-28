import type { Order, ProductionRun } from "../../../types";
import { DeliveryColumn } from "./DeliveryColumn";
import { QueueColumn } from "./QueueColumn";

interface DeliveryItem {
  order: Order;
  awaitingReady: boolean;
}

interface BoardColumnsProps {
  queueOrders: Order[];
  runsByOrder: Map<number, ProductionRun[]>;
  allRuns: ProductionRun[];
  canStartByOrder: Map<number, boolean>;
  deliveryItems: DeliveryItem[];
  now: number;
  onReorder: (orderedOrderIds: number[]) => void;
  onStartOrder: (orderId: number) => void;
  onGestionarPiezas: (order: Order) => void;
  onAdvance: (id: number) => void;
  onPayment: (id: number, paid: boolean) => void;
  onEditar: (order: Order) => void;
  onCostoExtra: (order: Order) => void;
  onDelete: (orderId: number) => void;
}

export function BoardColumns({
  queueOrders,
  runsByOrder,
  allRuns,
  canStartByOrder,
  deliveryItems,
  now,
  onReorder,
  onStartOrder,
  onGestionarPiezas,
  onAdvance,
  onPayment,
  onEditar,
  onCostoExtra,
  onDelete,
}: BoardColumnsProps) {
  return (
    <div className="pb-columns">
      <QueueColumn
        queueOrders={queueOrders}
        runsByOrder={runsByOrder}
        allRuns={allRuns}
        canStartByOrder={canStartByOrder}
        now={now}
        onReorder={onReorder}
        onStart={onStartOrder}
        onGestionarPiezas={onGestionarPiezas}
        onEditar={onEditar}
        onCostoExtra={onCostoExtra}
        onDelete={onDelete}
      />
      <DeliveryColumn
        items={deliveryItems}
        onAdvance={onAdvance}
        onPayment={onPayment}
        onEditar={onEditar}
        onCostoExtra={onCostoExtra}
      />
    </div>
  );
}
