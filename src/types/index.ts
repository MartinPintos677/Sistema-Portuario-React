export interface PagedResponse<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  traceId?: string;
  errors?: Record<string, string[]>;
}

export type RolNombre = "Administrador" | "Encargado" | "Operario" | "Oficina";

export interface Usuario {
  idUsuario: number;
  idEmpresa: number;
  empresa?: string;
  idRol: number;
  rol: RolNombre | string;
  cedula: string;
  nombre: string;
  apellido: string;
  correo: string;
  telefono?: string;
  activo: boolean;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  expira: string;
  usuario: Usuario;
}

export interface Rol {
  idRol: number;
  nombre: string;
}

export interface Empresa {
  idEmpresa: number;
  nombre: string;
  razonSocial?: string;
  rut?: string;
  tipoEmpresa?: string;
  activa: boolean;
}

export interface Cliente {
  idCliente: number;
  idEmpresa?: number;
  empresa?: string;
  razonSocial: string;
  rut?: string;
  nombreContacto?: string;
  correo?: string;
  telefono?: string;
  direccion?: string;
  activo: boolean;
}

export interface TipoMaquinaria {
  idTipoMaquinaria: number;
  nombre: string;
}

export interface Maquinaria {
  idMaquinaria: number;
  idEmpresa: number;
  empresa?: string;
  idTipoMaquinaria: number;
  tipoMaquinaria?: string;
  codigo: string;
  nombre: string;
  marca?: string;
  modelo?: string;
  matricula?: string;
  horasAcumuladas: number;
  activa: boolean;
}

export interface RegistroHorasMaquinaria {
  idRegistroHoras?: number;
  idMaquinaria: number;
  idOrdenServicio?: number | null;
  fecha: string;
  horasTrabajadas: number;
  observacion?: string;
}

export type EstadoOrden =
  | "Pendiente"
  | "Asignada"
  | "EnProceso"
  | "Validada"
  | "Facturada"
  | "Cancelada";

export interface OrdenServicio {
  idOrdenServicio: number;
  idEmpresa: number;
  empresa?: string;
  idCliente: number;
  cliente?: string;
  idEncargado: number;
  encargado?: string;
  idOperario: number;
  operario?: string;
  idMaquinariaAsignada: number;
  maquinariaAsignada?: string;
  idMaquinariaFacturada?: number | null;
  maquinariaFacturada?: string;
  idEstadoOrden: number;
  estadoOrden: string;
  lugarServicio?: string;
  trabajoARealizar?: string;
  horaInicioEstimada?: string;
  horaInicioReal?: string;
  horaFinalizacion?: string;
  observaciones?: string;
  requiereFirmaCliente: boolean;
  fechaSolicitud: string;
  enviadaCliente: boolean;
  precargadaGSoft: boolean;
}

export interface EstadoOrdenItem {
  idEstadoOrden: number;
  nombre: string;
  descripcion?: string;
}

export interface FacturacionOrden {
  idOrdenServicio: number;
  fechaEnvio: string;
  estado: string;
  referenciaGSoft?: string;
  observaciones?: string;
}

export interface TipoMantenimiento {
  idTipoMantenimiento: number;
  nombre: string;
  descripcion?: string;
  umbralHoras?: number | null;
}

export interface EstadoMantenimiento {
  idEstadoMantenimiento: number;
  nombre: string;
}

export interface Mantenimiento {
  idMantenimiento: number;
  idMaquinaria: number;
  maquinaria?: string;
  idTipoMantenimiento: number;
  tipoMantenimiento?: string;
  idEstadoMantenimiento: number;
  estadoMantenimiento?: string;
  idResponsable?: number | null;
  responsable?: string;
  idRegistroHorasOrigen?: number | null;
  fechaProgramada?: string;
  fechaRealizada?: string;
  descripcion?: string;
  horasMaquinaAlMomento?: number;
  observaciones?: string;
}

export interface EstadoTarea {
  idEstadoTarea: number;
  nombre: string;
}

export interface TareaAdministrativa {
  idTarea: number;
  idCreador?: number;
  creador?: string;
  idAsignado?: number | null;
  asignado?: string;
  idEstadoTarea: number;
  estadoTarea: string;
  titulo: string;
  descripcion?: string;
  fechaCreacion?: string;
  fechaVencimiento?: string;
  prioridad?: "Baja" | "Media" | "Alta" | string;
}

export interface EventoCalendario {
  idEvento: number;
  idTarea?: number | null;
  titulo: string;
  descripcion?: string;
  fechaInicio: string;
  fechaFin?: string;
  tipoEvento?: string;
}

export interface PersonalEstiba {
  idPersonalEstiba: number;
  idEmpresa?: number;
  empresa?: string;
  cedula: string;
  nombre: string;
  apellido: string;
  telefono?: string;
  activo: boolean;
}

export interface Cuadrilla {
  idCuadrilla: number;
  idEmpresa?: number;
  empresa?: string;
  nombre: string;
  descripcion?: string;
  activa: boolean;
}

export interface CuadrillaPersonal {
  idCuadrillaPersonal?: number;
  idCuadrilla: number;
  idPersonalEstiba: number;
  fechaDesde?: string;
  fechaHasta?: string | null;
}

export interface EstadoCitacion {
  idEstadoCitacion: number;
  nombre: string;
}

export interface CitacionEstiba {
  idCitacion: number;
  idEmpresa?: number;
  empresa?: string;
  idCliente?: number | null;
  cliente?: string;
  idEstadoCitacion: number;
  estadoCitacion: string;
  fecha: string;
  hora?: string;
  zona?: string;
  detalleOperativo?: string;
}

export interface DetalleCitacion {
  idDetalleCitacion?: number;
  idCitacion: number;
  idPersonalEstiba: number;
  personalEstiba?: string;
  idCuadrilla?: number | null;
  cuadrilla?: string;
  idLiquidacion?: number | null;
  asistencia?: boolean | null;
  horaInicioReal?: string;
  horaFinReal?: string;
  horasTrabajadas?: number;
  estadoAltaBps?: string;
  observaciones?: string;
}

export interface LiquidacionEstiba {
  idLiquidacion?: number;
  idEmpresa?: number;
  empresa?: string;
  periodoDesde: string;
  periodoHasta: string;
  totalHoras?: number;
  estado: string;
  fechaGeneracion?: string;
  observaciones?: string;
}

export type TipoNotificacion = "Email" | "WhatsApp" | "SMS" | "Sistema";

export interface Notificacion {
  idNotificacion: number;
  idUsuario?: number | null;
  idOrdenServicio?: number | null;
  idCitacion?: number | null;
  tipo: TipoNotificacion | string;
  destinatario: string;
  mensaje: string;
  estado: string;
  fechaEnvio?: string;
}

export interface Trazabilidad {
  idTrazabilidad: number;
  fecha: string;
  idUsuario: number;
  usuario?: string;
  accion: string;
  entidad: string;
  idRegistroAfectado: string;
  datosPrevios?: string | null;
  datosNuevos?: string | null;
}
