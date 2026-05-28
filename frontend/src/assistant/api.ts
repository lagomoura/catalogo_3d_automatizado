// Wrappers tipados sobre fetch para el asistente. Reutiliza la base URL y
// los headers de auth del cliente API principal.

import type {
  BriefResponse,
  ChatTurnResponse,
  ConfirmResponse,
} from "./types";

const API_BASE: string =
  (import.meta.env.VITE_API_BASE as string | undefined) ??
  "http://localhost:8000";

const ADMIN_AUTH_STORAGE_KEY = "admin_basic_auth";

function adminAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = window.sessionStorage.getItem(ADMIN_AUTH_STORAGE_KEY);
  return token ? { Authorization: `Basic ${token}` } : {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...adminAuthHeaders(),
    ...((init?.headers as Record<string, string> | undefined) ?? {}),
  };
  const resp = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`${resp.status} ${resp.statusText}: ${text}`);
  }
  return resp.json() as Promise<T>;
}

export function fetchBrief(): Promise<BriefResponse> {
  return request<BriefResponse>("/api/assistant/brief");
}

export function sendChatTurn(
  message: string,
  conversationId: number | null,
): Promise<ChatTurnResponse> {
  return request<ChatTurnResponse>("/api/assistant/chat", {
    method: "POST",
    body: JSON.stringify({
      message,
      conversation_id: conversationId,
    }),
  });
}

export function sendConfirmation(
  confirmationId: string,
  confirmed: boolean,
): Promise<ConfirmResponse> {
  return request<ConfirmResponse>("/api/assistant/confirm-action", {
    method: "POST",
    body: JSON.stringify({
      confirmation_id: confirmationId,
      confirmed,
    }),
  });
}
