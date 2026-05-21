import type { ReactNode } from "react";
import { TableSkeleton } from "./Loading";
import { Empty } from "./Empty";
import { Button } from "./Button";
import type { PagedResponse } from "@/types";

/**
 * Tabla genérica usada por los módulos CRUD.
 * Acepta datos páginados de la API o filas filtradas localmente, manteniendo
 * estados consistentes de carga, error, vacío y páginación.
 */
export interface Column<T> {
  key: string;
  header: ReactNode;
  render?: (row: T) => ReactNode;
  className?: string;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data?: PagedResponse<T> | null;
  rows?: T[];
  loading?: boolean;
  error?: string | null;
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  emptyText?: string;
  pageNumber?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  actions?: (row: T) => ReactNode;
}

export function DataTable<T>({
  columns,
  data,
  rows,
  loading,
  error,
  rowKey,
  onRowClick,
  emptyText = "No hay registros para mostrar",
  pageNumber,
  onPageChange,
  actions,
}: DataTableProps<T>) {
  const items = rows ?? data?.items ?? [];
  const isFiltered = !!rows && rows.length !== (data?.items.length ?? 0);
  const totalPages = data?.totalPages ?? 1;
  const currentPage = pageNumber ?? data?.pageNumber ?? 1;

  if (loading && items.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <TableSkeleton rows={6} cols={Math.max(columns.length, 4)} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (items.length === 0) {
    return <Empty title="Sin resultados" description={emptyText} />;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`px-4 py-3 ${c.className ?? ""}`}
                  style={c.width ? { width: c.width } : undefined}
                >
                  {c.header}
                </th>
              ))}
              {actions && <th className="px-4 py-3 text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`${onRowClick ? "cursor-pointer hover:bg-muted/40" : ""}`}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-4 py-3 align-middle text-foreground ${c.className ?? ""}`}
                  >
                    {c.render
                      ? c.render(row)
                      : (((row as Record<string, unknown>)[c.key] as ReactNode) ?? "-")}
                  </td>
                ))}
                {actions && (
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center justify-end gap-2">{actions(row)}</div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && (
        <div className="flex flex-col items-center justify-between gap-2 border-t border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground sm:flex-row">
          <div>
            Página <strong className="text-foreground">{currentPage}</strong> de{" "}
            <strong className="text-foreground">{totalPages}</strong> -{" "}
            {isFiltered ? (
              <>
                <strong className="text-foreground">{items.length}</strong> visibles de{" "}
                {data.items.length} en esta página - {data.totalCount} registros totales
              </>
            ) : (
              <>{data.totalCount} registros</>
            )}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage <= 1}
                onClick={() => onPageChange?.(currentPage - 1)}
              >
                Anterior
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage >= totalPages}
                onClick={() => onPageChange?.(currentPage + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
