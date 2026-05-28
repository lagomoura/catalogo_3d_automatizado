// Tipos del asistente Gerente General — espejo del backend en routes/assistant.py

export interface PreviewField {
  label: string;
  value: string;
}

export interface ActionPreview {
  titulo: string;
  campos: PreviewField[];
}

export interface PendingAction {
  confirmation_id: string;
  tool: string;
  args: Record<string, unknown>;
  preview: ActionPreview;
}

export interface DataCard {
  tool: string;
  args: Record<string, unknown>;
  result: Record<string, unknown>;
}

export interface ChatTurnResponse {
  conversation_id: number;
  assistant_text: string;
  pending_action: PendingAction | null;
  data_cards: DataCard[];
  suggestions: string[];
}

export interface ConfirmResponse {
  confirmed?: boolean;
  result?: Record<string, unknown>;
  assistant_text?: string;
  conversation_id?: number;
  expired?: boolean;
  error?: string;
}

export interface BriefResponse {
  greeting: string;
  highlights: string[];
  suggestions: string[];
  snapshot_summary: {
    pedidos_activos: number;
    atrasados: number;
    pendiente_cobro: number;
    stock_bajo: number;
    neto_30d: number;
  };
}

// Mensajes en memoria del Provider. No espejan 1:1 los del backend porque
// los renderizamos con timeline visual (briefing → user → assistant + cards).
export type LocalMessageKind =
  | "briefing"
  | "user"
  | "assistant"
  | "action"
  | "data"
  | "error";

export interface LocalMessage {
  id: string; // uuid local
  kind: LocalMessageKind;
  text?: string;
  briefing?: BriefResponse;
  action?: PendingAction;
  actionState?: "pending" | "confirming" | "done" | "canceled";
  actionResult?: string;
  dataCards?: DataCard[];
  // si kind=assistant y streaming=true, el frontend anima la aparición
  streaming?: boolean;
}
