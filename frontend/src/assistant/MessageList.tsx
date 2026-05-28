import { useAssistant } from "./AssistantProvider";
import { ActionCard } from "./ActionCard";
import { BriefingCard } from "./BriefingCard";
import { DataCards } from "./DataCards";
import { MessageBubble } from "./MessageBubble";

export function MessageList() {
  const { messages, sending, briefError } = useAssistant();

  return (
    <div className="assistant-messages">
      {briefError && (
        <div className="assistant-error">
          No pude cargar el resumen ({briefError}). El chat sigue funcionando.
        </div>
      )}

      {messages.map((m) => {
        switch (m.kind) {
          case "briefing":
            return m.briefing ? (
              <BriefingCard key={m.id} brief={m.briefing} />
            ) : null;
          case "user":
            return (
              <MessageBubble key={m.id} role="user" text={m.text ?? ""} />
            );
          case "assistant":
            return (
              <MessageBubble
                key={m.id}
                role="assistant"
                text={m.text ?? ""}
                streaming={m.streaming}
              />
            );
          case "data":
            return m.dataCards && m.dataCards.length > 0 ? (
              <DataCards key={m.id} cards={m.dataCards} />
            ) : null;
          case "action":
            return m.action ? (
              <ActionCard
                key={m.id}
                action={m.action}
                state={m.actionState ?? "pending"}
                error={m.actionResult}
              />
            ) : null;
          case "error":
            return (
              <div key={m.id} className="assistant-error">
                {m.text}
              </div>
            );
          default:
            return null;
        }
      })}

      {sending && messages[messages.length - 1]?.kind !== "assistant" && (
        <div className="assistant-typing">
          <span /> <span /> <span />
        </div>
      )}
    </div>
  );
}
