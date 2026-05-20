import axios, { AxiosError } from "axios";
import apiConfig from "@/config/apiConfig";
import type { LoginResponse, ProblemDetails } from "@/types";

export const apiClient = axios.create({
  baseURL: apiConfig.BASE_URL,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(apiConfig.TOKEN_KEY);
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

let onUnauthorized: ((reason?: string) => void) | null = null;
export const setUnauthorizedHandler = (fn: (reason?: string) => void) => {
  onUnauthorized = fn;
};

let refreshing: Promise<string | null> | null = null;

function isAuthEndpoint(url?: string) {
  return Boolean(
    url?.includes("/Auth/login") ||
    url?.includes("/Auth/primer-administrador") ||
    url?.includes("/Auth/refresh"),
  );
}

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
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !isAuthEndpoint(originalRequest.url) &&
      !(originalRequest as typeof originalRequest & { _retry?: boolean })._retry
    ) {
      (originalRequest as typeof originalRequest & { _retry?: boolean })._retry = true;
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
    if (error.response?.status === 401) return "Tu sesion expiro. Inicia sesion nuevamente.";
    if (error.response?.status === 403) return "No tienes permisos para realizar esta accion.";
    if (error.message === "Network Error") {
      return "No se pudo conectar con el backend. Verifica que la API este iniciada.";
    }
    return "No fue posible completar la operacion.";
  }
  return "Ocurrio un error inesperado.";
}

export default apiClient;
