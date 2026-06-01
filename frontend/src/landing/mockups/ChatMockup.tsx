import { BrowserMockup } from "./BrowserMockup";

/** Conversación simulada con el Gerente Bot dentro del back-office. */
export function ChatMockup() {
  return (
    <BrowserMockup url="aura3d.com/admin · Gerente Bot">
      <div className="mock-chat">
        <div className="mock-chat__bubble mock-chat__bubble--user">
          ¿Cuánto vendí esta semana?
        </div>
        <div className="mock-chat__bubble mock-chat__bubble--bot">
          Vendiste <strong>$182.400</strong> en 14 pedidos. 3 siguen en
          producción.
        </div>
        <div className="mock-chat__bubble mock-chat__bubble--user">
          ¿Qué filamento me falta?
        </div>
        <div className="mock-chat__bubble mock-chat__bubble--bot">
          Te queda poco <strong>PLA negro</strong> (≈ 180 g). El resto está ok.
        </div>
        <div className="mock-chat__typing" aria-hidden="true">
          <i></i>
          <i></i>
          <i></i>
        </div>
      </div>
    </BrowserMockup>
  );
}
