import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import apiConfig from "@/config/apiConfig";
import { authApi } from "@/api/services";
import { setUnauthorizedHandler } from "@/api/client";
import type { Usuario } from "@/types";

interface AuthState {
  usuario: Usuario | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  sessionMessage: string | null;
  login: (correo: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const t = localStorage.getItem(apiConfig.TOKEN_KEY);
      const u = localStorage.getItem(apiConfig.USER_KEY);
      if (t && u) {
        setToken(t);
        setUsuario(JSON.parse(u));
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  const clearLocalSession = useCallback((message?: string) => {
    localStorage.removeItem(apiConfig.TOKEN_KEY);
    localStorage.removeItem(apiConfig.REFRESH_TOKEN_KEY);
    localStorage.removeItem(apiConfig.USER_KEY);
    localStorage.removeItem(apiConfig.EXPIRA_KEY);
    setToken(null);
    setUsuario(null);
    setSessionMessage(message ?? null);
  }, []);

  const logout = useCallback(() => {
    const refreshToken = localStorage.getItem(apiConfig.REFRESH_TOKEN_KEY);
    if (refreshToken) {
      void authApi.logout(refreshToken).catch(() => undefined);
    }
    clearLocalSession();
  }, [clearLocalSession]);

  useEffect(() => {
    setUnauthorizedHandler((reason) =>
      clearLocalSession(
        reason === "session-expired" ? "Tu sesion expiro. Inicia sesion nuevamente." : undefined,
      ),
    );
  }, [clearLocalSession]);

  const login = useCallback(async (correo: string, password: string) => {
    const res = await authApi.login(correo, password);
    localStorage.setItem(apiConfig.TOKEN_KEY, res.token);
    localStorage.setItem(apiConfig.REFRESH_TOKEN_KEY, res.refreshToken);
    localStorage.setItem(apiConfig.USER_KEY, JSON.stringify(res.usuario));
    localStorage.setItem(apiConfig.EXPIRA_KEY, res.expira);
    setToken(res.token);
    setUsuario(res.usuario);
    setSessionMessage(null);
  }, []);

  const hasRole = useCallback(
    (...roles: string[]) => !!usuario && roles.includes(usuario.rol),
    [usuario],
  );

  const value = useMemo<AuthState>(
    () => ({
      usuario,
      token,
      isAuthenticated: !!token && !!usuario,
      loading,
      sessionMessage,
      login,
      logout,
      hasRole,
    }),
    [usuario, token, loading, sessionMessage, login, logout, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
