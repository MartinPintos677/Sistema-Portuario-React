import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

/**
 * Oculta partes de una pantalla cuando el rol actual no esta autorizado.
 * Se usa para acciones puntuales dentro de módulos compartidos.
 */
export function RoleGuard({
  roles,
  children,
  fallback = null,
}: {
  roles: string[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { hasRole } = useAuth();
  if (!hasRole(...roles)) return <>{fallback}</>;
  return <>{children}</>;
}

/**
 * Protege una ruta completa por rol.
 * Ante falta de permisos, devuelve al dashboard como punto seguro.
 */
export function RoleRoute({ roles, children }: { roles: string[]; children: ReactNode }) {
  const { hasRole } = useAuth();
  if (!hasRole(...roles)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
