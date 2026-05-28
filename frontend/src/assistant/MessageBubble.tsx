import { useEffect, useState } from "react";

interface Props {
  role: "user" | "assistant";
  text: string;
  streaming?: boolean;
}

/**
 * Burbuja de mensaje. Para assistant + streaming=true, anima la aparición
 * del texto carácter por carácter — efecto "tipeo" sin pagar el costo
 * de streaming real del backend.
 */
export function MessageBubble({ role, text, streaming }: Props) {
  const [shown, setShown] = useState(streaming && role === "assistant" ? "" : text);

  useEffect(() => {
    if (!streaming || role !== "assistant") {
      setShown(text);
      return;
    }
    if (!text) {
      setShown("");
      return;
    }
    setShown("");
    let i = 0;
    // Velocidad adaptativa: textos cortos se revelan ~30ms/char, largos
    // aceleran a 8ms/char para no aburrir.
    const step = text.length > 200 ? 8 : text.length > 80 ? 15 : 25;
    const id = window.setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        window.clearInterval(id);
      }
    }, step);
    return () => window.clearInterval(id);
  }, [role, streaming, text]);

  const isTyping = streaming && role === "assistant" && shown.length < text.length;

  return (
    <div className={`assistant-bubble assistant-bubble--${role}`}>
      <span className="assistant-bubble__text">{shown}</span>
      {isTyping && <span className="assistant-bubble__cursor">▌</span>}
    </div>
  );
}
