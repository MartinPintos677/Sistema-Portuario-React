import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

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

export function RoleRoute({ roles, children }: { roles: string[]; children: ReactNode }) {
  const { hasRole } = useAuth();
  if (!hasRole(...roles)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
