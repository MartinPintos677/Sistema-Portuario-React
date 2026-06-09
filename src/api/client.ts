import axios, { AxiosError } from "axios";
import apiConfig from "@/config/apiConfig";
import type { LoginResponse, ProblemDetails } from "@/types";

/**
 * Cliente HTTP centralizado.
 *
 * Toda llamada a la API pasa por esta instancia para compartir base URL,
 * headers, token JWT, refresh token y normalizacion de errores.
 */
export const apiClient = axios.create({
  baseURL: apiConfig.BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 65000,
});

type RetriableRequest = NonNullable<AxiosError<ProblemDetails>["config"]> & {
  _retry?: boolean;
  _transientRetryCount?: number;
};

const TRANSIENT_RETRY_DELAYS_MS = [1500, 4000, 8000];

function delay(ms: number) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    // Se lee en cada request para respetar cambios de login, refresh o logout.
    const token = localStorage.getItem(apiConfig.TOKEN_KEY);
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

let onUnauthorized: ((reason?: string) => void) | null = null;

/**
 * Conecta los 401 definitivos con AuthContext sin acoplar este archivo a React.
 */
export const setUnauthorizedHandler = (fn: (reason?: string) => void) => {
  onUnauthorized = fn;
};

let refreshing: Promise<string | null> | null = null;

// Los endpoints de auth no deben disparar refresh ni retry automático.
function isAuthEndpoint(url?: string) {
  return Boolean(
    url?.includes("/Auth/login") ||
    url?.includes("/Auth/primer-administrador") ||
    url?.includes("/Auth/refresh"),
  );
}

function isLoginEndpoint(url?: string) {
  return Boolean(url?.includes("/Auth/login"));
}

function isSafeRetryMethod(method?: string) {
  return ["get", "head", "options"].includes((method ?? "get").toLowerCase());
}

function isTransientStatus(status?: number) {
  return status === 408 || status === 425 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function isTransientApiError(error: AxiosError<ProblemDetails>) {
  return error.message === "Network Error" || error.code === "ERR_NETWORK" || error.code === "ECONNABORTED" || isTransientStatus(error.response?.status);
}

function canRetryTransientRequest(error: AxiosError<ProblemDetails>, request?: RetriableRequest) {
  if (!request || !isTransientApiError(error)) return false;
  return isSafeRetryMethod(request.method) || isLoginEndpoint(request.url);
}

/**
 * Renueva el access token con el refresh token local.
 * La promesa compartida evita múltiples renovacíones simultáneas.
 */
async function refreshAccessToken() {
  if (typeof window === "undefined") return null;
  const refreshToken = localStorage.getItem(apiConfig.REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  refreshing ??= axios
    .post<LoginResponse>(`${apiConfig.BASE_URL}/Auth/refresh`, { refreshToken })
    .then((response) => {
      const data = response.data;
      localStorage.setItem(apiConfig.TOKEN_KEY, data.token);
      localStorage.setItem(apiConfig.REFRESH_TOKEN_KEY, data.refreshToken);
      localStorage.setItem(apiConfig.USER_KEY, JSON.stringify(data.usuario));
      localStorage.setItem(apiConfig.EXPIRA_KEY, data.expira);
      return data.token;
    })
    .catch(() => null)
    .finally(() => {
      refreshing = null;
    });

  return refreshing;
}

apiClient.interceptors.response.use(
  (r) => r,
  async (error: AxiosError<ProblemDetails>) => {
    const originalRequest = error.config as RetriableRequest | undefined;

    if (canRetryTransientRequest(error, originalRequest)) {
      const retryCount = originalRequest._transientRetryCount ?? 0;
      const retryDelay = TRANSIENT_RETRY_DELAYS_MS[retryCount];

      if (retryDelay) {
        originalRequest._transientRetryCount = retryCount + 1;
        await delay(retryDelay);
        return apiClient(originalRequest);
      }
    }

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !isAuthEndpoint(originalRequest.url) &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        originalRequest.headers = originalRequest.headers ?? {};
        (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      }

      onUnauthorized?.("session-expired");
    }
    return Promise.reject(error);
  },
);

/**
 * Convierte errores del backend en mensajes legibles para las pantallas.
 * Soporta ProblemDetails, errores de validación y fallas de conexión.
 */
export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ProblemDetails | undefined;
    if (error.response?.status === 401 && isAuthEndpoint(error.config?.url)) {
      return "Correo o contraseña incorrectos.";
    }
    if (data) {
      if (data.detail) return data.title ? `${data.title}: ${data.detail}` : data.detail;
      if (data.title) return data.title;
      if (data.errors) {
        return Object.values(data.errors).flat().join(" - ");
      }
    }
    if (error.response?.status === 401) return "Tu sesión expiró. Inicia sesión nuevamente.";
    if (error.response?.status === 403) return "No tienes permisos para realizar esta acción.";
    if (isTransientStatus(error.response?.status)) {
      return "El servidor demoró más de lo esperado. Puede estar despertando; espera unos segundos y vuelve a intentar.";
    }
    if (error.message === "Network Error" || error.code === "ERR_NETWORK" || error.code === "ECONNABORTED") {
      return "La conexión con la API demoró más de lo esperado. Puede estar despertando el servidor o haber una conexión móvil inestable. Espera unos segundos y vuelve a intentar.";
    }
    return "No fue posible completar la operación.";
  }
  return "Ocurrió un error inesperado.";
}

export default apiClient;
