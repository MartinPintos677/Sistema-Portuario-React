import type { RolNombre } from "@/types";

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

export function puedeVer(rol: string | undefined, modulo: ModuloKey): boolean {
  if (!rol) return false;
  const lista = permisosPorRol[rol as RolNombre];
  return lista ? lista.includes(modulo) : false;
}
