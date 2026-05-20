import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { RoleRoute } from "@/auth/RoleGuard";
import { ToastProvider } from "@/components/common/Toast";
import { AppLayout } from "@/layouts/AppLayout";
import { LoginPage } from "@/pages/Login";
import { DashboardPage } from "@/pages/Dashboard";
import {
  EmpresasPage,
  UsuariosPage,
  ClientesPage,
  MaquinariasPage,
  OrdenesPage,
  MantenimientosPage,
  AdministracionPage,
  EstibaPage,
  NotificacionesPage,
  TrazabilidadPage,
} from "@/pages/modules";

function RootRedirect() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;
  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />;
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route
                path="/ordenes"
                element={
                  <RoleRoute roles={["Administrador", "Oficina", "Encargado", "Operario"]}>
                    <OrdenesPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/maquinarias"
                element={
                  <RoleRoute roles={["Administrador", "Oficina", "Encargado"]}>
                    <MaquinariasPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/mantenimientos"
                element={
                  <RoleRoute roles={["Administrador", "Oficina", "Encargado"]}>
                    <MantenimientosPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/clientes"
                element={
                  <RoleRoute roles={["Administrador", "Oficina", "Encargado"]}>
                    <ClientesPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/estiba"
                element={
                  <RoleRoute roles={["Administrador", "Oficina", "Encargado"]}>
                    <EstibaPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/administracion"
                element={
                  <RoleRoute roles={["Administrador", "Oficina", "Encargado"]}>
                    <AdministracionPage />
                  </RoleRoute>
                }
              />
              <Route path="/notificaciones" element={<NotificacionesPage />} />
              <Route
                path="/usuarios"
                element={
                  <RoleRoute roles={["Administrador"]}>
                    <UsuariosPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/empresas"
                element={
                  <RoleRoute roles={["Administrador"]}>
                    <EmpresasPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/trazabilidad"
                element={
                  <RoleRoute roles={["Administrador"]}>
                    <TrazabilidadPage />
                  </RoleRoute>
                }
              />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </HashRouter>
  );
}
