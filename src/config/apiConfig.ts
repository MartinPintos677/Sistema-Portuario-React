/**
 * Configuracion central de la API.
 * Cambia BASE_URL para apuntar a otro entorno.
 */
export const apiConfig = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5117/api",
  TOKEN_KEY: "sistema_portuario_token",
  REFRESH_TOKEN_KEY: "sistema_portuario_refresh_token",
  USER_KEY: "sistema_portuario_user",
  EXPIRA_KEY: "sistema_portuario_expira",
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
};

export default apiConfig;
