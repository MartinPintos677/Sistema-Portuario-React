import type { ReactNode } from "react";

// Mapa visual de estados comunes del dominio.
// Normaliza espacios para aceptar valores como "En proceso" o "EnProceso".
const map: Record<string, string> = {
  pendiente: "bg-warning/15 text-warning border-warning/30",
  asignada: "bg-info/15 text-info border-info/30",
  asignado: "bg-info/15 text-info border-info/30",
  enproceso: "bg-primary-accent/15 text-primary-accent border-primary-accent/30",
  validada: "bg-success/15 text-success border-success/30",
  validado: "bg-success/15 text-success border-success/30",
  facturada: "bg-success/20 text-success border-success/40",
  facturado: "bg-success/20 text-success border-success/40",
  cancelada: "bg-destructive/15 text-destructive border-destructive/30",
  cancelado: "bg-destructive/15 text-destructive border-destructive/30",
  activo: "bg-success/15 text-success border-success/30",
  activa: "bg-success/15 text-success border-success/30",
  inactivo: "bg-muted text-muted-foreground border-border",
  inactiva: "bg-muted text-muted-foreground border-border",
  default: "bg-muted text-muted-foreground border-border",
};

/**
 * Badge de estado reútilizable.
 * Usa el texto recibido como fallback para elegir color sin exigir lógica extra.
 */
export function StatusBadge({ children, variant }: { children: ReactNode; variant?: string }) {
  const raw = (variant ?? String(children)).toLowerCase();
  const cls = map[raw.replace(/\s/g, "")] ?? map[raw] ?? map.default;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${cls}`}
    >
      {children}
    </span>
  );
}
