import { useAssistant } from "./AssistantProvider";

export function AssistantFAB() {
  const { isOpen, open, brief } = useAssistant();
  if (isOpen) return null;

  const alertCount =
    (brief?.snapshot_summary?.atrasados ?? 0) +
    (brief?.snapshot_summary?.stock_bajo ?? 0);

  return (
    <button
      type="button"
      className="assistant-fab"
      onClick={open}
      aria-label="Abrir Gerente General"
      title="Gerente (Ctrl + /)"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 2l2.39 4.84L20 8l-4 3.9.95 5.5L12 14.77 7.05 17.4 8 11.9 4 8l5.61-1.16z" />
      </svg>
      <span className="assistant-fab__label">Gerente</span>
      {alertCount > 0 && (
        <span className="assistant-fab__badge" aria-label={`${alertCount} alertas`}>
          {alertCount}
        </span>
      )}
    </button>
  );
}
