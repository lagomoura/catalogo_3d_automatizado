import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { fetchBrief, sendChatTurn, sendConfirmation } from "./api";
import type { BriefResponse, LocalMessage } from "./types";
import { AssistantFAB } from "./AssistantFAB";
import { AssistantPanel } from "./AssistantPanel";

const CONVERSATION_KEY = "assistant_conversation_id";

function genId(): string {
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

interface AssistantState {
  isOpen: boolean;
  conversationId: number | null;
  messages: LocalMessage[];
  sending: boolean;
  suggestions: string[];
  brief: BriefResponse | null;
  briefError: string | null;
}

interface AssistantContextValue extends AssistantState {
  open: () => void;
  close: () => void;
  toggle: () => void;
  sendMessage: (text: string) => Promise<void>;
  confirmAction: (confirmationId: string, confirmed: boolean) => Promise<void>;
  newConversation: () => void;
}

const Ctx = createContext<AssistantContextValue | null>(null);

export function useAssistant(): AssistantContextValue {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error("useAssistant must be used inside <AssistantProvider>");
  }
  return v;
}

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(CONVERSATION_KEY);
    return raw ? Number(raw) || null : null;
  });
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [brief, setBrief] = useState<BriefResponse | null>(null);
  const [briefError, setBriefError] = useState<string | null>(null);

  // El briefing se carga la primera vez que se abre el panel.
  const briefLoadedRef = useRef(false);

  const persistConv = useCallback((id: number | null) => {
    if (typeof window === "undefined") return;
    if (id == null) {
      window.localStorage.removeItem(CONVERSATION_KEY);
    } else {
      window.localStorage.setItem(CONVERSATION_KEY, String(id));
    }
  }, []);

  const loadBrief = useCallback(async () => {
    try {
      const b = await fetchBrief();
      setBrief(b);
      setBriefError(null);
      setSuggestions(b.suggestions);
      // Insertar BriefingCard al inicio si no existe aún
      setMessages((prev) => {
        if (prev.some((m) => m.kind === "briefing")) return prev;
        return [{ id: genId(), kind: "briefing", briefing: b }, ...prev];
      });
    } catch (e) {
      setBriefError((e as Error).message);
    }
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
    if (!briefLoadedRef.current) {
      briefLoadedRef.current = true;
      void loadBrief();
    }
  }, [loadBrief]);

  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => {
    setIsOpen((p) => {
      const next = !p;
      if (next && !briefLoadedRef.current) {
        briefLoadedRef.current = true;
        void loadBrief();
      }
      return next;
    });
  }, [loadBrief]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;

      const userMsg: LocalMessage = {
        id: genId(),
        kind: "user",
        text: trimmed,
      };
      const placeholderId = genId();
      setMessages((prev) => [
        ...prev,
        userMsg,
        {
          id: placeholderId,
          kind: "assistant",
          text: "",
          streaming: true,
        },
      ]);
      setSending(true);
      setSuggestions([]);

      try {
        const resp = await sendChatTurn(trimmed, conversationId);
        if (resp.conversation_id !== conversationId) {
          setConversationId(resp.conversation_id);
          persistConv(resp.conversation_id);
        }
        setMessages((prev) => {
          const out: LocalMessage[] = [];
          for (const m of prev) {
            if (m.id !== placeholderId) {
              out.push(m);
              continue;
            }
            // Reemplazo el placeholder con el texto real + data cards + action
            if (resp.assistant_text) {
              out.push({
                id: m.id,
                kind: "assistant",
                text: resp.assistant_text,
                streaming: true,
              });
            }
            if (resp.data_cards && resp.data_cards.length > 0) {
              out.push({
                id: genId(),
                kind: "data",
                dataCards: resp.data_cards,
              });
            }
            if (resp.pending_action) {
              out.push({
                id: genId(),
                kind: "action",
                action: resp.pending_action,
                actionState: "pending",
              });
            }
          }
          return out;
        });
        setSuggestions(resp.suggestions ?? []);
      } catch (e) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === placeholderId
              ? {
                  id: m.id,
                  kind: "error",
                  text: `No pude conectar con el asistente. ${
                    (e as Error).message
                  }`,
                }
              : m,
          ),
        );
      } finally {
        setSending(false);
      }
    },
    [conversationId, persistConv, sending],
  );

  const confirmAction = useCallback(
    async (confirmationId: string, confirmed: boolean) => {
      // Marca el action como "confirming"
      setMessages((prev) =>
        prev.map((m) =>
          m.kind === "action" && m.action?.confirmation_id === confirmationId
            ? { ...m, actionState: "confirming" }
            : m,
        ),
      );
      try {
        const resp = await sendConfirmation(confirmationId, confirmed);
        setMessages((prev) => {
          const updated = prev.map((m) =>
            m.kind === "action" &&
            m.action?.confirmation_id === confirmationId
              ? ({
                  ...m,
                  actionState: resp.expired
                    ? "canceled"
                    : confirmed
                      ? "done"
                      : "canceled",
                  actionResult: resp.result?.error as string | undefined,
                } satisfies LocalMessage)
              : m,
          );
          if (resp.assistant_text) {
            updated.push({
              id: genId(),
              kind: "assistant",
              text: resp.assistant_text,
              streaming: true,
            });
          }
          return updated;
        });
      } catch (e) {
        setMessages((prev) =>
          prev.map((m) =>
            m.kind === "action" &&
            m.action?.confirmation_id === confirmationId
              ? { ...m, actionState: "pending" as const }
              : m,
          ).concat({
            id: genId(),
            kind: "error",
            text: `No pude ejecutar la acción: ${(e as Error).message}`,
          }),
        );
      }
    },
    [],
  );

  const newConversation = useCallback(() => {
    setConversationId(null);
    persistConv(null);
    setMessages([]);
    setSuggestions([]);
    briefLoadedRef.current = false;
    // recargo el briefing
    if (isOpen) {
      briefLoadedRef.current = true;
      void loadBrief();
    }
  }, [isOpen, loadBrief, persistConv]);

  // Atajo de teclado Ctrl+/ ó Cmd+/
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isShortcut =
        (e.ctrlKey || e.metaKey) && (e.key === "/" || e.key === ".");
      if (isShortcut) {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  const value = useMemo<AssistantContextValue>(
    () => ({
      isOpen,
      conversationId,
      messages,
      sending,
      suggestions,
      brief,
      briefError,
      open,
      close,
      toggle,
      sendMessage,
      confirmAction,
      newConversation,
    }),
    [
      brief,
      briefError,
      close,
      confirmAction,
      conversationId,
      isOpen,
      messages,
      newConversation,
      open,
      sendMessage,
      sending,
      suggestions,
      toggle,
    ],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <AssistantFAB />
      <AssistantPanel />
    </Ctx.Provider>
  );
}
