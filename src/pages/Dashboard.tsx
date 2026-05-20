import { useEffect, useState } from "react";
import {
  ordenesApi,
  maquinariasApi,
  mantenimientoApi,
  estibaApi,
  administracionApi,
} from "@/api/services";
import { useAuth } from "@/auth/AuthContext";
import { puedeVer } from "@/auth/permisos";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingBlock } from "@/components/common/Loading";
import { StatusBadge } from "@/components/common/Badge";
import type { OrdenServicio, TareaAdministrativa } from "@/types";

interface Card {
  label: string;
  value: number | string;
  tone: string;
}

interface DashboardData {
  cards: Card[];
  ordenes: OrdenServicio[];
  tareas: TareaAdministrativa[];
  warnings: string[];
}

export function DashboardPage() {
  const { usuario } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const canOrdenesView = puedeVer(usuario?.rol, "ordenes");
  const canAdministracionView = puedeVer(usuario?.rol, "administracion");

  useEffect(() => {
    (async () => {
      const rol = usuario?.rol;
      const canOrdenes = puedeVer(rol, "ordenes");
      const canMaquinaria = puedeVer(rol, "maquinarias");
      const canMantenimiento = puedeVer(rol, "mantenimiento");
      const canEstiba = puedeVer(rol, "estiba");
      const canAdministracion = puedeVer(rol, "administracion");

      const [ord, maq, mant, cit, tar] = await Promise.allSettled([
        canOrdenes ? ordenesApi.list({ pageSize: 100 }) : Promise.resolve({ items: [] }),
        canMaquinaria ? maquinariasApi.list({ pageSize: 100 }) : Promise.resolve({ items: [] }),
        canMantenimiento
          ? mantenimientoApi.list({ pageSize: 100 })
          : Promise.resolve({ items: [] }),
        canEstiba ? estibaApi.citaciones({ pageSize: 100 }) : Promise.resolve({ items: [] }),
        canAdministracion
          ? administracionApi.tareas({ pageSize: 100 })
          : Promise.resolve({ items: [] }),
      ]);
      const ordItems = ord.status === "fulfilled" ? ord.value.items : [];
      const maqItems = maq.status === "fulfilled" ? maq.value.items : [];
      const mantItems = mant.status === "fulfilled" ? mant.value.items : [];
      const citItems = cit.status === "fulfilled" ? cit.value.items : [];
      const tarItems = tar.status === "fulfilled" ? tar.value.items : [];
      const lower = (s?: string) => (s ?? "").toLowerCase();
      const warnings = [
        canOrdenes && ord.status === "rejected" ? "No se pudo cargar ordenes." : "",
        canMaquinaria && maq.status === "rejected" ? "No se pudo cargar maquinaria." : "",
        canMantenimiento && mant.status === "rejected" ? "No se pudo cargar mantenimientos." : "",
        canEstiba && cit.status === "rejected" ? "No se pudo cargar citaciones." : "",
        canAdministracion && tar.status === "rejected" ? "No se pudo cargar tareas." : "",
      ].filter(Boolean);

      setData({
        cards: (
          [
            canOrdenes
              ? {
                  label: "Ordenes pendientes",
                  value: ordItems.filter((o) => lower(o.estadoOrden).includes("pend")).length,
                  tone: "warning",
                }
              : null,
            canOrdenes
              ? {
                  label: "Ordenes validadas",
                  value: ordItems.filter((o) => lower(o.estadoOrden).includes("valid")).length,
                  tone: "success",
                }
              : null,
            canMaquinaria
              ? {
                  label: "Maquinaria activa",
                  value: maqItems.filter((m) => m.activa).length,
                  tone: "info",
                }
              : null,
            canMantenimiento
              ? {
                  label: "Mantenimientos pendientes",
                  value: mantItems.filter((m) => lower(m.estadoMantenimiento).includes("pend"))
                    .length,
                  tone: "warning",
                }
              : null,
            canEstiba
              ? {
                  label: "Citaciones proximas",
                  value: citItems.filter((c) => new Date(c.fecha) >= new Date()).length,
                  tone: "info",
                }
              : null,
            canAdministracion
              ? {
                  label: "Tareas pendientes",
                  value: tarItems.filter(
                    (t) =>
                      !lower(t.estadoTarea).includes("complet") &&
                      !lower(t.estadoTarea).includes("finaliz"),
                  ).length,
                  tone: "warning",
                }
              : null,
          ] as Array<Card | null>
        ).filter((card): card is Card => card !== null),
        ordenes: ordItems.slice(0, 6),
        tareas: tarItems.slice(0, 6),
        warnings,
      });
    })().catch(() =>
      setData({
        cards: [],
        ordenes: [],
        tareas: [],
        warnings: ["No se pudo cargar el resumen operativo."],
      }),
    );
  }, [usuario?.rol]);

  return (
    <div>
      <PageHeader
        title={`Hola, ${usuario?.nombre ?? ""}`}
        description={`Resumen operativo - ${usuario?.empresa ?? ""}`}
      />
      {!data ? (
        <LoadingBlock />
      ) : (
        <div className="grid gap-5">
          {data.warnings.length > 0 && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
              {data.warnings.join(" ")}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.cards.map((c) => (
              <div key={c.label} className="rounded-lg border border-border bg-card p-5 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {c.label}
                </div>
                <div
                  className={`mt-2 text-3xl font-bold ${c.tone === "success" ? "text-success" : c.tone === "warning" ? "text-warning" : "text-primary"}`}
                >
                  {c.value}
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            {canOrdenesView && (
              <section className="rounded-lg border border-border bg-card shadow-sm">
                <div className="border-b border-border px-4 py-3">
                  <h2 className="text-sm font-semibold text-foreground">Ordenes recientes</h2>
                </div>
                <div className="divide-y divide-border">
                  {data.ordenes.length === 0 ? (
                    <EmptyLine text="No hay ordenes para mostrar." />
                  ) : (
                    data.ordenes.map((orden) => (
                      <div
                        key={orden.idOrdenServicio}
                        className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_auto]"
                      >
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            #{orden.idOrdenServicio} - {orden.cliente ?? "Sin cliente"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {orden.lugarServicio ?? "Sin lugar"} -{" "}
                            {orden.operario ?? "Sin operario"}
                          </div>
                        </div>
                        <StatusBadge>{orden.estadoOrden}</StatusBadge>
                      </div>
                    ))
                  )}
                </div>
              </section>
            )}

            {canAdministracionView && (
              <section className="rounded-lg border border-border bg-card shadow-sm">
                <div className="border-b border-border px-4 py-3">
                  <h2 className="text-sm font-semibold text-foreground">Tareas administrativas</h2>
                </div>
                <div className="divide-y divide-border">
                  {data.tareas.length === 0 ? (
                    <EmptyLine text="No hay tareas para mostrar." />
                  ) : (
                    data.tareas.map((tarea) => (
                      <div
                        key={tarea.idTarea}
                        className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_auto]"
                      >
                        <div>
                          <div className="text-sm font-medium text-foreground">{tarea.titulo}</div>
                          <div className="text-xs text-muted-foreground">
                            {tarea.asignado ?? "Sin asignar"} -{" "}
                            {tarea.fechaVencimiento?.slice(0, 10) ?? "Sin vencimiento"}
                          </div>
                        </div>
                        <StatusBadge>{tarea.estadoTarea}</StatusBadge>
                      </div>
                    ))
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <div className="px-4 py-5 text-sm text-muted-foreground">{text}</div>;
}
