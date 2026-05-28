import { useEffect, useRef } from "react";

import { useAssistant } from "./AssistantProvider";
import { Composer } from "./Composer";
import { MessageList } from "./MessageList";
import { SuggestionChips } from "./SuggestionChips";

export function AssistantPanel() {
  const { isOpen, close, newConversation, messages } = useAssistant();
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al fondo cuando llegan mensajes
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current;
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  }, [messages]);

  return (
    <aside
      className={`assistant-panel ${isOpen ? "assistant-panel--open" : ""}`}
      aria-hidden={!isOpen}
      aria-label="Asistente Gerente General"
    >
      <header className="assistant-panel__head">
        <div className="assistant-panel__title">
          <span className="assistant-panel__dot" />
          Gerente
        </div>
        <div className="assistant-panel__head-actions">
          <button
            type="button"
            className="assistant-panel__head-btn"
            onClick={newConversation}
            title="Nueva conversación"
            aria-label="Nueva conversación"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <button
            type="button"
            className="assistant-panel__head-btn"
            onClick={close}
            title="Cerrar"
            aria-label="Cerrar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </header>

      <div className="assistant-panel__body" ref={listRef}>
        <MessageList />
      </div>

      <div className="assistant-panel__foot">
        <SuggestionChips />
        <Composer />
      </div>
    </aside>
  );
}
