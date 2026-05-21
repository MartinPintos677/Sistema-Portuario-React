import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import apiConfig from "@/config/apiConfig";
import { authApi } from "@/api/services";
import { setUnauthorizedHandler } from "@/api/client";
import type { Usuario } from "@/types";

/**
 * Contrato publico del módulo de autenticación.
 *
 * Este contexto centraliza todo lo que la UI necesita saber sobre la sesiÃ³n:
 * usuario actual, token JWT, estado de carga inicial, mensajes de sesiÃ³n y
 * acciónes de login/logout. TambiÃ©n expone `hasRole` para proteger vistas y
 * acciónes segÃºn el rol recibido desde el backend.
 */
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

/**
 * Proveedor global de autenticación.
 *
 * Responsabilidades principales:
 * - Restaurar la sesiÃ³n desde localStorage al cargar la aplicaciÃ³n.
 * - Guardar tokens y usuario luego de un login exitoso.
 * - Limpiar la sesiÃ³n local al cerrar sesiÃ³n o cuando la API devuelve 401.
 * - Mantener una API simple para que el resto del frontend no conozca detalles
 *   de almacenamiento, refresh token o estructura de respuesta del backend.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  /**
   * RestauraciÃ³n inicial de sesiÃ³n.
   *
   * El frontend guarda el JWT y el usuario serializado en localStorage para que
   * el usuario no tenga que iniciar sesiÃ³n en cada refresh del navegador. Si el
   * JSON guardado esta corrupto o incompleto, se ignora y se continua como
   * usuario no autenticado.
   */
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

  /**
   * Limpia todos los datos de sesiÃ³n del cliente.
   *
   * Se usa tanto para logout manual como para expiraciÃ³n de sesiÃ³n detectada
   * por el interceptor HTTP. El mensaje opcional permite informar al usuario
   * por que fue enviado nuevamente al login.
   */
  const clearLocalSession = useCallback((message?: string) => {
    localStorage.removeItem(apiConfig.TOKEN_KEY);
    localStorage.removeItem(apiConfig.REFRESH_TOKEN_KEY);
    localStorage.removeItem(apiConfig.USER_KEY);
    localStorage.removeItem(apiConfig.EXPIRA_KEY);
    setToken(null);
    setUsuario(null);
    setSessionMessage(message ?? null);
  }, []);

  /**
   * Cierre de sesiÃ³n del usuario.
   *
   * Se intenta notificar al backend para invalidar el refresh token, pero el
   * cierre local no depende de esa llamada. Esto evita dejar al usuario atrapado
   * si la API no responde justo al momento de salir.
   */
  const logout = useCallback(() => {
    const refreshToken = localStorage.getItem(apiConfig.REFRESH_TOKEN_KEY);
    if (refreshToken) {
      void authApi.logout(refreshToken).catch(() => undefined);
    }
    clearLocalSession();
  }, [clearLocalSession]);

  /**
   * Integracion con el cliente HTTP.
   *
   * `apiClient` llama a este handler cuando una peticion autenticada recibe 401
   * y no se puede renovar el token. Desde acÃ¡ se borra la sesiÃ³n y se muestra un
   * mensaje claro en la pantalla de login.
   */
  useEffect(() => {
    setUnauthorizedHandler((reason) =>
      clearLocalSession(
        reason === "session-expired" ? "Tu sesiÃ³n expirÃ³. Inicia sesiÃ³n nuevamente." : undefined,
      ),
    );
  }, [clearLocalSession]);

  /**
   * Inicia sesiÃ³n contra la API y persiste la respuesta.
   *
   * El backend devuelve access token, refresh token, fecha de expiracion y datos
   * del usuario. El contexto guarda esa información en memoria para renderizar
   * la UI inmediatamente, y en localStorage para restaurarla al recargar.
   */
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

  /**
   * Helper de autorizacion para componentes y rutas.
   *
   * Ejemplo: `hasRole("Administrador", "Oficina")` permite mostrar acciónes
   * solo a usuarios con alguno de esos roles.
   */
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

/**
 * Hook de acceso al contexto de autenticación.
 *
 * Lanza un error explicito si se usa fuera de `AuthProvider`, lo que ayuda a
 * detectar errores de configuracion durante desarrollo.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
