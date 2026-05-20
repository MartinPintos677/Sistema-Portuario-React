import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { extractErrorMessage } from "@/api/client";
import { Field, TextInput } from "@/components/common/Input";
import logo from "@/assets/Logo.jpeg";

export function LoginPage() {
  const { login, sessionMessage } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: { pathname?: string } } };
  const [correo, setCorreo] = useState(
    import.meta.env.DEV ? "admin.demo@sistema-portuario.local" : "",
  );
  const [password, setPassword] = useState(import.meta.env.DEV ? "clave123" : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(correo, password);
      const dest = location.state?.from?.pathname ?? "/dashboard";
      navigate(dest, { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary p-4">
      <div className="w-full max-w-md rounded-xl bg-card p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center">
          <img src={logo} alt="Sistema Portuario" className="h-16 w-auto" />
          <h1 className="mt-3 text-2xl font-bold text-foreground">Sistema Portuario</h1>
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
