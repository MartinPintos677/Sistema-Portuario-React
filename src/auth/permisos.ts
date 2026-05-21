import type { RolNombre } from "@/types";

/**
 * Catálogo de módulos navegables del frontend.
 * Debe mantenerse alineado con AppLayout y las rutas protegidas.
 */
export type ModuloKey =
  | "dashboard"
  | "empresas"
  | "usuarios"
  | "clientes"
  | "maquinarias"
  | "ordenes"
  | "mantenimiento"
  | "administracion"
  | "estiba"
  | "notificaciones"
  | "trazabilidad";

/**
 * Matriz de permisos visuales por rol.
 * La API sigue siendo la fuente final de seguridad; esto controla navegacion y UI.
 */
export const permisosPorRol: Record<RolNombre, ModuloKey[]> = {
  Administrador: [
    "dashboard",
    "empresas",
    "usuarios",
    "clientes",
    "maquinarias",
    "ordenes",
    "mantenimiento",
    "administracion",
    "estiba",
    "notificaciones",
    "trazabilidad",
  ],
  Oficina: [
    "dashboard",
    "clientes",
    "ordenes",
    "administracion",
    "estiba",
    "notificaciones",
    "maquinarias",
    "mantenimiento",
  ],
  Encargado: [
    "dashboard",
    "ordenes",
    "maquinarias",
    "mantenimiento",
    "estiba",
    "administracion",
    "notificaciones",
    "clientes",
  ],
  Operario: ["dashboard", "ordenes", "notificaciones"],
};

/**
 * Helper pequeÃ±o para decidir si una pantalla o acciÃ³n debe mostrarse.
 */
export function puedeVer(rol: string | undefined, modulo: ModuloKey): boolean {
  if (!rol) return false;
  const lista = permisosPorRol[rol as RolNombre];
  return lista ? lista.includes(modulo) : false;
}
