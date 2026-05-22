import { useState } from "react";
import type { FormEvent } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Building2,
  CalendarCheck,
  ClipboardList,
  Gauge,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageCheck,
  ScrollText,
  Settings,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { extractErrorMessage } from "@/api/client";
import { usuariosApi } from "@/api/services";
import { useAuth } from "@/auth/AuthContext";
import { puedeVer, type ModuloKey } from "@/auth/permisos";
import { Button } from "@/components/common/Button";
import { Field, TextInput } from "@/components/common/Input";
import { Modal } from "@/components/common/Modal";
import { useToast } from "@/components/common/Toast";
import type { Usuario } from "@/types";
import logo from "@/assets/Logo.jpeg";
import analystLogo from "@/assets/LogoAnalista.png";

interface NavItem {
  to: string;
  label: string;
  modulo: ModuloKey;
  icon: LucideIcon;
}

/**
 * Navegación principal del sistema.
 * Cada item declara el módulo requerido para poder filtrar el menú por rol.
 */
const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", modulo: "dashboard", icon: LayoutDashboard },
  { to: "/ordenes", label: "Órdenes de servicio", modulo: "ordenes", icon: ClipboardList },
  { to: "/maquinarias", label: "Maquinaria", modulo: "maquinarias", icon: Gauge },
  { to: "/mantenimientos", label: "Mantenimiento", modulo: "mantenimiento", icon: Settings },
  { to: "/clientes", label: "Clientes", modulo: "clientes", icon: Users },
  { to: "/estiba", label: "Estiba", modulo: "estiba", icon: PackageCheck },
  { to: "/administracion", label: "Administración", modulo: "administracion", icon: CalendarCheck },
  { to: "/notificaciones", label: "Notificaciones", modulo: "notificaciones", icon: Bell },
  { to: "/usuarios", label: "Usuarios", modulo: "usuarios", icon: UserCog },
  { to: "/empresas", label: "Datos Empresas", modulo: "empresas", icon: Building2 },
  { to: "/trazabilidad", label: "Trazabilidad", modulo: "trazabilidad", icon: ScrollText },
];

/**
 * Layout privado de la aplicación.
 * Renderiza sidebar, header de usuario y el contenido de la ruta activa.
 */
export function AppLayout() {
  const { usuario, logout, updateUsuario } = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();
  const visible = NAV.filter((n) => puedeVer(usuario?.rol, n.modulo));
  const canEditOwnProfileFromMenu = usuario?.rol !== "Administrador";

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-r md:border-border md:bg-primary md:text-primary-foreground">
        <Brand />
        <nav className="flex-1 overflow-y-auto py-4">
          {visible.map((n) => (
            <SidebarLink key={n.to} {...n} />
          ))}
          {canEditOwnProfileFromMenu && (
            <SidebarButton
              label="Editar usuario"
              icon={UserCog}
              onClick={() => setProfileOpen(true)}
            />
          )}
        </nav>
        <DeveloperCredit />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-72 flex-col bg-primary text-primary-foreground shadow-xl">
            <Brand onClose={() => setOpen(false)} />
            <nav className="flex-1 overflow-y-auto py-4" onClick={() => setOpen(false)}>
              {visible.map((n) => (
                <SidebarLink key={n.to} {...n} />
              ))}
              {canEditOwnProfileFromMenu && (
                <SidebarButton
                  label="Editar usuario"
                  icon={UserCog}
                  onClick={() => setProfileOpen(true)}
                />
              )}
            </nav>
            <DeveloperCredit />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-card px-4 shadow-sm">
          <button
            className="rounded-md border border-border p-2 text-foreground hover:bg-muted md:hidden"
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3 md:hidden">
            <img src={logo} alt="Sistema Portuario" className="h-8 w-auto" />
          </div>

          <div className="flex flex-1 items-center justify-end gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-semibold text-foreground">
                {usuario?.nombre} {usuario?.apellido}
              </div>
              <div className="text-xs text-muted-foreground">
                {usuario?.empresa} - {usuario?.rol}
              </div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {(usuario?.nombre?.[0] ?? "?") + (usuario?.apellido?.[0] ?? "")}
            </div>
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="inline-flex items-center rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            >
              <LogOut className="mr-1.5 h-3.5 w-3.5" />
              Salir
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      <PerfilUsuarioModal
        open={profileOpen}
        usuario={usuario}
        onClose={() => setProfileOpen(false)}
        onSaved={(nextUsuario) => {
          updateUsuario(nextUsuario);
          toast.success("Usuario actualizado.");
        }}
      />
    </div>
  );
}

/**
 * Encabezado de marca reutilizado en sidebar desktop y menú mobile.
 */
function Brand({ onClose }: { onClose?: () => void }) {
  return (
    <div className="flex h-16 items-center justify-between gap-3 border-b border-primary-foreground/10 px-4">
      <div className="flex items-center gap-2.5">
        <img src={logo} alt="Sistema Portuario" className="h-9 w-auto" />
        <div>
          <div className="text-base font-bold leading-tight">Sistema Portuario</div>
          <div className="text-[10px] uppercase tracking-widest text-primary-foreground/60">
            Operaciones
          </div>
        </div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="rounded p-1 text-primary-foreground/70 hover:bg-primary-foreground/10"
          aria-label="Cerrar menú"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

/**
 * Crédito del desarrollador mostrado en el pie del menú lateral.
 */
function DeveloperCredit() {
  return (
    <div className="border-t border-primary-foreground/10 px-4 py-4">
      <div className="flex items-center gap-3 text-primary-foreground/75">
        <img src={analystLogo} alt="Martin Pintos" className="h-10 w-10 shrink-0 object-contain" />
        <div className="min-w-0 text-[11px] leading-4">
          Desarrollado por Martin Pintos - Analista de Sistemas
        </div>
      </div>
    </div>
  );
}

function SidebarLink({ to, label, icon: Icon }: NavItem) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 border-l-2 px-4 py-2.5 text-sm transition-colors ${
          isActive
            ? "border-primary-accent bg-primary-foreground/10 font-semibold text-primary-foreground"
            : "border-transparent text-primary-foreground/70 hover:bg-primary-foreground/5 hover:text-primary-foreground"
        }`
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </NavLink>
  );
}

function SidebarButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 border-l-2 border-transparent px-4 py-2.5 text-left text-sm text-primary-foreground/70 transition-colors hover:bg-primary-foreground/5 hover:text-primary-foreground"
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </button>
  );
}

function PerfilUsuarioModal({
  open,
  usuario,
  onClose,
  onSaved,
}: {
  open: boolean;
  usuario: Usuario | null;
  onClose: () => void;
  onSaved: (usuario: Usuario) => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = form.get("password")?.toString().trim() ?? "";
    setPasswordError(null);

    if (password && password.length < 6) {
      setPasswordError("Debe tener al menos 6 caracteres.");
      return;
    }

    setSaving(true);
    try {
      const nextUsuario = await usuariosApi.updatePerfil({
        telefono: form.get("telefono")?.toString().trim() || undefined,
        password: password || undefined,
      });
      onSaved(nextUsuario);
      onClose();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Editar usuario" size="md">
      <form className="grid gap-4" onSubmit={submit}>
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
          <div className="font-semibold text-foreground">
            {usuario?.nombre} {usuario?.apellido}
          </div>
          <div className="text-xs text-muted-foreground">{usuario?.correo}</div>
        </div>
        <Field label="Teléfono">
          <TextInput name="telefono" defaultValue={usuario?.telefono ?? ""} maxLength={50} />
        </Field>
        <Field
          label="Nueva contraseña"
          hint="Dejar en blanco para mantener la contraseña actual."
          error={passwordError ?? undefined}
        >
          <TextInput name="password" type="password" minLength={6} maxLength={100} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Guardar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
