import { useState } from "react";
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
import { useAuth } from "@/auth/AuthContext";
import { puedeVer, type ModuloKey } from "@/auth/permisos";
import logo from "@/assets/Logo.jpeg";

interface NavItem {
  to: string;
  label: string;
  modulo: ModuloKey;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", modulo: "dashboard", icon: LayoutDashboard },
  { to: "/ordenes", label: "Ordenes de servicio", modulo: "ordenes", icon: ClipboardList },
  { to: "/maquinarias", label: "Maquinaria", modulo: "maquinarias", icon: Gauge },
  { to: "/mantenimientos", label: "Mantenimiento", modulo: "mantenimiento", icon: Settings },
  { to: "/clientes", label: "Clientes", modulo: "clientes", icon: Users },
  { to: "/estiba", label: "Estiba", modulo: "estiba", icon: PackageCheck },
  { to: "/administracion", label: "Administracion", modulo: "administracion", icon: CalendarCheck },
  { to: "/notificaciones", label: "Notificaciones", modulo: "notificaciones", icon: Bell },
  { to: "/usuarios", label: "Usuarios", modulo: "usuarios", icon: UserCog },
  { to: "/empresas", label: "Datos Empresas", modulo: "empresas", icon: Building2 },
  { to: "/trazabilidad", label: "Trazabilidad", modulo: "trazabilidad", icon: ScrollText },
];

export function AppLayout() {
  const { usuario, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const visible = NAV.filter((n) => puedeVer(usuario?.rol, n.modulo));

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-r md:border-border md:bg-primary md:text-primary-foreground">
        <Brand />
        <nav className="flex-1 overflow-y-auto py-4">
          {visible.map((n) => (
            <SidebarLink key={n.to} {...n} />
          ))}
        </nav>
        <div className="border-t border-primary-foreground/10 p-4 text-xs text-primary-foreground/60">
          Sistema Portuario - v1.0
        </div>
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
            </nav>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-card px-4 shadow-sm">
          <button
            className="rounded-md border border-border p-2 text-foreground hover:bg-muted md:hidden"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
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
    </div>
  );
}

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
          aria-label="Cerrar menu"
        >
          <X className="h-5 w-5" />
        </button>
      )}
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
