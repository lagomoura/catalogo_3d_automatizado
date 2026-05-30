import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getToken,
  login as apiLogin,
  setToken,
  signup as apiSignup,
  type AuthResponse,
  type TenantInfo,
} from "../api/client";

const SESSION_KEY = "aura3d_session";

interface Session {
  userId: number;
  email: string;
  tenant: TenantInfo;
}

interface AuthContextValue {
  session: Session | null;
  suspended: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (payload: {
    store_name: string;
    slug: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadSession(): Session | null {
  if (typeof window === "undefined") return null;
  if (!getToken()) return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

function persist(res: AuthResponse): Session {
  const session: Session = {
    userId: res.user_id,
    email: res.email,
    tenant: res.tenant,
  };
  setToken(res.token);
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [suspended, setSuspended] = useState(false);

  const logout = useCallback(() => {
    setToken(null);
    window.localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setSuspended(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    setSession(persist(res));
    setSuspended(false);
  }, []);

  const signup = useCallback<AuthContextValue["signup"]>(async (payload) => {
    const res = await apiSignup(payload);
    setSession(persist(res));
    setSuspended(false);
  }, []);

  useEffect(() => {
    const onUnauthorized = () => logout();
    const onSuspended = () => setSuspended(true);
    window.addEventListener("aura3d:unauthorized", onUnauthorized);
    window.addEventListener("aura3d:suspended", onSuspended);
    return () => {
      window.removeEventListener("aura3d:unauthorized", onUnauthorized);
      window.removeEventListener("aura3d:suspended", onSuspended);
    };
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({ session, suspended, login, signup, logout }),
    [session, suspended, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
