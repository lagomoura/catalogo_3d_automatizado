// Wrappers tipados sobre fetch para el asistente. Usa el MISMO JWT (Bearer) que
// el cliente API principal — el asistente es admin, así el backend resuelve el
// tenant del usuario logueado y el snapshot/tools quedan scopeados a su tienda.

import { getToken, setToken } from "../api/client";
import type {
  BriefResponse,
  ChatTurnResponse,
  ConfirmResponse,
} from "./types";

const API_BASE: string =
  (import.meta.env.VITE_API_BASE as string | undefined) ??
  "http://localhost:8000";

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...authHeaders(),
    ...((init?.headers as Record<string, string> | undefined) ?? {}),
  };
  const resp = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!resp.ok) {
    // Mismo manejo que el cliente principal: 401 → sesión caída → logout.
    if (resp.status === 401) {
      setToken(null);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("aura3d:unauthorized"));
      }
    } else if (resp.status === 402 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("aura3d:suspended"));
    }
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
