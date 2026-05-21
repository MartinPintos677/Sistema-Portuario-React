import type { ReactNode } from "react";

/**
 * Estado vacío generico.
 * Se usa cuando una tabla o módulo no tiene registros disponibles para mostrar.
 */
export function Empty({
  title = "Sin datos",
  description,
  action,
  icon = "[]",
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card/40 px-6 py-16 text-center">
      <div className="text-4xl opacity-70">{icon}</div>
      <div className="text-base font-semibold text-foreground">{title}</div>
      {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
