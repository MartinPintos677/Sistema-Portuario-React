import apiClient from "./client";
import type {
  PagedResponse,
  LoginResponse,
  Usuario,
  Rol,
  Empresa,
  Cliente,
  Maquinaria,
  TipoMaquinaria,
  RegistroHorasMaquinaria,
  OrdenServicio,
  EstadoOrdenItem,
  FacturacionOrden,
  Mantenimiento,
  TipoMantenimiento,
  EstadoMantenimiento,
  TareaAdministrativa,
  EstadoTarea,
  EventoCalendario,
  PersonalEstiba,
  Cuadrilla,
  CuadrillaPersonal,
  EstadoCitacion,
  CitacionEstiba,
  DetalleCitacion,
  LiquidacionEstiba,
  Notificacion,
  Trazabilidad,
} from "@/types";

/**
 * Capa de servicios del frontend.
 *
 * Agrupa llamadas por módulo y mantiene a las pantallas aisladas de las rutas
 * HTTP concretas. Cada metodo devuelve datos de dominio en vez de respuestas
 * Axios completas.
 */
type Page = { pageNumber?: number; pageSize?: number };

// Normaliza parámetros de páginacion antes de enviarlos a la API.
const params = (p?: Page) => ({
  pageNumber: p?.pageNumber ?? 1,
  pageSize: Math.min(p?.pageSize ?? 20, 100),
});

// AUTH
export const authApi = {
  login: (correo: string, password: string) =>
    apiClient.post<LoginResponse>("/Auth/login", { correo, password }).then((r) => r.data),
  refresh: (refreshToken: string) =>
    apiClient.post<LoginResponse>("/Auth/refresh", { refreshToken }).then((r) => r.data),
  logout: (refreshToken?: string | null) =>
    apiClient.post("/Auth/logout", { refreshToken }).then((r) => r.data),
  primerAdministrador: (data: Record<string, unknown>) =>
    apiClient.post<LoginResponse>("/Auth/primer-administrador", data).then((r) => r.data),
};

// USUARIOS
export const usuariosApi = {
  list: (p?: Page) =>
    apiClient.get<PagedResponse<Usuario>>("/usuarios", { params: params(p) }).then((r) => r.data),
  get: (id: number) => apiClient.get<Usuario>(`/usuarios/${id}`).then((r) => r.data),
  roles: () => apiClient.get<Rol[]>("/usuarios/roles").then((r) => r.data),
  create: (data: Partial<Usuario> & { password: string }) =>
    apiClient.post<Usuario>("/usuarios", data).then((r) => r.data),
  update: (id: number, data: Partial<Usuario>) =>
    apiClient.put<Usuario>(`/usuarios/${id}`, data).then((r) => r.data),
  setActivo: (id: number, activo: boolean) =>
    apiClient.patch(`/usuarios/${id}/activo`, activo).then((r) => r.data),
};

// EMPRESAS
export const empresasApi = {
  list: (p?: Page) =>
    apiClient.get<PagedResponse<Empresa>>("/empresas", { params: params(p) }).then((r) => r.data),
  get: (id: number) => apiClient.get<Empresa>(`/empresas/${id}`).then((r) => r.data),
  create: (data: Partial<Empresa>) =>
    apiClient.post<Empresa>("/empresas", data).then((r) => r.data),
  update: (id: number, data: Partial<Empresa>) =>
    apiClient.put<Empresa>(`/empresas/${id}`, data).then((r) => r.data),
};

// CLIENTES
export const clientesApi = {
  list: (p?: Page) =>
    apiClient.get<PagedResponse<Cliente>>("/clientes", { params: params(p) }).then((r) => r.data),
  get: (id: number) => apiClient.get<Cliente>(`/clientes/${id}`).then((r) => r.data),
  create: (data: Partial<Cliente>) =>
    apiClient.post<Cliente>("/clientes", data).then((r) => r.data),
  update: (id: number, data: Partial<Cliente>) =>
    apiClient.put<Cliente>(`/clientes/${id}`, data).then((r) => r.data),
};

// MAQUINARIAS
export const maquinariasApi = {
  list: (p?: Page) =>
    apiClient
      .get<PagedResponse<Maquinaria>>("/maquinarias", { params: params(p) })
      .then((r) => r.data),
  get: (id: number) => apiClient.get<Maquinaria>(`/maquinarias/${id}`).then((r) => r.data),
  historialHoras: (id: number, p?: Page) =>
    apiClient
      .get<PagedResponse<RegistroHorasMaquinaria>>(`/maquinarias/${id}/registros-horas`, {
        params: params(p),
      })
      .then((r) => r.data),
  tipos: () => apiClient.get<TipoMaquinaria[]>("/maquinarias/tipos").then((r) => r.data),
  create: (data: Partial<Maquinaria>) =>
    apiClient.post<Maquinaria>("/maquinarias", data).then((r) => r.data),
  update: (id: number, data: Partial<Maquinaria>) =>
    apiClient.put<Maquinaria>(`/maquinarias/${id}`, data).then((r) => r.data),
  registrarHoras: (data: RegistroHorasMaquinaria) =>
    apiClient
      .post<RegistroHorasMaquinaria>("/maquinarias/registros-horas", data)
      .then((r) => r.data),
};

// ORDENES
export const ordenesApi = {
  list: (p?: Page) =>
    apiClient
      .get<PagedResponse<OrdenServicio>>("/ordenes-servicio", { params: params(p) })
      .then((r) => r.data),
  get: (id: number) => apiClient.get<OrdenServicio>(`/ordenes-servicio/${id}`).then((r) => r.data),
  estados: () => apiClient.get<EstadoOrdenItem[]>("/ordenes-servicio/estados").then((r) => r.data),
  create: (data: Partial<OrdenServicio>) =>
    apiClient.post<OrdenServicio>("/ordenes-servicio", data).then((r) => r.data),
  update: (id: number, data: Partial<OrdenServicio>) =>
    apiClient.put<OrdenServicio>(`/ordenes-servicio/${id}`, data).then((r) => r.data),
  finalizar: (id: number, data: { horaFinalizacion: string; observaciones?: string }) =>
    apiClient.patch(`/ordenes-servicio/${id}/finalizar`, data).then((r) => r.data),
  facturacion: (data: FacturacionOrden) =>
    apiClient.post("/ordenes-servicio/facturacion", data).then((r) => r.data),
};

// MANTENIMIENTO
export const mantenimientoApi = {
  list: (p?: Page) =>
    apiClient
      .get<PagedResponse<Mantenimiento>>("/mantenimientos", { params: params(p) })
      .then((r) => r.data),
  get: (id: number) => apiClient.get<Mantenimiento>(`/mantenimientos/${id}`).then((r) => r.data),
  tipos: () => apiClient.get<TipoMantenimiento[]>("/mantenimientos/tipos").then((r) => r.data),
  crearTipo: (data: Partial<TipoMantenimiento>) =>
    apiClient.post<TipoMantenimiento>("/mantenimientos/tipos", data).then((r) => r.data),
  estados: () =>
    apiClient.get<EstadoMantenimiento[]>("/mantenimientos/estados").then((r) => r.data),
  create: (data: Partial<Mantenimiento>) =>
    apiClient.post<Mantenimiento>("/mantenimientos", data).then((r) => r.data),
  update: (id: number, data: Partial<Mantenimiento>) =>
    apiClient.put<Mantenimiento>(`/mantenimientos/${id}`, data).then((r) => r.data),
};

// ADMINISTRACION
export const administracionApi = {
  estadosTarea: () =>
    apiClient.get<EstadoTarea[]>("/administracion/estados-tarea").then((r) => r.data),
  tareas: (p?: Page) =>
    apiClient
      .get<PagedResponse<TareaAdministrativa>>("/administracion/tareas", { params: params(p) })
      .then((r) => r.data),
  tarea: (id: number) =>
    apiClient.get<TareaAdministrativa>(`/administracion/tareas/${id}`).then((r) => r.data),
  crearTarea: (data: Partial<TareaAdministrativa>) =>
    apiClient.post<TareaAdministrativa>("/administracion/tareas", data).then((r) => r.data),
  updateTarea: (id: number, data: Partial<TareaAdministrativa>) =>
    apiClient.put<TareaAdministrativa>(`/administracion/tareas/${id}`, data).then((r) => r.data),
  eventos: (p?: Page) =>
    apiClient
      .get<PagedResponse<EventoCalendario>>("/administracion/eventos", { params: params(p) })
      .then((r) => r.data),
  crearEvento: (data: Partial<EventoCalendario>) =>
    apiClient.post<EventoCalendario>("/administracion/eventos", data).then((r) => r.data),
};

// ESTIBA
export const estibaApi = {
  personal: (p?: Page) =>
    apiClient
      .get<PagedResponse<PersonalEstiba>>("/estiba/personal", { params: params(p) })
      .then((r) => r.data),
  crearPersonal: (data: Partial<PersonalEstiba>) =>
    apiClient.post<PersonalEstiba>("/estiba/personal", data).then((r) => r.data),
  updatePersonal: (id: number, data: Partial<PersonalEstiba>) =>
    apiClient.put<PersonalEstiba>(`/estiba/personal/${id}`, data).then((r) => r.data),
  cuadrillas: (p?: Page) =>
    apiClient
      .get<PagedResponse<Cuadrilla>>("/estiba/cuadrillas", { params: params(p) })
      .then((r) => r.data),
  crearCuadrilla: (data: Partial<Cuadrilla>) =>
    apiClient.post<Cuadrilla>("/estiba/cuadrillas", data).then((r) => r.data),
  updateCuadrilla: (id: number, data: Partial<Cuadrilla>) =>
    apiClient.put<Cuadrilla>(`/estiba/cuadrillas/${id}`, data).then((r) => r.data),
  asignarPersonalCuadrilla: (data: CuadrillaPersonal) =>
    apiClient.post("/estiba/cuadrillas/personal", data).then((r) => r.data),
  estadosCitacion: () =>
    apiClient.get<EstadoCitacion[]>("/estiba/estados-citacion").then((r) => r.data),
  citaciones: (p?: Page) =>
    apiClient
      .get<PagedResponse<CitacionEstiba>>("/estiba/citaciones", { params: params(p) })
      .then((r) => r.data),
  crearCitacion: (data: Partial<CitacionEstiba>) =>
    apiClient.post<CitacionEstiba>("/estiba/citaciones", data).then((r) => r.data),
  updateCitacion: (id: number, data: Partial<CitacionEstiba>) =>
    apiClient.put<CitacionEstiba>(`/estiba/citaciones/${id}`, data).then((r) => r.data),
  detallesCitacion: (idCitacion: number) =>
    apiClient
      .get<DetalleCitacion[]>(`/estiba/citaciones/${idCitacion}/detalles`)
      .then((r) => r.data),
  agregarDetalleCitacion: (data: DetalleCitacion) =>
    apiClient.post("/estiba/citaciones/detalles", data).then((r) => r.data),
  updateDetalleCitacion: (id: number, data: Partial<DetalleCitacion>) =>
    apiClient.put(`/estiba/citaciones/detalles/${id}`, data).then((r) => r.data),
  listarLiquidaciones: (p?: Page) =>
    apiClient
      .get<PagedResponse<LiquidacionEstiba>>("/estiba/liquidaciones", { params: params(p) })
      .then((r) => r.data),
  liquidaciones: (data: LiquidacionEstiba) =>
    apiClient.post("/estiba/liquidaciones", data).then((r) => r.data),
  updateLiquidacion: (id: number, data: LiquidacionEstiba) =>
    apiClient.put(`/estiba/liquidaciones/${id}`, data).then((r) => r.data),
};

// NOTIFICACIONES
export const notificacionesApi = {
  list: (p?: Page) =>
    apiClient
      .get<PagedResponse<Notificacion>>("/notificaciones", { params: params(p) })
      .then((r) => r.data),
  create: (data: Partial<Notificacion>) =>
    apiClient.post<Notificacion>("/notificaciones", data).then((r) => r.data),
  setEstado: (id: number, estado: string) =>
    apiClient.patch(`/notificaciones/${id}/estado`, { estado }).then((r) => r.data),
};

// TRAZABILIDAD
export const trazabilidadApi = {
  list: (p?: Page) =>
    apiClient
      .get<PagedResponse<Trazabilidad>>("/trazabilidad", { params: params(p) })
      .then((r) => r.data),
  porEntidad: (entidad: string, idRegistroAfectado: string | number, p?: Page) =>
    apiClient
      .get<
        PagedResponse<Trazabilidad>
      >(`/trazabilidad/${entidad}/${idRegistroAfectado}`, { params: params(p) })
      .then((r) => r.data),
};
