import { useAssistant } from "./AssistantProvider";

export function SuggestionChips() {
  const { suggestions, sendMessage, sending } = useAssistant();
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="assistant-chips" aria-label="Sugerencias">
      {suggestions.map((s) => (
        <button
          key={s}
          type="button"
          className="assistant-chip"
          disabled={sending}
          onClick={() => void sendMessage(s)}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
