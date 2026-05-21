import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { extractErrorMessage } from "@/api/client";
import { Button } from "@/components/common/Button";
import { Field, TextInput } from "@/components/common/Input";
import { Modal } from "@/components/common/Modal";
import logo from "@/assets/Logo.jpeg";
import analystLogo from "@/assets/LogoAnalista.png";

const DEMO_PASSWORD = "clave123";

const demoAccounts = [
  {
    role: "Administrador",
    email: "admin.demo@sistema-portuario.local",
    description:
      "Acceso completo: usuarios, empresas, datos maestros, operaciones, notificaciones y trazabilidad.",
  },
  {
    role: "Oficina",
    email: "oficina.demo@sistema-portuario.local",
    description:
      "Gestion administrativa y operativa: clientes, ordenes, tareas, estiba, maquinaria y notificaciones.",
  },
  {
    role: "Encargado",
    email: "encargado.demo@sistema-portuario.local",
    description:
      "Coordinacion operativa: ordenes, asignaciones, mantenimiento, estiba, clientes y seguimiento diario.",
  },
  {
    role: "Operario",
    email: "operario.demo@sistema-portuario.local",
    description:
      "Acceso operativo limitado: dashboard, ordenes asignadas, finalizacion de trabajos y notificaciones.",
  },
];

/**
 * Pantalla de acceso.
 * Presenta accesos demo para que reclutadores o evaluadores prueben roles sin friccion.
 */
export function LoginPage() {
  const { login, sessionMessage } = useAuth();
  const navigate = useNavigate();
  const [correo, setCorreo] = useState(
    import.meta.env.DEV ? "admin.demo@sistema-portuario.local" : "",
  );
  const [password, setPassword] = useState(import.meta.env.DEV ? "clave123" : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDemoModal, setShowDemoModal] = useState(true);

  const selectDemoAccount = (email: string) => {
    setCorreo(email);
    setPassword(DEMO_PASSWORD);
    setError(null);
    setShowDemoModal(false);
  };

  // En demos conviene iniciar siempre en el dashboard para orientar al usuario.
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(correo, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary p-4">
      <Modal open={showDemoModal} onClose={() => setShowDemoModal(false)} size="xl">
        <div className="grid gap-5">
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-3">
              <img src={analystLogo} alt="Martin Pintos" className="h-14 w-14 object-contain" />
              <div className="text-left text-sm font-semibold leading-5 text-foreground">
                Martin Pintos
                <span className="block text-xs font-medium text-muted-foreground">
                  Analista de Sistemas
                </span>
              </div>
            </div>
            <h2 className="mt-4 text-xl font-bold text-foreground">
              Bienvenidos al demo de un sistema portuario
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Podes elegir un rol para precargar correo y contraseña. Luego presiona Ingresar para
              acceder y recorrer el sistema con esos permisos.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {demoAccounts.map((account) => (
              <button
                key={account.role}
                type="button"
                onClick={() => selectDemoAccount(account.email)}
                className="rounded-lg border border-border bg-card p-4 text-left shadow-sm transition hover:border-primary hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="text-sm font-bold text-foreground">{account.role}</div>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <div>
                    <span className="font-semibold text-foreground">Email:</span> {account.email}
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Clave:</span> {DEMO_PASSWORD}
                  </div>
                </div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  {account.description}
                </p>
              </button>
            ))}
          </div>

          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={() => setShowDemoModal(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>

      <div className="w-full max-w-md rounded-xl bg-card p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center">
          <img src={logo} alt="Sistema Portuario" className="h-24 w-auto sm:h-28" />
          <h1 className="mt-4 text-2xl font-bold text-foreground">Sistema Portuario</h1>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Sistema de operaciones
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Correo" required>
            <TextInput
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="usuario@sistema-portuario.local"
              required
              autoFocus
            />
          </Field>
          <Field label="Contrasena" required>
            <TextInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          {sessionMessage && !error && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
              {sessionMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 h-11 rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
