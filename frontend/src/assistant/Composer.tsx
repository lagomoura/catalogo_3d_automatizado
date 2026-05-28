import { useEffect, useRef, useState } from "react";

import { useAssistant } from "./AssistantProvider";

export function Composer() {
  const { sendMessage, sending, isOpen } = useAssistant();
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  // Focus al abrir el panel
  useEffect(() => {
    if (isOpen) {
      // pequeño delay para esperar el slide-in
      const t = setTimeout(() => ref.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Auto-resize del textarea
  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "auto";
    ref.current.style.height = `${Math.min(ref.current.scrollHeight, 140)}px`;
  }, [text]);

  const handleSend = () => {
    if (!text.trim() || sending) return;
    const t = text;
    setText("");
    void sendMessage(t);
  };

  return (
    <div className="assistant-composer">
      <textarea
        ref={ref}
        className="assistant-composer__input"
        placeholder="Preguntale al gerente..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        rows={1}
        disabled={sending}
      />
      <button
        type="button"
        className="assistant-composer__send"
        onClick={handleSend}
        disabled={!text.trim() || sending}
        aria-label="Enviar"
        title="Enviar (Enter)"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M22 2L11 13" />
          <path d="M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
      </button>
    </div>
  );
}
