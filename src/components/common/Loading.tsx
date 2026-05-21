/**
 * Indicadores de carga compartidos.
 * Evitan que cada pantalla implemente su propio spinner o skeleton de tabla.
 */
export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <span
      className="inline-block animate-spin rounded-full border-[3px] border-primary border-t-transparent"
      style={{ width: size, height: size }}
    />
  );
}
export function LoadingBlock({ text = "Cargando..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
      <Spinner />
      <span className="text-sm">{text}</span>
    </div>
  );
}
export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-2">
          {Array.from({ length: cols }).map((__, c) => (
            <div key={c} className="h-8 flex-1 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ))}
    </div>
  );
}
