import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { CheckCircle2, Edit, Eye, FileText, Plus, Power, Wrench } from "lucide-react";
import { extractErrorMessage } from "@/api/client";
import {
  administracionApi,
  clientesApi,
  empresasApi,
  estibaApi,
  mantenimientoApi,
  maquinariasApi,
  notificacionesApi,
  ordenesApi,
  trazabilidadApi,
  usuariosApi,
} from "@/api/services";
import { Button } from "@/components/common/Button";
import { Field, SelectInput, TextInput, TextareaInput } from "@/components/common/Input";
import { Modal } from "@/components/common/Modal";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/Badge";
import { useAuth } from "@/auth/AuthContext";
import { useToast } from "@/components/common/Toast";
import { usePagedQuery } from "@/hooks/usePagedQuery";
import type {
  CitacionEstiba,
  Cliente,
  Cuadrilla,
  Empresa,
  EstadoCitacion,
  EstadoMantenimiento,
  EstadoOrdenItem,
  EstadoTarea,
  EventoCalendario,
  LiquidacionEstiba,
  Maquinaria,
  Mantenimiento,
  Notificacion,
  OrdenServicio,
  PagedResponse,
  PersonalEstiba,
  Rol,
  TareaAdministrativa,
  TipoMantenimiento,
  TipoMaquinaria,
  Trazabilidad,
  Usuario,
} from "@/types";

type PageParams = { pageNumber: number; pageSize: number };
type OnSaved = () => void;
type FormErrors = Record<string, string>;

function ModuleShell<T>({
  title,
  description,
  fetcher,
  columns,
  rowKey,
  deps = [],
  actions,
  rowActions,
  filters,
  localFilter,
}: {
  title: string;
  description?: string;
  fetcher: (p: PageParams) => Promise<PagedResponse<T>>;
  columns: Column<T>[];
  rowKey: (row: T) => string | number;
  deps?: unknown[];
  actions?: (reload: () => Promise<void>) => ReactNode;
  rowActions?: (row: T, reload: () => Promise<void>) => ReactNode;
  filters?: ReactNode;
  localFilter?: (row: T) => boolean;
}) {
  const memoFetch = useMemo(() => fetcher, [fetcher]);
  const { data, loading, error, pageNumber, setPageNumber, reload } = usePagedQuery<T>(
    memoFetch,
    deps,
  );
  const filteredRows = localFilter && data ? data.items.filter(localFilter) : undefined;

  return (
    <div>
      <PageHeader title={title} description={description} actions={actions?.(reload)} />
      {filters && (
        <div className="mb-4 rounded-lg border border-border bg-card p-4 shadow-sm">{filters}</div>
      )}
      <DataTable<T>
        columns={columns}
        data={data}
        rows={filteredRows}
        loading={loading}
        error={error}
        rowKey={rowKey}
        pageNumber={pageNumber}
        onPageChange={setPageNumber}
        actions={rowActions ? (row) => rowActions(row, reload) : undefined}
      />
    </div>
  );
}

function formValue(value: FormDataEntryValue | null) {
  const text = value?.toString().trim() ?? "";
  return text.length > 0 ? text : undefined;
}

function requiredValue(value: FormDataEntryValue | null) {
  return value?.toString().trim() ?? "";
}

function validateRequired(errors: FormErrors, key: string, value: FormDataEntryValue | null) {
  if (!requiredValue(value)) errors[key] = "Este campo es obligatorio.";
}

function validateEmail(errors: FormErrors, key: string, value: FormDataEntryValue | null) {
  const email = formValue(value);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors[key] = "Ingresa un correo valido.";
  }
}

function validateMinLength(
  errors: FormErrors,
  key: string,
  value: FormDataEntryValue | null,
  min: number,
) {
  const text = requiredValue(value);
  if (text && text.length < min) errors[key] = `Debe tener al menos ${min} caracteres.`;
}

function validatePositiveNumber(errors: FormErrors, key: string, value: FormDataEntryValue | null) {
  const text = formValue(value);
  if (text && Number(text) <= 0) errors[key] = "Debe ser mayor a cero.";
}

function validateNonNegativeNumber(
  errors: FormErrors,
  key: string,
  value: FormDataEntryValue | null,
) {
  const text = formValue(value);
  if (text && Number(text) < 0) errors[key] = "No puede ser negativo.";
}

function normalizeText(value?: string | number | null) {
  return String(value ?? "").toLowerCase();
}

function textIncludes(value: string | number | null | undefined, query: string) {
  return normalizeText(value).includes(normalizeText(query));
}

function numberValue(value: FormDataEntryValue | null) {
  const text = formValue(value);
  return text ? Number(text) : undefined;
}

function boolValue(value: FormDataEntryValue | null) {
  return value === "true";
}

function dateTimeValue(value: FormDataEntryValue | null) {
  const text = formValue(value);
  return text ? new Date(text).toISOString() : undefined;
}

function toDateInput(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function toDateTimeInput(value?: string | null) {
  return value ? value.slice(0, 16) : "";
}

function toTimeInput(value?: string | null) {
  return value ? value.slice(0, 5) : "";
}

function timeOnlyValue(value: FormDataEntryValue | null) {
  const text = formValue(value);
  if (!text) return undefined;
  return text.length === 5 ? `${text}:00` : text;
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-UY", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function parseJsonValue(value?: string | null): JsonValue | string | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as JsonValue;
  } catch {
    return value;
  }
}

function isJsonRecord(value: JsonValue | string | null): value is { [key: string]: JsonValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function humanizeJsonKey(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^Id\b/i, "ID")
    .trim();
}

function isIsoDateLike(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value);
}

function renderJsonValue(value: JsonValue): ReactNode {
  if (value === null) return <span className="text-muted-foreground">Sin valor</span>;

  if (typeof value === "boolean") {
    return <StatusBadge variant={value ? "activo" : "inactivo"}>{value ? "Si" : "No"}</StatusBadge>;
  }

  if (typeof value === "number") return String(value);

  if (typeof value === "string") {
    if (!value.trim()) return <span className="text-muted-foreground">Sin valor</span>;
    return isIsoDateLike(value) ? formatDateTime(value) : value;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground">Sin elementos</span>;
    return (
      <ul className="space-y-1">
        {value.map((item, index) => (
          <li key={`${index}-${JSON.stringify(item)}`} className="rounded-md bg-muted/70 px-2 py-1">
            {renderJsonValue(item)}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-2">
      {Object.entries(value).map(([key, nestedValue]) => (
        <div key={key} className="rounded-md bg-muted/70 px-3 py-2">
          <div className="mb-1 text-xs font-semibold text-muted-foreground">
            {humanizeJsonKey(key)}
          </div>
          <div className="break-words">{renderJsonValue(nestedValue)}</div>
        </div>
      ))}
    </div>
  );
}

function JsonAuditPanel({ title, value }: { title: string; value?: string | null }) {
  const parsed = parseJsonValue(value);

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-muted/40 px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="max-h-[28rem] overflow-auto">
        {parsed === null ? (
          <div className="px-4 py-6 text-sm text-muted-foreground">Sin datos registrados.</div>
        ) : isJsonRecord(parsed) ? (
          <dl className="divide-y divide-border">
            {Object.entries(parsed).map(([key, fieldValue]) => (
              <div key={key} className="grid gap-2 px-4 py-3 sm:grid-cols-[11rem_minmax(0,1fr)]">
                <dt className="text-xs font-semibold uppercase text-muted-foreground">
                  {humanizeJsonKey(key)}
                </dt>
                <dd className="min-w-0 break-words text-sm text-foreground">
                  {renderJsonValue(fieldValue)}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <div className="whitespace-pre-wrap break-words px-4 py-3 text-sm text-foreground">
            {renderJsonValue(parsed)}
          </div>
        )}
      </div>
    </section>
  );
}

function orderState(value?: string | null) {
  return (value ?? "").toLowerCase();
}

function isClosedOrder(value?: string | null) {
  const state = orderState(value);
  return state.includes("factur") || state.includes("cancel");
}

function isFinishedOrder(value?: string | null) {
  const state = orderState(value);
  return state.includes("final") || state.includes("valid") || state.includes("factur");
}

function EntityActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap justify-end gap-2">{children}</div>;
}

function puedeAsignarTarea(rolActual: string | undefined, rolAsignado: string | undefined) {
  if (!rolActual || !rolAsignado) return false;
  if (rolActual === "Administrador") return true;
  if (rolActual === "Oficina") {
    return ["Administrador", "Oficina", "Encargado"].includes(rolAsignado);
  }
  if (rolActual === "Encargado") {
    return ["Oficina", "Encargado", "Operario"].includes(rolAsignado);
  }
  return false;
}

function defaultEmpresaId(empresas: Empresa[], current?: number | null) {
  return current ?? empresas[0]?.idEmpresa ?? "";
}

function useReferenceData(open: boolean) {
  const toast = useToast();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [maquinarias, setMaquinarias] = useState<Maquinaria[]>([]);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      empresasApi.list({ pageSize: 100 }),
      clientesApi.list({ pageSize: 100 }),
      usuariosApi.list({ pageSize: 100 }),
      maquinariasApi.list({ pageSize: 100 }),
    ])
      .then(([empresasRes, clientesRes, usuariosRes, maquinariasRes]) => {
        setEmpresas(empresasRes.items);
        setClientes(clientesRes.items);
        setUsuarios(usuariosRes.items);
        setMaquinarias(maquinariasRes.items);
      })
      .catch((error) => toast.error(extractErrorMessage(error)));
  }, [open, toast]);

  return { empresas, clientes, usuarios, maquinarias };
}

// EMPRESAS
export function EmpresasPage() {
  const [editing, setEditing] = useState<Empresa | null>(null);
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <ModuleShell<Empresa>
        title="Empresas"
        description="Empresas operativas del sistema"
        fetcher={(p) => empresasApi.list(p)}
        rowKey={(r) => r.idEmpresa}
        deps={[refreshKey]}
        actions={() => (
          <Button
            size="sm"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            Nueva empresa
          </Button>
        )}
        rowActions={(row) => (
          <Button
            size="sm"
            variant="outline"
            icon={<Edit className="h-4 w-4" />}
            onClick={() => {
              setEditing(row);
              setOpen(true);
            }}
          >
            Editar
          </Button>
        )}
        columns={[
          { key: "nombre", header: "Nombre" },
          { key: "razonSocial", header: "Razon social" },
          { key: "rut", header: "RUT" },
          { key: "tipoEmpresa", header: "Tipo" },
          {
            key: "activa",
            header: "Estado",
            render: (r) => <StatusBadge>{r.activa ? "Activa" : "Inactiva"}</StatusBadge>,
          },
        ]}
      />
      <EmpresaFormModal
        open={open}
        empresa={editing}
        onClose={() => setOpen(false)}
        onSaved={() => setRefreshKey((key) => key + 1)}
      />
    </>
  );
}

function EmpresaFormModal({
  open,
  empresa,
  onClose,
  onSaved,
}: {
  open: boolean;
  empresa: Empresa | null;
  onClose: () => void;
  onSaved: OnSaved;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const { empresas } = useReferenceData(open);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const errors: FormErrors = {};
    validateRequired(errors, "nombre", form.get("nombre"));
    validateRequired(errors, "razonSocial", form.get("razonSocial"));
    validateRequired(errors, "rut", form.get("rut"));
    validateRequired(errors, "tipoEmpresa", form.get("tipoEmpresa"));
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const payload = {
      nombre: requiredValue(form.get("nombre")),
      razonSocial: requiredValue(form.get("razonSocial")),
      rut: requiredValue(form.get("rut")),
      tipoEmpresa: requiredValue(form.get("tipoEmpresa")),
      activa: boolValue(form.get("activa")),
    };

    setSaving(true);
    try {
      if (empresa) {
        await empresasApi.update(empresa.idEmpresa, payload);
        toast.success("Empresa actualizada.");
      } else {
        await empresasApi.create(payload);
        toast.success("Empresa creada.");
      }
      onClose();
      onSaved();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={empresa ? "Editar empresa" : "Nueva empresa"}>
      <form className="grid gap-4" onSubmit={submit}>
        <Field label="Nombre" required error={formErrors.nombre}>
          <TextInput name="nombre" defaultValue={empresa?.nombre ?? ""} required maxLength={120} />
        </Field>
        <Field label="Razon social" required error={formErrors.razonSocial}>
          <TextInput
            name="razonSocial"
            defaultValue={empresa?.razonSocial ?? ""}
            required
            maxLength={160}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="RUT" required error={formErrors.rut}>
            <TextInput name="rut" defaultValue={empresa?.rut ?? ""} required maxLength={30} />
          </Field>
          <Field label="Tipo" required error={formErrors.tipoEmpresa}>
            <TextInput
              name="tipoEmpresa"
              defaultValue={empresa?.tipoEmpresa ?? ""}
              required
              maxLength={80}
            />
          </Field>
        </div>
        {empresa && (
          <Field label="Estado">
            <SelectInput name="activa" defaultValue={empresa.activa ? "true" : "false"}>
              <option value="true">Activa</option>
              <option value="false">Inactiva</option>
            </SelectInput>
          </Field>
        )}
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

// USUARIOS
export function UsuariosPage() {
  const toast = useToast();
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <ModuleShell<Usuario>
        title="Usuarios"
        description="Gestion de usuarios del sistema"
        fetcher={(p) => usuariosApi.list(p)}
        rowKey={(r) => r.idUsuario}
        deps={[refreshKey]}
        actions={() => (
          <Button
            size="sm"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            Nuevo usuario
          </Button>
        )}
        rowActions={(row, reload) => (
          <EntityActions>
            <Button
              size="sm"
              variant="outline"
              icon={<Edit className="h-4 w-4" />}
              onClick={() => {
                setEditing(row);
                setOpen(true);
              }}
            >
              Editar
            </Button>
            <Button
              size="sm"
              variant={row.activo ? "danger" : "success"}
              icon={<Power className="h-4 w-4" />}
              onClick={async () => {
                if (
                  !confirm(
                    `Seguro que queres ${row.activo ? "desactivar" : "activar"} este usuario?`,
                  )
                ) {
                  return;
                }
                try {
                  await usuariosApi.setActivo(row.idUsuario, !row.activo);
                  toast.success("Estado del usuario actualizado.");
                  await reload();
                } catch (error) {
                  toast.error(extractErrorMessage(error));
                }
              }}
            >
              {row.activo ? "Desactivar" : "Activar"}
            </Button>
          </EntityActions>
        )}
        columns={[
          { key: "nombre", header: "Nombre", render: (r) => `${r.nombre} ${r.apellido}` },
          { key: "correo", header: "Correo" },
          { key: "rol", header: "Rol" },
          { key: "empresa", header: "Empresa" },
          {
            key: "activo",
            header: "Estado",
            render: (r) => <StatusBadge>{r.activo ? "Activo" : "Inactivo"}</StatusBadge>,
          },
        ]}
      />
      <UsuarioFormModal
        open={open}
        usuario={editing}
        onClose={() => setOpen(false)}
        onSaved={() => setRefreshKey((key) => key + 1)}
      />
    </>
  );
}

function UsuarioFormModal({
  open,
  usuario,
  onClose,
  onSaved,
}: {
  open: boolean;
  usuario: Usuario | null;
  onClose: () => void;
  onSaved: OnSaved;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (!open) return;
    Promise.all([empresasApi.list({ pageSize: 100 }), usuariosApi.roles()])
      .then(([empresasRes, rolesRes]) => {
        setEmpresas(empresasRes.items);
        setRoles(rolesRes);
      })
      .catch((error) => toast.error(extractErrorMessage(error)));
  }, [open, toast]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const errors: FormErrors = {};
    validateRequired(errors, "idEmpresa", form.get("idEmpresa"));
    validateRequired(errors, "idRol", form.get("idRol"));
    validateRequired(errors, "cedula", form.get("cedula"));
    validateRequired(errors, "nombre", form.get("nombre"));
    validateRequired(errors, "apellido", form.get("apellido"));
    validateRequired(errors, "correo", form.get("correo"));
    validateEmail(errors, "correo", form.get("correo"));
    if (!usuario) {
      validateRequired(errors, "password", form.get("password"));
      validateMinLength(errors, "password", form.get("password"), 6);
    }
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const basePayload = {
      idEmpresa: Number(requiredValue(form.get("idEmpresa"))),
      idRol: Number(requiredValue(form.get("idRol"))),
      cedula: requiredValue(form.get("cedula")),
      nombre: requiredValue(form.get("nombre")),
      apellido: requiredValue(form.get("apellido")),
      correo: requiredValue(form.get("correo")),
      telefono: formValue(form.get("telefono")),
      activo: boolValue(form.get("activo")),
    };

    setSaving(true);
    try {
      if (usuario) {
        await usuariosApi.update(usuario.idUsuario, basePayload);
        toast.success("Usuario actualizado.");
      } else {
        await usuariosApi.create({
          ...basePayload,
          password: requiredValue(form.get("password")),
        });
        toast.success("Usuario creado.");
      }
      onClose();
      onSaved();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={usuario ? "Editar usuario" : "Nuevo usuario"}
      size="lg"
    >
      <form className="grid gap-4" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Empresa" required error={formErrors.idEmpresa}>
            <SelectInput
              name="idEmpresa"
              defaultValue={defaultEmpresaId(empresas, usuario?.idEmpresa)}
              required
            >
              <option value="" disabled>
                Seleccionar empresa
              </option>
              {empresas.map((empresa) => (
                <option key={empresa.idEmpresa} value={empresa.idEmpresa}>
                  {empresa.nombre}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Rol" required error={formErrors.idRol}>
            <SelectInput name="idRol" defaultValue={usuario?.idRol ?? ""} required>
              <option value="" disabled>
                Seleccionar rol
              </option>
              {roles.map((rol) => (
                <option key={rol.idRol} value={rol.idRol}>
                  {rol.nombre}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Cedula" required error={formErrors.cedula}>
            <TextInput name="cedula" defaultValue={usuario?.cedula ?? ""} required maxLength={30} />
          </Field>
          <Field label="Nombre" required error={formErrors.nombre}>
            <TextInput
              name="nombre"
              defaultValue={usuario?.nombre ?? ""}
              required
              maxLength={100}
            />
          </Field>
          <Field label="Apellido" required error={formErrors.apellido}>
            <TextInput
              name="apellido"
              defaultValue={usuario?.apellido ?? ""}
              required
              maxLength={100}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Correo" required error={formErrors.correo}>
            <TextInput
              name="correo"
              type="email"
              defaultValue={usuario?.correo ?? ""}
              required
              maxLength={180}
            />
          </Field>
          <Field label="Telefono">
            <TextInput name="telefono" defaultValue={usuario?.telefono ?? ""} maxLength={50} />
          </Field>
        </div>
        {!usuario && (
          <Field
            label="Contrasena"
            required
            hint="Minimo 6 caracteres."
            error={formErrors.password}
          >
            <TextInput name="password" type="password" required minLength={6} maxLength={100} />
          </Field>
        )}
        {usuario && (
          <Field label="Estado">
            <SelectInput name="activo" defaultValue={usuario.activo ? "true" : "false"}>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </SelectInput>
          </Field>
        )}
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

// CLIENTES
export function ClientesPage() {
  const { hasRole } = useAuth();
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const canWrite = hasRole("Administrador", "Oficina");

  return (
    <>
      <ModuleShell<Cliente>
        title="Clientes"
        description="Clientes comerciales y contactos operativos"
        fetcher={(p) => clientesApi.list(p)}
        rowKey={(r) => r.idCliente}
        deps={[refreshKey]}
        filters={
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Field label="Buscar cliente">
              <TextInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Razon social, RUT o contacto"
              />
            </Field>
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setSearch("")}
              >
                Limpiar
              </Button>
            </div>
          </div>
        }
        localFilter={(row) =>
          !search ||
          textIncludes(row.razonSocial, search) ||
          textIncludes(row.rut, search) ||
          textIncludes(row.nombreContacto, search)
        }
        actions={() =>
          canWrite ? (
            <Button
              size="sm"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              Nuevo cliente
            </Button>
          ) : null
        }
        rowActions={
          canWrite
            ? (row) => (
                <Button
                  size="sm"
                  variant="outline"
                  icon={<Edit className="h-4 w-4" />}
                  onClick={() => {
                    setEditing(row);
                    setOpen(true);
                  }}
                >
                  Editar
                </Button>
              )
            : undefined
        }
        columns={[
          { key: "razonSocial", header: "Razon social" },
          { key: "rut", header: "RUT" },
          { key: "nombreContacto", header: "Contacto" },
          { key: "correo", header: "Correo" },
          { key: "telefono", header: "Telefono" },
          {
            key: "activo",
            header: "Estado",
            render: (r) => <StatusBadge>{r.activo ? "Activo" : "Inactivo"}</StatusBadge>,
          },
        ]}
      />
      <ClienteFormModal
        open={open}
        cliente={editing}
        onClose={() => setOpen(false)}
        onSaved={() => setRefreshKey((key) => key + 1)}
      />
    </>
  );
}

function ClienteFormModal({
  open,
  cliente,
  onClose,
  onSaved,
}: {
  open: boolean;
  cliente: Cliente | null;
  onClose: () => void;
  onSaved: OnSaved;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const { empresas } = useReferenceData(open);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const errors: FormErrors = {};
    validateRequired(errors, "idEmpresa", form.get("idEmpresa"));
    validateRequired(errors, "razonSocial", form.get("razonSocial"));
    validateRequired(errors, "rut", form.get("rut"));
    validateEmail(errors, "correo", form.get("correo"));
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const payload = {
      idEmpresa: Number(requiredValue(form.get("idEmpresa"))),
      razonSocial: requiredValue(form.get("razonSocial")),
      rut: requiredValue(form.get("rut")),
      nombreContacto: formValue(form.get("nombreContacto")),
      correo: formValue(form.get("correo")),
      telefono: formValue(form.get("telefono")),
      direccion: formValue(form.get("direccion")),
      activo: boolValue(form.get("activo")),
    };

    setSaving(true);
    try {
      if (cliente) {
        await clientesApi.update(cliente.idCliente, payload);
        toast.success("Cliente actualizado.");
      } else {
        await clientesApi.create(payload);
        toast.success("Cliente creado.");
      }
      onClose();
      onSaved();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={cliente ? "Editar cliente" : "Nuevo cliente"}
      size="lg"
    >
      <form className="grid gap-4" onSubmit={submit}>
        <Field label="Empresa" required error={formErrors.idEmpresa}>
          <SelectInput
            name="idEmpresa"
            defaultValue={defaultEmpresaId(empresas, cliente?.idEmpresa)}
            required
          >
            <option value="" disabled>
              Seleccionar empresa
            </option>
            {empresas.map((empresa) => (
              <option key={empresa.idEmpresa} value={empresa.idEmpresa}>
                {empresa.nombre}
              </option>
            ))}
          </SelectInput>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Razon social" required error={formErrors.razonSocial}>
            <TextInput
              name="razonSocial"
              defaultValue={cliente?.razonSocial ?? ""}
              required
              maxLength={160}
            />
          </Field>
          <Field label="RUT" required error={formErrors.rut}>
            <TextInput name="rut" defaultValue={cliente?.rut ?? ""} required maxLength={30} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Contacto">
            <TextInput
              name="nombreContacto"
              defaultValue={cliente?.nombreContacto ?? ""}
              maxLength={140}
            />
          </Field>
          <Field label="Correo" error={formErrors.correo}>
            <TextInput
              name="correo"
              type="email"
              defaultValue={cliente?.correo ?? ""}
              maxLength={180}
            />
          </Field>
          <Field label="Telefono">
            <TextInput name="telefono" defaultValue={cliente?.telefono ?? ""} maxLength={50} />
          </Field>
        </div>
        <Field label="Direccion">
          <TextareaInput name="direccion" defaultValue={cliente?.direccion ?? ""} maxLength={250} />
        </Field>
        {cliente && (
          <Field label="Estado">
            <SelectInput name="activo" defaultValue={cliente.activo ? "true" : "false"}>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </SelectInput>
          </Field>
        )}
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

// ORDENES
export function OrdenesPage() {
  const { hasRole } = useAuth();
  const [editing, setEditing] = useState<OrdenServicio | null>(null);
  const [selected, setSelected] = useState<OrdenServicio | null>(null);
  const [finalizing, setFinalizing] = useState<OrdenServicio | null>(null);
  const [billing, setBilling] = useState<OrdenServicio | null>(null);
  const [hoursOrder, setHoursOrder] = useState<OrdenServicio | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("");
  const [encargadoFilter, setEncargadoFilter] = useState("");
  const [operarioFilter, setOperarioFilter] = useState("");
  const canCreateEdit = hasRole("Administrador", "Encargado");
  const canFinalize = hasRole("Administrador", "Encargado", "Operario");
  const canBill = hasRole("Administrador", "Oficina");
  const isOperario = hasRole("Operario");
  const isOficina = hasRole("Oficina");
  const clearFilters = () => {
    setSearch("");
    setEstadoFilter("");
    setEncargadoFilter("");
    setOperarioFilter("");
  };

  return (
    <>
      <ModuleShell<OrdenServicio>
        title="Ordenes de servicio"
        description={
          isOperario
            ? "Consulta de ordenes asignadas, registro de horas y finalizacion"
            : isOficina
              ? "Consulta de ordenes y registro de facturacion"
              : "Alta, seguimiento, finalizacion y facturacion"
        }
        fetcher={(p) => ordenesApi.list(p)}
        rowKey={(r) => r.idOrdenServicio}
        deps={[refreshKey]}
        filters={
          <div
            className={
              isOperario
                ? "grid gap-3 lg:grid-cols-[1.5fr_1fr_auto]"
                : "grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto]"
            }
          >
            <Field label="Buscar">
              <TextInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cliente, lugar o maquinaria"
              />
            </Field>
            <Field label="Estado">
              <TextInput
                value={estadoFilter}
                onChange={(event) => setEstadoFilter(event.target.value)}
                placeholder="Ej: Asignada"
              />
            </Field>
            {!isOperario && (
              <>
                <Field label="Encargado">
                  <TextInput
                    value={encargadoFilter}
                    onChange={(event) => setEncargadoFilter(event.target.value)}
                    placeholder="Nombre"
                  />
                </Field>
                <Field label="Operario">
                  <TextInput
                    value={operarioFilter}
                    onChange={(event) => setOperarioFilter(event.target.value)}
                    placeholder="Nombre"
                  />
                </Field>
              </>
            )}
            <div className="flex items-end">
              <Button type="button" variant="outline" className="w-full" onClick={clearFilters}>
                Limpiar
              </Button>
            </div>
          </div>
        }
        localFilter={(row) => {
          const matchesSearch =
            !search ||
            textIncludes(row.cliente, search) ||
            textIncludes(row.lugarServicio, search) ||
            textIncludes(row.maquinariaAsignada, search) ||
            textIncludes(row.maquinariaFacturada, search);
          const matchesEstado = !estadoFilter || textIncludes(row.estadoOrden, estadoFilter);
          const matchesEncargado = !encargadoFilter || textIncludes(row.encargado, encargadoFilter);
          const matchesOperario = !operarioFilter || textIncludes(row.operario, operarioFilter);
          return matchesSearch && matchesEstado && matchesEncargado && matchesOperario;
        }}
        actions={() =>
          canCreateEdit ? (
            <Button
              size="sm"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setEditing(null);
                setOpenForm(true);
              }}
            >
              Nueva orden
            </Button>
          ) : null
        }
        rowActions={(row) => (
          <EntityActions>
            <Button
              size="sm"
              variant="outline"
              icon={<Eye className="h-4 w-4" />}
              onClick={() => setSelected(row)}
            >
              Ver
            </Button>
            {canCreateEdit && !isClosedOrder(row.estadoOrden) && (
              <Button
                size="sm"
                variant="outline"
                icon={<Edit className="h-4 w-4" />}
                onClick={() => {
                  setEditing(row);
                  setOpenForm(true);
                }}
              >
                Editar
              </Button>
            )}
            {canFinalize && !isFinishedOrder(row.estadoOrden) && (
              <Button
                size="sm"
                variant="success"
                icon={<CheckCircle2 className="h-4 w-4" />}
                onClick={() => setFinalizing(row)}
              >
                Finalizar
              </Button>
            )}
            {isOperario && !isClosedOrder(row.estadoOrden) && (
              <Button
                size="sm"
                variant="secondary"
                icon={<Wrench className="h-4 w-4" />}
                onClick={() => setHoursOrder(row)}
              >
                Horas
              </Button>
            )}
            {canBill && !orderState(row.estadoOrden).includes("factur") && (
              <Button
                size="sm"
                variant="secondary"
                icon={<FileText className="h-4 w-4" />}
                onClick={() => setBilling(row)}
              >
                Facturar
              </Button>
            )}
          </EntityActions>
        )}
        columns={(
          [
            { key: "idOrdenServicio", header: "#" },
            { key: "cliente", header: "Cliente" },
            { key: "encargado", header: "Encargado" },
            isOperario ? null : { key: "operario", header: "Operario" },
            { key: "maquinariaAsignada", header: "Maquinaria" },
            { key: "lugarServicio", header: "Lugar" },
            {
              key: "fechaSolicitud",
              header: "Solicitud",
              render: (r: OrdenServicio) => formatDateTime(r.fechaSolicitud),
            },
            {
              key: "estadoOrden",
              header: "Estado",
              render: (r: OrdenServicio) => <StatusBadge>{r.estadoOrden}</StatusBadge>,
            },
          ] as Array<Column<OrdenServicio> | null>
        ).filter((column): column is Column<OrdenServicio> => column !== null)}
      />
      <OrdenDetalleModal orden={selected} onClose={() => setSelected(null)} />
      <OrdenFormModal
        open={openForm}
        orden={editing}
        onClose={() => setOpenForm(false)}
        onSaved={() => setRefreshKey((key) => key + 1)}
      />
      <FinalizarOrdenModal
        orden={finalizing}
        onClose={() => setFinalizing(null)}
        onSaved={() => setRefreshKey((key) => key + 1)}
      />
      <FacturacionOrdenModal
        orden={billing}
        onClose={() => setBilling(null)}
        onSaved={() => setRefreshKey((key) => key + 1)}
      />
      <RegistroHorasOrdenModal
        orden={hoursOrder}
        onClose={() => setHoursOrder(null)}
        onSaved={() => setRefreshKey((key) => key + 1)}
      />
    </>
  );
}

function OrdenDetalleModal({
  orden,
  onClose,
}: {
  orden: OrdenServicio | null;
  onClose: () => void;
}) {
  return (
    <Modal
      open={!!orden}
      onClose={onClose}
      title={orden ? `Orden #${orden.idOrdenServicio}` : "Detalle de orden"}
      description={orden?.cliente}
      size="xl"
    >
      {orden && (
        <div className="grid gap-5">
          <div className="grid gap-4 md:grid-cols-3">
            <DetailItem label="Estado" value={<StatusBadge>{orden.estadoOrden}</StatusBadge>} />
            <DetailItem label="Fecha solicitud" value={formatDateTime(orden.fechaSolicitud)} />
            <DetailItem label="Empresa" value={orden.empresa ?? "-"} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <DetailItem label="Cliente" value={orden.cliente ?? "-"} />
            <DetailItem label="Lugar" value={orden.lugarServicio ?? "-"} />
            <DetailItem label="Encargado" value={orden.encargado ?? "-"} />
            <DetailItem label="Operario" value={orden.operario ?? "-"} />
            <DetailItem label="Maquinaria asignada" value={orden.maquinariaAsignada ?? "-"} />
            <DetailItem label="Maquinaria facturada" value={orden.maquinariaFacturada ?? "-"} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <DetailItem label="Inicio estimado" value={formatDateTime(orden.horaInicioEstimada)} />
            <DetailItem label="Inicio real" value={formatDateTime(orden.horaInicioReal)} />
            <DetailItem label="Finalizacion" value={formatDateTime(orden.horaFinalizacion)} />
          </div>
          <DetailItem label="Trabajo a realizar" value={orden.trabajoARealizar ?? "-"} />
          <DetailItem label="Observaciones" value={orden.observaciones ?? "-"} />
          <div className="grid gap-4 md:grid-cols-3">
            <DetailItem label="Firma cliente" value={orden.requiereFirmaCliente ? "Si" : "No"} />
            <DetailItem label="Enviada cliente" value={orden.enviadaCliente ? "Si" : "No"} />
            <DetailItem label="Precargada GSoft" value={orden.precargadaGSoft ? "Si" : "No"} />
          </div>
        </div>
      )}
    </Modal>
  );
}

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm text-foreground">{value}</div>
    </div>
  );
}

function OrdenFormModal({
  open,
  orden,
  onClose,
  onSaved,
}: {
  open: boolean;
  orden: OrdenServicio | null;
  onClose: () => void;
  onSaved: OnSaved;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [estados, setEstados] = useState<EstadoOrdenItem[]>([]);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const { empresas, clientes, usuarios, maquinarias } = useReferenceData(open);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState("");
  const [selectedClienteId, setSelectedClienteId] = useState("");
  const [selectedEncargadoId, setSelectedEncargadoId] = useState("");
  const [selectedOperarioId, setSelectedOperarioId] = useState("");
  const [selectedMaquinariaAsignadaId, setSelectedMaquinariaAsignadaId] = useState("");
  const [selectedMaquinariaFacturadaId, setSelectedMaquinariaFacturadaId] = useState("");
  const selectedEmpresaNumber = Number(selectedEmpresaId) || null;
  const clientesOptions = selectedEmpresaNumber
    ? clientes.filter(
        (item) =>
          item.idEmpresa === selectedEmpresaNumber &&
          (item.activo || item.idCliente === orden?.idCliente),
      )
    : [];
  const usuariosEmpresa = selectedEmpresaNumber
    ? usuarios.filter(
        (item) =>
          item.idEmpresa === selectedEmpresaNumber &&
          (item.activo ||
            item.idUsuario === orden?.idEncargado ||
            item.idUsuario === orden?.idOperario),
      )
    : [];
  const encargados = usuariosEmpresa.filter((item) => item.rol === "Encargado");
  const operarios = usuariosEmpresa.filter((item) => item.rol === "Operario");
  const encargadosOptions = encargados.length > 0 ? encargados : usuariosEmpresa;
  const operariosOptions = operarios.length > 0 ? operarios : usuariosEmpresa;
  const maquinariasOptions = selectedEmpresaNumber
    ? maquinarias.filter(
        (item) =>
          item.idEmpresa === selectedEmpresaNumber &&
          (item.activa ||
            item.idMaquinaria === orden?.idMaquinariaAsignada ||
            item.idMaquinaria === orden?.idMaquinariaFacturada),
      )
    : [];

  useEffect(() => {
    if (!open) return;
    ordenesApi
      .estados()
      .then(setEstados)
      .catch((error) => toast.error(extractErrorMessage(error)));
  }, [open, toast]);

  useEffect(() => {
    if (!open) return;
    setSelectedEmpresaId(String(defaultEmpresaId(empresas, orden?.idEmpresa) || ""));
    setSelectedClienteId(orden?.idCliente ? String(orden.idCliente) : "");
    setSelectedEncargadoId(orden?.idEncargado ? String(orden.idEncargado) : "");
    setSelectedOperarioId(orden?.idOperario ? String(orden.idOperario) : "");
    setSelectedMaquinariaAsignadaId(
      orden?.idMaquinariaAsignada ? String(orden.idMaquinariaAsignada) : "",
    );
    setSelectedMaquinariaFacturadaId(
      orden?.idMaquinariaFacturada ? String(orden.idMaquinariaFacturada) : "",
    );
  }, [empresas, open, orden]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const errors: FormErrors = {};
    validateRequired(errors, "idEmpresa", form.get("idEmpresa"));
    validateRequired(errors, "idCliente", form.get("idCliente"));
    validateRequired(errors, "idEncargado", form.get("idEncargado"));
    validateRequired(errors, "idOperario", form.get("idOperario"));
    validateRequired(errors, "idMaquinariaAsignada", form.get("idMaquinariaAsignada"));
    validateRequired(errors, "idEstadoOrden", form.get("idEstadoOrden"));
    validateRequired(errors, "lugarServicio", form.get("lugarServicio"));
    validateRequired(errors, "trabajoARealizar", form.get("trabajoARealizar"));
    if (
      !errors.idCliente &&
      !clientesOptions.some((item) => String(item.idCliente) === selectedClienteId)
    ) {
      errors.idCliente = "Selecciona un cliente de la empresa elegida.";
    }
    if (
      !errors.idEncargado &&
      !encargadosOptions.some((item) => String(item.idUsuario) === selectedEncargadoId)
    ) {
      errors.idEncargado = "Selecciona un encargado de la empresa elegida.";
    }
    if (
      !errors.idOperario &&
      !operariosOptions.some((item) => String(item.idUsuario) === selectedOperarioId)
    ) {
      errors.idOperario = "Selecciona un operario de la empresa elegida.";
    }
    if (
      !errors.idMaquinariaAsignada &&
      !maquinariasOptions.some((item) => String(item.idMaquinaria) === selectedMaquinariaAsignadaId)
    ) {
      errors.idMaquinariaAsignada = "Selecciona maquinaria de la empresa elegida.";
    }
    if (
      selectedMaquinariaFacturadaId &&
      !maquinariasOptions.some(
        (item) => String(item.idMaquinaria) === selectedMaquinariaFacturadaId,
      )
    ) {
      errors.idMaquinariaFacturada = "Selecciona maquinaria de la empresa elegida.";
    }
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const payload = {
      idEmpresa: Number(requiredValue(form.get("idEmpresa"))),
      idCliente: Number(requiredValue(form.get("idCliente"))),
      idEncargado: Number(requiredValue(form.get("idEncargado"))),
      idOperario: Number(requiredValue(form.get("idOperario"))),
      idMaquinariaAsignada: Number(requiredValue(form.get("idMaquinariaAsignada"))),
      idMaquinariaFacturada: numberValue(form.get("idMaquinariaFacturada")),
      idEstadoOrden: Number(requiredValue(form.get("idEstadoOrden"))),
      lugarServicio: requiredValue(form.get("lugarServicio")),
      trabajoARealizar: requiredValue(form.get("trabajoARealizar")),
      horaInicioEstimada: dateTimeValue(form.get("horaInicioEstimada")),
      horaInicioReal: dateTimeValue(form.get("horaInicioReal")),
      horaFinalizacion: dateTimeValue(form.get("horaFinalizacion")),
      observaciones: formValue(form.get("observaciones")),
      requiereFirmaCliente: form.get("requiereFirmaCliente") === "on",
      enviadaCliente: form.get("enviadaCliente") === "on",
      precargadaGSoft: form.get("precargadaGSoft") === "on",
    };

    setSaving(true);
    try {
      if (orden) {
        await ordenesApi.update(orden.idOrdenServicio, payload);
        toast.success("Orden actualizada.");
      } else {
        const {
          horaInicioReal,
          horaFinalizacion,
          enviadaCliente,
          precargadaGSoft,
          ...createPayload
        } = payload;
        await ordenesApi.create(createPayload);
        toast.success("Orden creada.");
      }
      onClose();
      onSaved();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={orden ? "Editar orden" : "Nueva orden"} size="xl">
      <form className="grid gap-4" onSubmit={submit}>
        <Field label="Empresa" required error={formErrors.idEmpresa}>
          <SelectInput
            name="idEmpresa"
            value={selectedEmpresaId}
            onChange={(event) => {
              setSelectedEmpresaId(event.target.value);
              setSelectedClienteId("");
              setSelectedEncargadoId("");
              setSelectedOperarioId("");
              setSelectedMaquinariaAsignadaId("");
              setSelectedMaquinariaFacturadaId("");
            }}
            required
          >
            <option value="" disabled>
              Seleccionar empresa
            </option>
            {empresas.map((empresa) => (
              <option key={empresa.idEmpresa} value={empresa.idEmpresa}>
                {empresa.nombre}
              </option>
            ))}
          </SelectInput>
        </Field>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Cliente" required error={formErrors.idCliente}>
            <SelectInput
              name="idCliente"
              value={selectedClienteId}
              onChange={(event) => setSelectedClienteId(event.target.value)}
              disabled={!selectedEmpresaId}
              required
            >
              <option value="" disabled>
                {selectedEmpresaId ? "Seleccionar" : "Selecciona empresa primero"}
              </option>
              {clientesOptions.map((item) => (
                <option key={item.idCliente} value={item.idCliente}>
                  {item.razonSocial}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Estado" required error={formErrors.idEstadoOrden}>
            <SelectInput name="idEstadoOrden" defaultValue={orden?.idEstadoOrden ?? ""} required>
              <option value="" disabled>
                Seleccionar
              </option>
              {estados.map((item) => (
                <option key={item.idEstadoOrden} value={item.idEstadoOrden}>
                  {item.nombre}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Encargado" required error={formErrors.idEncargado}>
            <SelectInput
              name="idEncargado"
              value={selectedEncargadoId}
              onChange={(event) => setSelectedEncargadoId(event.target.value)}
              disabled={!selectedEmpresaId}
              required
            >
              <option value="" disabled>
                {selectedEmpresaId ? "Seleccionar" : "Selecciona empresa primero"}
              </option>
              {encargadosOptions.map((item) => (
                <option key={item.idUsuario} value={item.idUsuario}>
                  {item.nombre} {item.apellido} - {item.rol}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Operario" required error={formErrors.idOperario}>
            <SelectInput
              name="idOperario"
              value={selectedOperarioId}
              onChange={(event) => setSelectedOperarioId(event.target.value)}
              disabled={!selectedEmpresaId}
              required
            >
              <option value="" disabled>
                {selectedEmpresaId ? "Seleccionar" : "Selecciona empresa primero"}
              </option>
              {operariosOptions.map((item) => (
                <option key={item.idUsuario} value={item.idUsuario}>
                  {item.nombre} {item.apellido} - {item.rol}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Maquinaria asignada" required error={formErrors.idMaquinariaAsignada}>
            <SelectInput
              name="idMaquinariaAsignada"
              value={selectedMaquinariaAsignadaId}
              onChange={(event) => setSelectedMaquinariaAsignadaId(event.target.value)}
              disabled={!selectedEmpresaId}
              required
            >
              <option value="" disabled>
                {selectedEmpresaId ? "Seleccionar" : "Selecciona empresa primero"}
              </option>
              {maquinariasOptions.map((item) => (
                <option key={item.idMaquinaria} value={item.idMaquinaria}>
                  {item.codigo} - {item.nombre}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Maquinaria facturada" error={formErrors.idMaquinariaFacturada}>
            <SelectInput
              name="idMaquinariaFacturada"
              value={selectedMaquinariaFacturadaId}
              onChange={(event) => setSelectedMaquinariaFacturadaId(event.target.value)}
              disabled={!selectedEmpresaId}
            >
              <option value="">Sin maquinaria facturada</option>
              {maquinariasOptions.map((item) => (
                <option key={item.idMaquinaria} value={item.idMaquinaria}>
                  {item.codigo} - {item.nombre}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
        <Field label="Lugar de servicio" required error={formErrors.lugarServicio}>
          <TextInput
            name="lugarServicio"
            defaultValue={orden?.lugarServicio ?? ""}
            required
            maxLength={250}
          />
        </Field>
        <Field label="Trabajo a realizar" required error={formErrors.trabajoARealizar}>
          <TextareaInput
            name="trabajoARealizar"
            defaultValue={orden?.trabajoARealizar ?? ""}
            required
            maxLength={1000}
          />
        </Field>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Inicio estimado">
            <TextInput
              name="horaInicioEstimada"
              type="datetime-local"
              defaultValue={toDateTimeInput(orden?.horaInicioEstimada)}
            />
          </Field>
          {orden && (
            <>
              <Field label="Inicio real">
                <TextInput
                  name="horaInicioReal"
                  type="datetime-local"
                  defaultValue={toDateTimeInput(orden?.horaInicioReal)}
                />
              </Field>
              <Field label="Finalizacion">
                <TextInput
                  name="horaFinalizacion"
                  type="datetime-local"
                  defaultValue={toDateTimeInput(orden?.horaFinalizacion)}
                />
              </Field>
            </>
          )}
        </div>
        <Field label="Observaciones">
          <TextareaInput
            name="observaciones"
            defaultValue={orden?.observaciones ?? ""}
            maxLength={1000}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              name="requiereFirmaCliente"
              type="checkbox"
              defaultChecked={orden?.requiereFirmaCliente ?? false}
            />
            Requiere firma cliente
          </label>
          {orden && (
            <>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  name="enviadaCliente"
                  type="checkbox"
                  defaultChecked={orden.enviadaCliente}
                />
                Enviada a cliente
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  name="precargadaGSoft"
                  type="checkbox"
                  defaultChecked={orden.precargadaGSoft}
                />
                Precargada GSoft
              </label>
            </>
          )}
        </div>
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

function FinalizarOrdenModal({
  orden,
  onClose,
  onSaved,
}: {
  orden: OrdenServicio | null;
  onClose: () => void;
  onSaved: OnSaved;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!orden) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      await ordenesApi.finalizar(orden.idOrdenServicio, {
        horaFinalizacion: dateTimeValue(form.get("horaFinalizacion")) ?? new Date().toISOString(),
        observaciones: formValue(form.get("observaciones")),
      });
      toast.success("Orden finalizada.");
      onClose();
      onSaved();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={!!orden} onClose={onClose} title="Finalizar orden">
      <form className="grid gap-4" onSubmit={submit}>
        <Field label="Hora de finalizacion" required>
          <TextInput
            name="horaFinalizacion"
            type="datetime-local"
            required
            defaultValue={toDateTimeInput(new Date().toISOString())}
          />
        </Field>
        <Field label="Observaciones">
          <TextareaInput
            name="observaciones"
            defaultValue={orden?.observaciones ?? ""}
            maxLength={1000}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Finalizar
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function RegistroHorasOrdenModal({
  orden,
  onClose,
  onSaved,
}: {
  orden: OrdenServicio | null;
  onClose: () => void;
  onSaved: OnSaved;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!orden) return;
    const form = new FormData(event.currentTarget);
    const errors: FormErrors = {};
    validateRequired(errors, "fecha", form.get("fecha"));
    validateRequired(errors, "horasTrabajadas", form.get("horasTrabajadas"));
    validatePositiveNumber(errors, "horasTrabajadas", form.get("horasTrabajadas"));
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      await maquinariasApi.registrarHoras({
        idMaquinaria: orden.idMaquinariaAsignada,
        idOrdenServicio: orden.idOrdenServicio,
        fecha: requiredValue(form.get("fecha")),
        horasTrabajadas: Number(requiredValue(form.get("horasTrabajadas"))),
        observacion: formValue(form.get("observacion")),
      });
      toast.success("Horas registradas.");
      onClose();
      onSaved();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={!!orden}
      onClose={onClose}
      title="Registrar horas"
      description={orden ? `Orden #${orden.idOrdenServicio} - ${orden.maquinariaAsignada}` : ""}
    >
      <form className="grid gap-4" onSubmit={submit}>
        <Field label="Fecha" required error={formErrors.fecha}>
          <TextInput
            name="fecha"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </Field>
        <Field label="Horas trabajadas" required error={formErrors.horasTrabajadas}>
          <TextInput name="horasTrabajadas" type="number" step="0.01" min="0.01" required />
        </Field>
        <Field label="Observacion">
          <TextareaInput name="observacion" maxLength={500} />
        </Field>
        <div className="flex justify-end gap-2">
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

function FacturacionOrdenModal({
  orden,
  onClose,
  onSaved,
}: {
  orden: OrdenServicio | null;
  onClose: () => void;
  onSaved: OnSaved;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!orden) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      await ordenesApi.facturacion({
        idOrdenServicio: orden.idOrdenServicio,
        fechaEnvio: dateTimeValue(form.get("fechaEnvio")) ?? new Date().toISOString(),
        estado: requiredValue(form.get("estado")),
        referenciaGSoft: formValue(form.get("referenciaGSoft")),
        observaciones: formValue(form.get("observaciones")),
      });
      toast.success("Facturacion registrada.");
      onClose();
      onSaved();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={!!orden} onClose={onClose} title="Registrar facturacion">
      <form className="grid gap-4" onSubmit={submit}>
        <Field label="Fecha envio">
          <TextInput
            name="fechaEnvio"
            type="datetime-local"
            defaultValue={toDateTimeInput(new Date().toISOString())}
          />
        </Field>
        <Field label="Estado" required>
          <TextInput name="estado" defaultValue="Pendiente" required maxLength={80} />
        </Field>
        <Field label="Referencia GSoft">
          <TextInput name="referenciaGSoft" maxLength={120} />
        </Field>
        <Field label="Observaciones">
          <TextareaInput name="observaciones" maxLength={1000} />
        </Field>
        <div className="flex justify-end gap-2">
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

// MAQUINARIA
export function MaquinariasPage() {
  const { hasRole } = useAuth();
  const [editing, setEditing] = useState<Maquinaria | null>(null);
  const [hoursTarget, setHoursTarget] = useState<Maquinaria | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("");
  const canManageMaquinaria = hasRole("Administrador", "Encargado");

  return (
    <>
      <ModuleShell<Maquinaria>
        title="Maquinaria"
        description="Equipos, horas acumuladas y registro de horas"
        fetcher={(p) => maquinariasApi.list(p)}
        rowKey={(r) => r.idMaquinaria}
        deps={[refreshKey]}
        filters={
          <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
            <Field label="Buscar">
              <TextInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Codigo o nombre"
              />
            </Field>
            <Field label="Tipo">
              <TextInput
                value={tipoFilter}
                onChange={(event) => setTipoFilter(event.target.value)}
                placeholder="Tipo"
              />
            </Field>
            <Field label="Estado">
              <SelectInput
                value={estadoFilter}
                onChange={(event) => setEstadoFilter(event.target.value)}
              >
                <option value="">Todos</option>
                <option value="activa">Activa</option>
                <option value="inactiva">Inactiva</option>
              </SelectInput>
            </Field>
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSearch("");
                  setTipoFilter("");
                  setEstadoFilter("");
                }}
              >
                Limpiar
              </Button>
            </div>
          </div>
        }
        localFilter={(row) => {
          const matchesSearch =
            !search || textIncludes(row.codigo, search) || textIncludes(row.nombre, search);
          const matchesTipo = !tipoFilter || textIncludes(row.tipoMaquinaria, tipoFilter);
          const matchesEstado =
            !estadoFilter ||
            (estadoFilter === "activa" && row.activa) ||
            (estadoFilter === "inactiva" && !row.activa);
          return matchesSearch && matchesTipo && matchesEstado;
        }}
        actions={() =>
          canManageMaquinaria ? (
            <Button
              size="sm"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setEditing(null);
                setOpenForm(true);
              }}
            >
              Nueva maquinaria
            </Button>
          ) : null
        }
        rowActions={
          canManageMaquinaria
            ? (row) => (
                <EntityActions>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<Edit className="h-4 w-4" />}
                    onClick={() => {
                      setEditing(row);
                      setOpenForm(true);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Wrench className="h-4 w-4" />}
                    onClick={() => setHoursTarget(row)}
                  >
                    Horas
                  </Button>
                </EntityActions>
              )
            : undefined
        }
        columns={[
          { key: "codigo", header: "Codigo" },
          { key: "nombre", header: "Nombre" },
          { key: "tipoMaquinaria", header: "Tipo" },
          { key: "marca", header: "Marca" },
          { key: "modelo", header: "Modelo" },
          { key: "horasAcumuladas", header: "Horas" },
          {
            key: "activa",
            header: "Estado",
            render: (r) => <StatusBadge>{r.activa ? "Activa" : "Inactiva"}</StatusBadge>,
          },
        ]}
      />
      <MaquinariaFormModal
        open={openForm}
        maquinaria={editing}
        onClose={() => setOpenForm(false)}
        onSaved={() => setRefreshKey((key) => key + 1)}
      />
      <RegistroHorasModal
        maquinaria={hoursTarget}
        onClose={() => setHoursTarget(null)}
        onSaved={() => setRefreshKey((key) => key + 1)}
      />
    </>
  );
}

function MaquinariaFormModal({
  open,
  maquinaria,
  onClose,
  onSaved,
}: {
  open: boolean;
  maquinaria: Maquinaria | null;
  onClose: () => void;
  onSaved: OnSaved;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [tipos, setTipos] = useState<TipoMaquinaria[]>([]);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const { empresas } = useReferenceData(open);

  useEffect(() => {
    if (!open) return;
    maquinariasApi
      .tipos()
      .then(setTipos)
      .catch((error) => toast.error(extractErrorMessage(error)));
  }, [open, toast]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const errors: FormErrors = {};
    validateRequired(errors, "idEmpresa", form.get("idEmpresa"));
    validateRequired(errors, "idTipoMaquinaria", form.get("idTipoMaquinaria"));
    validateRequired(errors, "codigo", form.get("codigo"));
    validateRequired(errors, "nombre", form.get("nombre"));
    if (maquinaria) {
      validateNonNegativeNumber(errors, "horasAcumuladas", form.get("horasAcumuladas"));
    }
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const payload = {
      idEmpresa: Number(requiredValue(form.get("idEmpresa"))),
      idTipoMaquinaria: Number(requiredValue(form.get("idTipoMaquinaria"))),
      codigo: requiredValue(form.get("codigo")),
      nombre: requiredValue(form.get("nombre")),
      marca: formValue(form.get("marca")),
      modelo: formValue(form.get("modelo")),
      matricula: formValue(form.get("matricula")),
      horasAcumuladas: Number(formValue(form.get("horasAcumuladas")) ?? 0),
      activa: boolValue(form.get("activa")),
    };
    setSaving(true);
    try {
      if (maquinaria) {
        await maquinariasApi.update(maquinaria.idMaquinaria, payload);
        toast.success("Maquinaria actualizada.");
      } else {
        const { horasAcumuladas, activa, ...createPayload } = payload;
        await maquinariasApi.create(createPayload);
        toast.success("Maquinaria creada.");
      }
      onClose();
      onSaved();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={maquinaria ? "Editar maquinaria" : "Nueva maquinaria"}
      size="lg"
    >
      <form className="grid gap-4" onSubmit={submit}>
        <Field label="Empresa" required error={formErrors.idEmpresa}>
          <SelectInput
            name="idEmpresa"
            defaultValue={defaultEmpresaId(empresas, maquinaria?.idEmpresa)}
            required
          >
            <option value="" disabled>
              Seleccionar empresa
            </option>
            {empresas.map((empresa) => (
              <option key={empresa.idEmpresa} value={empresa.idEmpresa}>
                {empresa.nombre}
              </option>
            ))}
          </SelectInput>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo" required error={formErrors.idTipoMaquinaria}>
            <SelectInput
              name="idTipoMaquinaria"
              defaultValue={maquinaria?.idTipoMaquinaria ?? ""}
              required
            >
              <option value="" disabled>
                Seleccionar
              </option>
              {tipos.map((item) => (
                <option key={item.idTipoMaquinaria} value={item.idTipoMaquinaria}>
                  {item.nombre}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Codigo" required error={formErrors.codigo}>
            <TextInput
              name="codigo"
              defaultValue={maquinaria?.codigo ?? ""}
              required
              maxLength={60}
            />
          </Field>
          <Field label="Nombre" required error={formErrors.nombre}>
            <TextInput
              name="nombre"
              defaultValue={maquinaria?.nombre ?? ""}
              required
              maxLength={120}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Marca">
            <TextInput name="marca" defaultValue={maquinaria?.marca ?? ""} maxLength={100} />
          </Field>
          <Field label="Modelo">
            <TextInput name="modelo" defaultValue={maquinaria?.modelo ?? ""} maxLength={100} />
          </Field>
          <Field label="Matricula">
            <TextInput name="matricula" defaultValue={maquinaria?.matricula ?? ""} maxLength={80} />
          </Field>
        </div>
        {maquinaria && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Horas acumuladas" error={formErrors.horasAcumuladas}>
              <TextInput
                name="horasAcumuladas"
                type="number"
                step="0.01"
                defaultValue={maquinaria.horasAcumuladas}
              />
            </Field>
            <Field label="Estado">
              <SelectInput name="activa" defaultValue={maquinaria.activa ? "true" : "false"}>
                <option value="true">Activa</option>
                <option value="false">Inactiva</option>
              </SelectInput>
            </Field>
          </div>
        )}
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

function RegistroHorasModal({
  maquinaria,
  onClose,
  onSaved,
}: {
  maquinaria: Maquinaria | null;
  onClose: () => void;
  onSaved: OnSaved;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [ordenes, setOrdenes] = useState<OrdenServicio[]>([]);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const ordenesCompatibles = maquinaria
    ? ordenes.filter((item) => item.idEmpresa === maquinaria.idEmpresa)
    : [];

  useEffect(() => {
    if (!maquinaria) return;
    ordenesApi
      .list({ pageSize: 100 })
      .then((res) => setOrdenes(res.items))
      .catch((error) => toast.error(extractErrorMessage(error)));
  }, [maquinaria, toast]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!maquinaria) return;
    const form = new FormData(event.currentTarget);
    const errors: FormErrors = {};
    validateRequired(errors, "fecha", form.get("fecha"));
    validateRequired(errors, "horasTrabajadas", form.get("horasTrabajadas"));
    validatePositiveNumber(errors, "horasTrabajadas", form.get("horasTrabajadas"));
    const idOrdenServicio = formValue(form.get("idOrdenServicio"));
    if (
      idOrdenServicio &&
      !ordenesCompatibles.some((item) => String(item.idOrdenServicio) === idOrdenServicio)
    ) {
      errors.idOrdenServicio = "Selecciona una orden de la misma empresa que la maquinaria.";
    }
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      await maquinariasApi.registrarHoras({
        idMaquinaria: maquinaria.idMaquinaria,
        idOrdenServicio: numberValue(form.get("idOrdenServicio")),
        fecha: requiredValue(form.get("fecha")),
        horasTrabajadas: Number(requiredValue(form.get("horasTrabajadas"))),
        observacion: formValue(form.get("observacion")),
      });
      toast.success("Horas registradas.");
      onClose();
      onSaved();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={!!maquinaria} onClose={onClose} title="Registrar horas">
      <form className="grid gap-4" onSubmit={submit}>
        <Field label="Fecha" required error={formErrors.fecha}>
          <TextInput
            name="fecha"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </Field>
        <Field label="Horas trabajadas" required error={formErrors.horasTrabajadas}>
          <TextInput name="horasTrabajadas" type="number" step="0.01" min="0.01" required />
        </Field>
        <Field label="Orden asociada" error={formErrors.idOrdenServicio}>
          <SelectInput name="idOrdenServicio">
            <option value="">Sin orden asociada</option>
            {ordenesCompatibles.map((item) => (
              <option key={item.idOrdenServicio} value={item.idOrdenServicio}>
                #{item.idOrdenServicio} - {item.cliente}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Observacion">
          <TextareaInput name="observacion" maxLength={500} />
        </Field>
        <div className="flex justify-end gap-2">
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

// MANTENIMIENTO
export function MantenimientosPage() {
  const { hasRole } = useAuth();
  const [editing, setEditing] = useState<Mantenimiento | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [openTipo, setOpenTipo] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("");
  const [tipoFilter, setTipoFilter] = useState("");
  const [responsableFilter, setResponsableFilter] = useState("");
  const canManageMantenimiento = hasRole("Administrador", "Encargado");

  const clearFilters = () => {
    setSearch("");
    setEstadoFilter("");
    setTipoFilter("");
    setResponsableFilter("");
  };

  return (
    <>
      <ModuleShell<Mantenimiento>
        title="Mantenimientos"
        description="Programacion, ejecucion y tipos de mantenimiento"
        fetcher={(p) => mantenimientoApi.list(p)}
        rowKey={(r) => r.idMantenimiento}
        deps={[refreshKey]}
        filters={
          <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
            <Field label="Buscar">
              <TextInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Maquinaria o descripcion"
              />
            </Field>
            <Field label="Estado">
              <TextInput
                value={estadoFilter}
                onChange={(event) => setEstadoFilter(event.target.value)}
                placeholder="Estado"
              />
            </Field>
            <Field label="Tipo">
              <TextInput
                value={tipoFilter}
                onChange={(event) => setTipoFilter(event.target.value)}
                placeholder="Tipo"
              />
            </Field>
            <Field label="Responsable">
              <TextInput
                value={responsableFilter}
                onChange={(event) => setResponsableFilter(event.target.value)}
                placeholder="Responsable"
              />
            </Field>
            <div className="flex items-end">
              <Button type="button" variant="outline" className="w-full" onClick={clearFilters}>
                Limpiar
              </Button>
            </div>
          </div>
        }
        localFilter={(row) => {
          const matchesSearch =
            !search ||
            textIncludes(row.maquinaria, search) ||
            textIncludes(row.descripcion, search) ||
            textIncludes(row.observaciones, search);
          const matchesEstado =
            !estadoFilter || textIncludes(row.estadoMantenimiento, estadoFilter);
          const matchesTipo = !tipoFilter || textIncludes(row.tipoMantenimiento, tipoFilter);
          const matchesResponsable =
            !responsableFilter || textIncludes(row.responsable, responsableFilter);
          return matchesSearch && matchesEstado && matchesTipo && matchesResponsable;
        }}
        actions={() =>
          canManageMantenimiento ? (
            <EntityActions>
              <Button
                size="sm"
                icon={<Plus className="h-4 w-4" />}
                onClick={() => {
                  setEditing(null);
                  setOpenForm(true);
                }}
              >
                Nuevo mantenimiento
              </Button>
              {hasRole("Administrador") && (
                <Button size="sm" variant="outline" onClick={() => setOpenTipo(true)}>
                  Nuevo tipo
                </Button>
              )}
            </EntityActions>
          ) : null
        }
        rowActions={
          canManageMantenimiento
            ? (row) => (
                <Button
                  size="sm"
                  variant="outline"
                  icon={<Edit className="h-4 w-4" />}
                  onClick={() => {
                    setEditing(row);
                    setOpenForm(true);
                  }}
                >
                  Editar
                </Button>
              )
            : undefined
        }
        columns={[
          { key: "maquinaria", header: "Maquinaria" },
          { key: "tipoMantenimiento", header: "Tipo" },
          { key: "responsable", header: "Responsable" },
          {
            key: "fechaProgramada",
            header: "Programada",
            render: (r) => toDateInput(r.fechaProgramada) || "-",
          },
          {
            key: "fechaRealizada",
            header: "Realizada",
            render: (r) => toDateInput(r.fechaRealizada) || "-",
          },
          {
            key: "estadoMantenimiento",
            header: "Estado",
            render: (r) => <StatusBadge>{r.estadoMantenimiento ?? "-"}</StatusBadge>,
          },
        ]}
      />
      <MantenimientoFormModal
        open={openForm}
        mantenimiento={editing}
        onClose={() => setOpenForm(false)}
        onSaved={() => setRefreshKey((key) => key + 1)}
      />
      <TipoMantenimientoModal
        open={openTipo}
        onClose={() => setOpenTipo(false)}
        onSaved={() => setRefreshKey((key) => key + 1)}
      />
    </>
  );
}

function MantenimientoFormModal({
  open,
  mantenimiento,
  onClose,
  onSaved,
}: {
  open: boolean;
  mantenimiento: Mantenimiento | null;
  onClose: () => void;
  onSaved: OnSaved;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [tipos, setTipos] = useState<TipoMantenimiento[]>([]);
  const [estados, setEstados] = useState<EstadoMantenimiento[]>([]);
  const { maquinarias, usuarios } = useReferenceData(open);
  const [selectedMaquinariaId, setSelectedMaquinariaId] = useState("");
  const [selectedResponsableId, setSelectedResponsableId] = useState("");
  const selectedMaquinaria = maquinarias.find(
    (item) => String(item.idMaquinaria) === selectedMaquinariaId,
  );
  const responsablesOptions = selectedMaquinaria
    ? usuarios.filter(
        (item) =>
          item.idEmpresa === selectedMaquinaria.idEmpresa &&
          (item.activo || item.idUsuario === mantenimiento?.idResponsable),
      )
    : [];

  useEffect(() => {
    if (!open) return;
    Promise.all([mantenimientoApi.tipos(), mantenimientoApi.estados()])
      .then(([tiposRes, estadosRes]) => {
        setTipos(tiposRes);
        setEstados(estadosRes);
      })
      .catch((error) => toast.error(extractErrorMessage(error)));
  }, [open, toast]);

  useEffect(() => {
    if (!open) return;
    setSelectedMaquinariaId(mantenimiento?.idMaquinaria ? String(mantenimiento.idMaquinaria) : "");
    setSelectedResponsableId(
      mantenimiento?.idResponsable ? String(mantenimiento.idResponsable) : "",
    );
  }, [mantenimiento, open]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      idMaquinaria: mantenimiento?.idMaquinaria ?? Number(requiredValue(form.get("idMaquinaria"))),
      idTipoMantenimiento: Number(requiredValue(form.get("idTipoMantenimiento"))),
      idEstadoMantenimiento: Number(requiredValue(form.get("idEstadoMantenimiento"))),
      idResponsable: numberValue(form.get("idResponsable")),
      idRegistroHorasOrigen: undefined,
      fechaProgramada: formValue(form.get("fechaProgramada")),
      fechaRealizada: formValue(form.get("fechaRealizada")),
      descripcion: requiredValue(form.get("descripcion")),
      horasMaquinaAlMomento: numberValue(form.get("horasMaquinaAlMomento")),
      observaciones: formValue(form.get("observaciones")),
    };
    setSaving(true);
    try {
      if (mantenimiento) {
        const { idMaquinaria, ...updatePayload } = payload;
        await mantenimientoApi.update(mantenimiento.idMantenimiento, updatePayload);
        toast.success("Mantenimiento actualizado.");
      } else {
        await mantenimientoApi.create(payload);
        toast.success("Mantenimiento creado.");
      }
      onClose();
      onSaved();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mantenimiento ? "Editar mantenimiento" : "Nuevo mantenimiento"}
      size="lg"
    >
      <form className="grid gap-4" onSubmit={submit}>
        <Field label="Maquinaria" required>
          <SelectInput
            name="idMaquinaria"
            value={selectedMaquinariaId}
            onChange={(event) => {
              setSelectedMaquinariaId(event.target.value);
              setSelectedResponsableId("");
            }}
            required
            disabled={!!mantenimiento}
          >
            <option value="" disabled>
              Seleccionar
            </option>
            {maquinarias.map((item) => (
              <option key={item.idMaquinaria} value={item.idMaquinaria}>
                {item.codigo} - {item.nombre}
              </option>
            ))}
          </SelectInput>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo" required>
            <SelectInput
              name="idTipoMantenimiento"
              defaultValue={mantenimiento?.idTipoMantenimiento ?? ""}
              required
            >
              <option value="" disabled>
                Seleccionar
              </option>
              {tipos.map((item) => (
                <option key={item.idTipoMantenimiento} value={item.idTipoMantenimiento}>
                  {item.nombre}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Estado" required>
            <SelectInput
              name="idEstadoMantenimiento"
              defaultValue={mantenimiento?.idEstadoMantenimiento ?? ""}
              required
            >
              <option value="" disabled>
                Seleccionar
              </option>
              {estados.map((item) => (
                <option key={item.idEstadoMantenimiento} value={item.idEstadoMantenimiento}>
                  {item.nombre}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
        <Field label="Responsable">
          <SelectInput
            name="idResponsable"
            value={selectedResponsableId}
            onChange={(event) => setSelectedResponsableId(event.target.value)}
            disabled={!selectedMaquinariaId}
          >
            <option value="">Sin responsable</option>
            {responsablesOptions.map((item) => (
              <option key={item.idUsuario} value={item.idUsuario}>
                {item.nombre} {item.apellido}
              </option>
            ))}
          </SelectInput>
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Fecha programada">
            <TextInput
              name="fechaProgramada"
              type="date"
              defaultValue={toDateInput(mantenimiento?.fechaProgramada)}
            />
          </Field>
          {mantenimiento && (
            <Field label="Fecha realizada">
              <TextInput
                name="fechaRealizada"
                type="date"
                defaultValue={toDateInput(mantenimiento?.fechaRealizada)}
              />
            </Field>
          )}
          <Field label="Horas maquina">
            <TextInput
              name="horasMaquinaAlMomento"
              type="number"
              step="0.01"
              defaultValue={mantenimiento?.horasMaquinaAlMomento ?? ""}
            />
          </Field>
        </div>
        <Field label="Descripcion" required>
          <TextareaInput
            name="descripcion"
            defaultValue={mantenimiento?.descripcion ?? ""}
            required
            maxLength={1000}
          />
        </Field>
        <Field label="Observaciones">
          <TextareaInput
            name="observaciones"
            defaultValue={mantenimiento?.observaciones ?? ""}
            maxLength={1000}
          />
        </Field>
        <div className="flex justify-end gap-2">
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

function TipoMantenimientoModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: OnSaved;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      await mantenimientoApi.crearTipo({
        nombre: requiredValue(form.get("nombre")),
        descripcion: formValue(form.get("descripcion")),
        umbralHoras: numberValue(form.get("umbralHoras")),
      });
      toast.success("Tipo de mantenimiento creado.");
      onClose();
      onSaved();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nuevo tipo de mantenimiento">
      <form className="grid gap-4" onSubmit={submit}>
        <Field label="Nombre" required>
          <TextInput name="nombre" required maxLength={100} />
        </Field>
        <Field label="Umbral horas">
          <TextInput name="umbralHoras" type="number" step="0.01" />
        </Field>
        <Field label="Descripcion">
          <TextareaInput name="descripcion" maxLength={500} />
        </Field>
        <div className="flex justify-end gap-2">
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

// ADMINISTRACION
export function AdministracionPage() {
  const [editing, setEditing] = useState<TareaAdministrativa | null>(null);
  const [openTask, setOpenTask] = useState(false);
  const [openEvent, setOpenEvent] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("");
  const [asignadoFilter, setAsignadoFilter] = useState("");
  const [prioridadFilter, setPrioridadFilter] = useState("");

  const clearFilters = () => {
    setSearch("");
    setEstadoFilter("");
    setAsignadoFilter("");
    setPrioridadFilter("");
  };

  return (
    <>
      <ModuleShell<TareaAdministrativa>
        title="Tareas administrativas"
        description="Tareas internas y eventos de calendario"
        fetcher={(p) => administracionApi.tareas(p)}
        rowKey={(r) => r.idTarea}
        deps={[refreshKey]}
        filters={
          <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
            <Field label="Buscar">
              <TextInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Titulo o descripcion"
              />
            </Field>
            <Field label="Estado">
              <TextInput
                value={estadoFilter}
                onChange={(event) => setEstadoFilter(event.target.value)}
                placeholder="Estado"
              />
            </Field>
            <Field label="Asignado">
              <TextInput
                value={asignadoFilter}
                onChange={(event) => setAsignadoFilter(event.target.value)}
                placeholder="Persona"
              />
            </Field>
            <Field label="Prioridad">
              <SelectInput
                value={prioridadFilter}
                onChange={(event) => setPrioridadFilter(event.target.value)}
              >
                <option value="">Todas</option>
                <option value="Baja">Baja</option>
                <option value="Media">Media</option>
                <option value="Alta">Alta</option>
              </SelectInput>
            </Field>
            <div className="flex items-end">
              <Button type="button" variant="outline" className="w-full" onClick={clearFilters}>
                Limpiar
              </Button>
            </div>
          </div>
        }
        localFilter={(row) => {
          const matchesSearch =
            !search || textIncludes(row.titulo, search) || textIncludes(row.descripcion, search);
          const matchesEstado = !estadoFilter || textIncludes(row.estadoTarea, estadoFilter);
          const matchesAsignado = !asignadoFilter || textIncludes(row.asignado, asignadoFilter);
          const matchesPrioridad =
            !prioridadFilter || normalizeText(row.prioridad) === normalizeText(prioridadFilter);
          return matchesSearch && matchesEstado && matchesAsignado && matchesPrioridad;
        }}
        actions={() => (
          <EntityActions>
            <Button
              size="sm"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setEditing(null);
                setOpenTask(true);
              }}
            >
              Nueva tarea
            </Button>
            <Button size="sm" variant="outline" onClick={() => setOpenEvent(true)}>
              Nuevo evento
            </Button>
          </EntityActions>
        )}
        rowActions={(row) => (
          <Button
            size="sm"
            variant="outline"
            icon={<Edit className="h-4 w-4" />}
            onClick={() => {
              setEditing(row);
              setOpenTask(true);
            }}
          >
            Editar
          </Button>
        )}
        columns={[
          { key: "titulo", header: "Titulo" },
          { key: "asignado", header: "Asignado" },
          { key: "prioridad", header: "Prioridad" },
          {
            key: "fechaVencimiento",
            header: "Vence",
            render: (r) => formatDateTime(r.fechaVencimiento),
          },
          {
            key: "estadoTarea",
            header: "Estado",
            render: (r) => <StatusBadge>{r.estadoTarea}</StatusBadge>,
          },
        ]}
      />
      <TareaFormModal
        open={openTask}
        tarea={editing}
        onClose={() => setOpenTask(false)}
        onSaved={() => setRefreshKey((key) => key + 1)}
      />
      <EventoFormModal
        open={openEvent}
        onClose={() => setOpenEvent(false)}
        onSaved={() => setRefreshKey((key) => key + 1)}
      />
    </>
  );
}

function TareaFormModal({
  open,
  tarea,
  onClose,
  onSaved,
}: {
  open: boolean;
  tarea: TareaAdministrativa | null;
  onClose: () => void;
  onSaved: OnSaved;
}) {
  const { usuario } = useAuth();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [estados, setEstados] = useState<EstadoTarea[]>([]);
  const { usuarios } = useReferenceData(open);
  const usuariosAsignables = usuarios.filter((item) =>
    puedeAsignarTarea(usuario?.rol, item.rol?.toString()),
  );

  useEffect(() => {
    if (!open) return;
    administracionApi
      .estadosTarea()
      .then(setEstados)
      .catch((error) => toast.error(extractErrorMessage(error)));
  }, [open, toast]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      idAsignado: Number(requiredValue(form.get("idAsignado"))),
      idEstadoTarea: Number(requiredValue(form.get("idEstadoTarea"))),
      titulo: requiredValue(form.get("titulo")),
      descripcion: formValue(form.get("descripcion")),
      fechaVencimiento: dateTimeValue(form.get("fechaVencimiento")),
      prioridad: requiredValue(form.get("prioridad")),
    };
    setSaving(true);
    try {
      if (tarea) {
        await administracionApi.updateTarea(tarea.idTarea, payload);
        toast.success("Tarea actualizada.");
      } else {
        await administracionApi.crearTarea(payload);
        toast.success("Tarea creada.");
      }
      onClose();
      onSaved();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={tarea ? "Editar tarea" : "Nueva tarea"} size="lg">
      <form className="grid gap-4" onSubmit={submit}>
        <Field label="Titulo" required>
          <TextInput name="titulo" defaultValue={tarea?.titulo ?? ""} required maxLength={160} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Asignado" required>
            <SelectInput name="idAsignado" defaultValue={tarea?.idAsignado ?? ""} required>
              <option value="" disabled>
                Seleccionar
              </option>
              {usuariosAsignables.map((item) => (
                <option key={item.idUsuario} value={item.idUsuario}>
                  {item.nombre} {item.apellido}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Estado" required>
            <SelectInput name="idEstadoTarea" defaultValue={tarea?.idEstadoTarea ?? ""} required>
              <option value="" disabled>
                Seleccionar
              </option>
              {estados.map((item) => (
                <option key={item.idEstadoTarea} value={item.idEstadoTarea}>
                  {item.nombre}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Prioridad" required>
            <SelectInput name="prioridad" defaultValue={tarea?.prioridad ?? "Media"} required>
              <option value="Baja">Baja</option>
              <option value="Media">Media</option>
              <option value="Alta">Alta</option>
            </SelectInput>
          </Field>
        </div>
        <Field label="Fecha vencimiento">
          <TextInput
            name="fechaVencimiento"
            type="datetime-local"
            defaultValue={toDateTimeInput(tarea?.fechaVencimiento)}
          />
        </Field>
        <Field label="Descripcion">
          <TextareaInput
            name="descripcion"
            defaultValue={tarea?.descripcion ?? ""}
            maxLength={1000}
          />
        </Field>
        <div className="flex justify-end gap-2">
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

function EventoFormModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: OnSaved;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [tareas, setTareas] = useState<TareaAdministrativa[]>([]);

  useEffect(() => {
    if (!open) return;
    administracionApi
      .tareas({ pageSize: 100 })
      .then((res) => setTareas(res.items))
      .catch((error) => toast.error(extractErrorMessage(error)));
  }, [open, toast]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload: Partial<EventoCalendario> = {
      idTarea: numberValue(form.get("idTarea")),
      titulo: requiredValue(form.get("titulo")),
      descripcion: formValue(form.get("descripcion")),
      fechaInicio: dateTimeValue(form.get("fechaInicio")) ?? "",
      fechaFin: dateTimeValue(form.get("fechaFin")),
      tipoEvento: requiredValue(form.get("tipoEvento")),
    };
    setSaving(true);
    try {
      await administracionApi.crearEvento(payload);
      toast.success("Evento creado.");
      onClose();
      onSaved();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nuevo evento" size="lg">
      <form className="grid gap-4" onSubmit={submit}>
        <Field label="Titulo" required>
          <TextInput name="titulo" required maxLength={160} />
        </Field>
        <Field label="Tarea asociada">
          <SelectInput name="idTarea">
            <option value="">Sin tarea</option>
            {tareas.map((item) => (
              <option key={item.idTarea} value={item.idTarea}>
                {item.titulo}
              </option>
            ))}
          </SelectInput>
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Inicio" required>
            <TextInput name="fechaInicio" type="datetime-local" required />
          </Field>
          <Field label="Fin">
            <TextInput name="fechaFin" type="datetime-local" />
          </Field>
          <Field label="Tipo" required>
            <TextInput name="tipoEvento" required maxLength={80} />
          </Field>
        </div>
        <Field label="Descripcion">
          <TextareaInput name="descripcion" maxLength={1000} />
        </Field>
        <div className="flex justify-end gap-2">
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

// ESTIBA
export function EstibaPage() {
  const { hasRole } = useAuth();
  const [openPersonal, setOpenPersonal] = useState(false);
  const [editingPersonal, setEditingPersonal] = useState<PersonalEstiba | null>(null);
  const [openCuadrilla, setOpenCuadrilla] = useState(false);
  const [editingCuadrilla, setEditingCuadrilla] = useState<Cuadrilla | null>(null);
  const [openAsignacion, setOpenAsignacion] = useState(false);
  const [openCitacion, setOpenCitacion] = useState(false);
  const [editingCitacion, setEditingCitacion] = useState<CitacionEstiba | null>(null);
  const [detalleCitacion, setDetalleCitacion] = useState<CitacionEstiba | null>(null);
  const [openLiquidacion, setOpenLiquidacion] = useState(false);
  const [editingLiquidacion, setEditingLiquidacion] = useState<LiquidacionEstiba | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [clienteFilter, setClienteFilter] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("");
  const [zonaFilter, setZonaFilter] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const canManageEstibaCatalogs = hasRole("Administrador", "Oficina");
  const canCreateLiquidacion = hasRole("Administrador", "Oficina");

  const clearFilters = () => {
    setClienteFilter("");
    setEstadoFilter("");
    setZonaFilter("");
    setFechaDesde("");
    setFechaHasta("");
  };

  return (
    <>
      <ModuleShell<CitacionEstiba>
        title="Citaciones de estiba"
        description={
          hasRole("Encargado")
            ? "Citaciones y asistencia de estiba"
            : "Citaciones, asistencia y liquidaciones"
        }
        fetcher={(p) => estibaApi.citaciones(p)}
        rowKey={(r) => r.idCitacion}
        deps={[refreshKey]}
        filters={
          <div className="grid gap-3 xl:grid-cols-[1.2fr_1fr_1fr_1fr_1fr_auto]">
            <Field label="Cliente">
              <TextInput
                value={clienteFilter}
                onChange={(event) => setClienteFilter(event.target.value)}
                placeholder="Cliente"
              />
            </Field>
            <Field label="Estado">
              <TextInput
                value={estadoFilter}
                onChange={(event) => setEstadoFilter(event.target.value)}
                placeholder="Estado"
              />
            </Field>
            <Field label="Zona">
              <TextInput
                value={zonaFilter}
                onChange={(event) => setZonaFilter(event.target.value)}
                placeholder="Zona"
              />
            </Field>
            <Field label="Desde">
              <TextInput
                type="date"
                value={fechaDesde}
                onChange={(event) => setFechaDesde(event.target.value)}
              />
            </Field>
            <Field label="Hasta">
              <TextInput
                type="date"
                value={fechaHasta}
                onChange={(event) => setFechaHasta(event.target.value)}
              />
            </Field>
            <div className="flex items-end">
              <Button type="button" variant="outline" className="w-full" onClick={clearFilters}>
                Limpiar
              </Button>
            </div>
          </div>
        }
        localFilter={(row) => {
          const fecha = toDateInput(row.fecha);
          const matchesCliente = !clienteFilter || textIncludes(row.cliente, clienteFilter);
          const matchesEstado = !estadoFilter || textIncludes(row.estadoCitacion, estadoFilter);
          const matchesZona = !zonaFilter || textIncludes(row.zona, zonaFilter);
          const matchesDesde = !fechaDesde || fecha >= fechaDesde;
          const matchesHasta = !fechaHasta || fecha <= fechaHasta;
          return matchesCliente && matchesEstado && matchesZona && matchesDesde && matchesHasta;
        }}
        actions={() => (
          <EntityActions>
            <Button
              size="sm"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setEditingCitacion(null);
                setOpenCitacion(true);
              }}
            >
              Nueva citacion
            </Button>
            {canManageEstibaCatalogs && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingPersonal(null);
                    setOpenPersonal(true);
                  }}
                >
                  Personal
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingCuadrilla(null);
                    setOpenCuadrilla(true);
                  }}
                >
                  Cuadrilla
                </Button>
                <Button size="sm" variant="outline" onClick={() => setOpenAsignacion(true)}>
                  Asignar
                </Button>
              </>
            )}
            {canCreateLiquidacion && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingLiquidacion(null);
                  setOpenLiquidacion(true);
                }}
              >
                Liquidacion
              </Button>
            )}
          </EntityActions>
        )}
        rowActions={(row) => (
          <EntityActions>
            <Button
              size="sm"
              variant="outline"
              icon={<Edit className="h-4 w-4" />}
              onClick={() => {
                setEditingCitacion(row);
                setOpenCitacion(true);
              }}
            >
              Editar
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDetalleCitacion(row)}>
              Agregar detalle
            </Button>
          </EntityActions>
        )}
        columns={[
          { key: "fecha", header: "Fecha", render: (r) => toDateInput(r.fecha) || "-" },
          { key: "hora", header: "Hora" },
          { key: "cliente", header: "Cliente" },
          { key: "zona", header: "Zona" },
          { key: "detalleOperativo", header: "Detalle" },
          {
            key: "estadoCitacion",
            header: "Estado",
            render: (r) => <StatusBadge>{r.estadoCitacion}</StatusBadge>,
          },
        ]}
      />
      {canManageEstibaCatalogs && (
        <div className="mt-8 grid gap-8 xl:grid-cols-2">
          <ModuleShell<PersonalEstiba>
            title="Personal de estiba"
            fetcher={(p) => estibaApi.personal(p)}
            rowKey={(r) => r.idPersonalEstiba}
            deps={[refreshKey]}
            rowActions={(row) => (
              <Button
                size="sm"
                variant="outline"
                icon={<Edit className="h-4 w-4" />}
                onClick={() => {
                  setEditingPersonal(row);
                  setOpenPersonal(true);
                }}
              >
                Editar
              </Button>
            )}
            columns={[
              { key: "empresa", header: "Empresa" },
              { key: "cedula", header: "Cedula" },
              { key: "nombre", header: "Nombre", render: (r) => `${r.nombre} ${r.apellido}` },
              { key: "telefono", header: "Telefono" },
              {
                key: "activo",
                header: "Estado",
                render: (r) => <StatusBadge>{r.activo ? "Activo" : "Inactivo"}</StatusBadge>,
              },
            ]}
          />
          <ModuleShell<Cuadrilla>
            title="Cuadrillas"
            fetcher={(p) => estibaApi.cuadrillas(p)}
            rowKey={(r) => r.idCuadrilla}
            deps={[refreshKey]}
            rowActions={(row) => (
              <Button
                size="sm"
                variant="outline"
                icon={<Edit className="h-4 w-4" />}
                onClick={() => {
                  setEditingCuadrilla(row);
                  setOpenCuadrilla(true);
                }}
              >
                Editar
              </Button>
            )}
            columns={[
              { key: "empresa", header: "Empresa" },
              { key: "nombre", header: "Nombre" },
              { key: "descripcion", header: "Descripcion" },
              {
                key: "activa",
                header: "Estado",
                render: (r) => <StatusBadge>{r.activa ? "Activa" : "Inactiva"}</StatusBadge>,
              },
            ]}
          />
        </div>
      )}
      {canCreateLiquidacion && (
        <div className="mt-8">
          <ModuleShell<LiquidacionEstiba>
            title="Liquidaciones de estiba"
            fetcher={(p) => estibaApi.listarLiquidaciones(p)}
            rowKey={(r) => r.idLiquidacion ?? `${r.periodoDesde}-${r.periodoHasta}`}
            deps={[refreshKey]}
            rowActions={(row) => (
              <Button
                size="sm"
                variant="outline"
                icon={<Edit className="h-4 w-4" />}
                onClick={() => {
                  setEditingLiquidacion(row);
                  setOpenLiquidacion(true);
                }}
              >
                Editar
              </Button>
            )}
            columns={[
              { key: "empresa", header: "Empresa" },
              { key: "periodoDesde", header: "Desde", render: (r) => toDateInput(r.periodoDesde) },
              { key: "periodoHasta", header: "Hasta", render: (r) => toDateInput(r.periodoHasta) },
              { key: "totalHoras", header: "Horas", render: (r) => r.totalHoras ?? 0 },
              {
                key: "estado",
                header: "Estado",
                render: (r) => <StatusBadge>{r.estado}</StatusBadge>,
              },
            ]}
          />
        </div>
      )}
      <PersonalEstibaModal
        open={openPersonal}
        personal={editingPersonal}
        onClose={() => {
          setOpenPersonal(false);
          setEditingPersonal(null);
        }}
        onSaved={() => setRefreshKey((key) => key + 1)}
      />
      <CuadrillaModal
        open={openCuadrilla}
        cuadrilla={editingCuadrilla}
        onClose={() => {
          setOpenCuadrilla(false);
          setEditingCuadrilla(null);
        }}
        onSaved={() => setRefreshKey((key) => key + 1)}
      />
      <AsignarPersonalModal open={openAsignacion} onClose={() => setOpenAsignacion(false)} />
      <CitacionModal
        open={openCitacion}
        citacion={editingCitacion}
        onClose={() => {
          setOpenCitacion(false);
          setEditingCitacion(null);
        }}
        onSaved={() => setRefreshKey((key) => key + 1)}
      />
      <DetalleCitacionModal citacion={detalleCitacion} onClose={() => setDetalleCitacion(null)} />
      <LiquidacionModal
        open={openLiquidacion}
        liquidacion={editingLiquidacion}
        onClose={() => {
          setOpenLiquidacion(false);
          setEditingLiquidacion(null);
        }}
        onSaved={() => setRefreshKey((key) => key + 1)}
      />
    </>
  );
}

function PersonalEstibaModal({
  open,
  personal,
  onClose,
  onSaved,
}: {
  open: boolean;
  personal: PersonalEstiba | null;
  onClose: () => void;
  onSaved: OnSaved;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const { empresas } = useReferenceData(open);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      const payload = {
        idEmpresa: Number(requiredValue(form.get("idEmpresa"))),
        cedula: requiredValue(form.get("cedula")),
        nombre: requiredValue(form.get("nombre")),
        apellido: requiredValue(form.get("apellido")),
        telefono: formValue(form.get("telefono")),
        activo: boolValue(form.get("activo")),
      };
      if (personal) {
        await estibaApi.updatePersonal(personal.idPersonalEstiba, payload);
        toast.success("Personal actualizado.");
      } else {
        await estibaApi.crearPersonal(payload);
        toast.success("Personal creado.");
      }
      onClose();
      onSaved();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={personal ? "Editar personal de estiba" : "Nuevo personal de estiba"}
    >
      <form className="grid gap-4" onSubmit={submit}>
        <Field label="Empresa" required>
          <SelectInput
            name="idEmpresa"
            defaultValue={defaultEmpresaId(empresas, personal?.idEmpresa)}
            required
          >
            <option value="" disabled>
              Seleccionar empresa
            </option>
            {empresas.map((empresa) => (
              <option key={empresa.idEmpresa} value={empresa.idEmpresa}>
                {empresa.nombre}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Cedula" required>
          <TextInput name="cedula" defaultValue={personal?.cedula ?? ""} required maxLength={30} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" required>
            <TextInput
              name="nombre"
              defaultValue={personal?.nombre ?? ""}
              required
              maxLength={100}
            />
          </Field>
          <Field label="Apellido" required>
            <TextInput
              name="apellido"
              defaultValue={personal?.apellido ?? ""}
              required
              maxLength={100}
            />
          </Field>
        </div>
        <Field label="Telefono">
          <TextInput name="telefono" defaultValue={personal?.telefono ?? ""} maxLength={50} />
        </Field>
        {personal && (
          <Field label="Estado">
            <SelectInput name="activo" defaultValue={personal.activo ? "true" : "false"}>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </SelectInput>
          </Field>
        )}
        <div className="flex justify-end gap-2">
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

function CuadrillaModal({
  open,
  cuadrilla,
  onClose,
  onSaved,
}: {
  open: boolean;
  cuadrilla: Cuadrilla | null;
  onClose: () => void;
  onSaved: OnSaved;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const { empresas } = useReferenceData(open);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      const payload = {
        idEmpresa: Number(requiredValue(form.get("idEmpresa"))),
        nombre: requiredValue(form.get("nombre")),
        descripcion: formValue(form.get("descripcion")),
        activa: boolValue(form.get("activa")),
      };
      if (cuadrilla) {
        await estibaApi.updateCuadrilla(cuadrilla.idCuadrilla, payload);
        toast.success("Cuadrilla actualizada.");
      } else {
        await estibaApi.crearCuadrilla(payload);
        toast.success("Cuadrilla creada.");
      }
      onClose();
      onSaved();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title={cuadrilla ? "Editar cuadrilla" : "Nueva cuadrilla"}>
      <form className="grid gap-4" onSubmit={submit}>
        <Field label="Empresa" required>
          <SelectInput
            name="idEmpresa"
            defaultValue={defaultEmpresaId(empresas, cuadrilla?.idEmpresa)}
            required
          >
            <option value="" disabled>
              Seleccionar empresa
            </option>
            {empresas.map((empresa) => (
              <option key={empresa.idEmpresa} value={empresa.idEmpresa}>
                {empresa.nombre}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Nombre" required>
          <TextInput
            name="nombre"
            defaultValue={cuadrilla?.nombre ?? ""}
            required
            maxLength={100}
          />
        </Field>
        <Field label="Descripcion">
          <TextareaInput
            name="descripcion"
            defaultValue={cuadrilla?.descripcion ?? ""}
            maxLength={500}
          />
        </Field>
        {cuadrilla && (
          <Field label="Estado">
            <SelectInput name="activa" defaultValue={cuadrilla.activa ? "true" : "false"}>
              <option value="true">Activa</option>
              <option value="false">Inactiva</option>
            </SelectInput>
          </Field>
        )}
        <div className="flex justify-end gap-2">
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

function AsignarPersonalModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [personal, setPersonal] = useState<PersonalEstiba[]>([]);
  const [cuadrillas, setCuadrillas] = useState<Cuadrilla[]>([]);
  const [selectedCuadrillaId, setSelectedCuadrillaId] = useState("");
  const [selectedPersonalId, setSelectedPersonalId] = useState("");
  const selectedCuadrilla = cuadrillas.find(
    (item) => String(item.idCuadrilla) === selectedCuadrillaId,
  );
  const personalOptions = selectedCuadrilla
    ? personal.filter((item) => item.idEmpresa === selectedCuadrilla.idEmpresa && item.activo)
    : [];

  useEffect(() => {
    if (!open) return;
    setSelectedCuadrillaId("");
    setSelectedPersonalId("");
    Promise.all([estibaApi.personal({ pageSize: 100 }), estibaApi.cuadrillas({ pageSize: 100 })])
      .then(([personalRes, cuadrillasRes]) => {
        setPersonal(personalRes.items);
        setCuadrillas(cuadrillasRes.items);
      })
      .catch((error) => toast.error(extractErrorMessage(error)));
  }, [open, toast]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const idCuadrilla = requiredValue(form.get("idCuadrilla"));
    const idPersonalEstiba = requiredValue(form.get("idPersonalEstiba"));
    if (
      !selectedCuadrilla ||
      !personalOptions.some((item) => String(item.idPersonalEstiba) === idPersonalEstiba)
    ) {
      toast.error("Selecciona personal de la misma empresa que la cuadrilla.");
      return;
    }
    setSaving(true);
    try {
      await estibaApi.asignarPersonalCuadrilla({
        idCuadrilla: Number(idCuadrilla),
        idPersonalEstiba: Number(idPersonalEstiba),
        fechaDesde: requiredValue(form.get("fechaDesde")),
        fechaHasta: formValue(form.get("fechaHasta")),
      });
      toast.success("Personal asignado.");
      onClose();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Asignar personal a cuadrilla">
      <form className="grid gap-4" onSubmit={submit}>
        <Field label="Cuadrilla" required>
          <SelectInput
            name="idCuadrilla"
            value={selectedCuadrillaId}
            onChange={(event) => {
              setSelectedCuadrillaId(event.target.value);
              setSelectedPersonalId("");
            }}
            required
          >
            <option value="" disabled>
              Seleccionar
            </option>
            {cuadrillas
              .filter((item) => item.activa)
              .map((item) => (
                <option key={item.idCuadrilla} value={item.idCuadrilla}>
                  {item.nombre}
                </option>
              ))}
          </SelectInput>
        </Field>
        <Field label="Personal" required>
          <SelectInput
            name="idPersonalEstiba"
            value={selectedPersonalId}
            onChange={(event) => setSelectedPersonalId(event.target.value)}
            disabled={!selectedCuadrillaId}
            required
          >
            <option value="" disabled>
              {selectedCuadrillaId ? "Seleccionar" : "Selecciona cuadrilla primero"}
            </option>
            {personalOptions.map((item) => (
              <option key={item.idPersonalEstiba} value={item.idPersonalEstiba}>
                {item.nombre} {item.apellido}
              </option>
            ))}
          </SelectInput>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Desde" required>
            <TextInput name="fechaDesde" type="date" required />
          </Field>
          <Field label="Hasta">
            <TextInput name="fechaHasta" type="date" />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
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

function CitacionModal({
  open,
  citacion,
  onClose,
  onSaved,
}: {
  open: boolean;
  citacion: CitacionEstiba | null;
  onClose: () => void;
  onSaved: OnSaved;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [estados, setEstados] = useState<EstadoCitacion[]>([]);
  const { empresas, clientes } = useReferenceData(open);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState("");
  const [selectedClienteId, setSelectedClienteId] = useState("");
  const selectedEmpresaNumber = Number(selectedEmpresaId) || null;
  const clientesOptions = selectedEmpresaNumber
    ? clientes.filter(
        (item) =>
          item.idEmpresa === selectedEmpresaNumber &&
          (item.activo || item.idCliente === citacion?.idCliente),
      )
    : [];

  useEffect(() => {
    if (!open) return;
    estibaApi
      .estadosCitacion()
      .then(setEstados)
      .catch((error) => toast.error(extractErrorMessage(error)));
  }, [open, toast]);

  useEffect(() => {
    if (!open) return;
    setSelectedEmpresaId(String(defaultEmpresaId(empresas, citacion?.idEmpresa) || ""));
    setSelectedClienteId(citacion?.idCliente ? String(citacion.idCliente) : "");
  }, [citacion, empresas, open]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const idCliente = formValue(form.get("idCliente"));
    if (idCliente && !clientesOptions.some((item) => String(item.idCliente) === idCliente)) {
      toast.error("Selecciona un cliente de la empresa elegida.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        idEmpresa: Number(requiredValue(form.get("idEmpresa"))),
        idCliente: numberValue(form.get("idCliente")),
        idEstadoCitacion: Number(requiredValue(form.get("idEstadoCitacion"))),
        fecha: requiredValue(form.get("fecha")),
        hora: timeOnlyValue(form.get("hora")),
        zona: requiredValue(form.get("zona")),
        detalleOperativo: formValue(form.get("detalleOperativo")),
      };
      if (citacion) {
        await estibaApi.updateCitacion(citacion.idCitacion, payload);
        toast.success("Citacion actualizada.");
      } else {
        await estibaApi.crearCitacion(payload);
        toast.success("Citacion creada.");
      }
      onClose();
      onSaved();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={citacion ? "Editar citacion" : "Nueva citacion"}
      size="lg"
    >
      <form className="grid gap-4" onSubmit={submit}>
        <Field label="Empresa" required>
          <SelectInput
            name="idEmpresa"
            value={selectedEmpresaId}
            onChange={(event) => {
              setSelectedEmpresaId(event.target.value);
              setSelectedClienteId("");
            }}
            required
          >
            <option value="" disabled>
              Seleccionar empresa
            </option>
            {empresas.map((empresa) => (
              <option key={empresa.idEmpresa} value={empresa.idEmpresa}>
                {empresa.nombre}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Cliente">
          <SelectInput
            name="idCliente"
            value={selectedClienteId}
            onChange={(event) => setSelectedClienteId(event.target.value)}
            disabled={!selectedEmpresaId}
          >
            <option value="">Sin cliente</option>
            {clientesOptions.map((item) => (
              <option key={item.idCliente} value={item.idCliente}>
                {item.razonSocial}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Estado" required>
          <SelectInput
            name="idEstadoCitacion"
            defaultValue={citacion?.idEstadoCitacion ?? ""}
            required
          >
            <option value="" disabled>
              Seleccionar
            </option>
            {estados.map((item) => (
              <option key={item.idEstadoCitacion} value={item.idEstadoCitacion}>
                {item.nombre}
              </option>
            ))}
          </SelectInput>
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Fecha" required>
            <TextInput
              name="fecha"
              type="date"
              defaultValue={toDateInput(citacion?.fecha)}
              required
            />
          </Field>
          <Field label="Hora" required>
            <TextInput
              name="hora"
              type="time"
              defaultValue={toTimeInput(citacion?.hora)}
              required
            />
          </Field>
          <Field label="Zona" required>
            <TextInput name="zona" defaultValue={citacion?.zona ?? ""} required maxLength={120} />
          </Field>
        </div>
        <Field label="Detalle operativo">
          <TextareaInput
            name="detalleOperativo"
            defaultValue={citacion?.detalleOperativo ?? ""}
            maxLength={1000}
          />
        </Field>
        <div className="flex justify-end gap-2">
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

function DetalleCitacionModal({
  citacion,
  onClose,
}: {
  citacion: CitacionEstiba | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [personal, setPersonal] = useState<PersonalEstiba[]>([]);
  const [cuadrillas, setCuadrillas] = useState<Cuadrilla[]>([]);
  const personalOptions = citacion?.idEmpresa
    ? personal.filter((item) => item.idEmpresa === citacion.idEmpresa && item.activo)
    : personal.filter((item) => item.activo);
  const cuadrillasOptions = citacion?.idEmpresa
    ? cuadrillas.filter((item) => item.idEmpresa === citacion.idEmpresa && item.activa)
    : cuadrillas.filter((item) => item.activa);

  useEffect(() => {
    if (!citacion) return;
    Promise.all([estibaApi.personal({ pageSize: 100 }), estibaApi.cuadrillas({ pageSize: 100 })])
      .then(([personalRes, cuadrillasRes]) => {
        setPersonal(personalRes.items);
        setCuadrillas(cuadrillasRes.items);
      })
      .catch((error) => toast.error(extractErrorMessage(error)));
  }, [citacion, toast]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!citacion) return;
    const form = new FormData(event.currentTarget);
    const idPersonalEstiba = requiredValue(form.get("idPersonalEstiba"));
    const idCuadrilla = formValue(form.get("idCuadrilla"));
    if (!personalOptions.some((item) => String(item.idPersonalEstiba) === idPersonalEstiba)) {
      toast.error("Selecciona personal de la misma empresa que la citacion.");
      return;
    }
    if (
      idCuadrilla &&
      !cuadrillasOptions.some((item) => String(item.idCuadrilla) === idCuadrilla)
    ) {
      toast.error("Selecciona una cuadrilla de la misma empresa que la citacion.");
      return;
    }
    setSaving(true);
    try {
      await estibaApi.agregarDetalleCitacion({
        idCitacion: citacion.idCitacion,
        idPersonalEstiba: Number(idPersonalEstiba),
        idCuadrilla: idCuadrilla ? Number(idCuadrilla) : undefined,
        asistencia: form.get("asistencia") === "" ? undefined : boolValue(form.get("asistencia")),
        horaInicioReal: timeOnlyValue(form.get("horaInicioReal")),
        horaFinReal: timeOnlyValue(form.get("horaFinReal")),
        horasTrabajadas: numberValue(form.get("horasTrabajadas")),
        estadoAltaBps: formValue(form.get("estadoAltaBps")),
        observaciones: formValue(form.get("observaciones")),
      });
      toast.success("Detalle agregado.");
      onClose();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={!!citacion} onClose={onClose} title="Detalle de citacion" size="lg">
      <form className="grid gap-4" onSubmit={submit}>
        <Field label="Personal" required>
          <SelectInput name="idPersonalEstiba" required>
            <option value="" disabled>
              Seleccionar
            </option>
            {personalOptions.map((item) => (
              <option key={item.idPersonalEstiba} value={item.idPersonalEstiba}>
                {item.nombre} {item.apellido}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Cuadrilla">
          <SelectInput name="idCuadrilla">
            <option value="">Sin cuadrilla</option>
            {cuadrillasOptions.map((item) => (
              <option key={item.idCuadrilla} value={item.idCuadrilla}>
                {item.nombre}
              </option>
            ))}
          </SelectInput>
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Asistencia">
            <SelectInput name="asistencia" defaultValue="">
              <option value="">Sin marcar</option>
              <option value="true">Asiste</option>
              <option value="false">No asiste</option>
            </SelectInput>
          </Field>
          <Field label="Inicio real">
            <TextInput name="horaInicioReal" type="time" />
          </Field>
          <Field label="Fin real">
            <TextInput name="horaFinReal" type="time" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Horas trabajadas">
            <TextInput name="horasTrabajadas" type="number" step="0.01" />
          </Field>
          <Field label="Estado alta BPS">
            <TextInput name="estadoAltaBps" maxLength={80} />
          </Field>
        </div>
        <Field label="Observaciones">
          <TextareaInput name="observaciones" maxLength={1000} />
        </Field>
        <div className="flex justify-end gap-2">
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

function LiquidacionModal({
  open,
  liquidacion,
  onClose,
  onSaved,
}: {
  open: boolean;
  liquidacion: LiquidacionEstiba | null;
  onClose: () => void;
  onSaved: OnSaved;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const { empresas } = useReferenceData(open);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      const payload = {
        idEmpresa: Number(requiredValue(form.get("idEmpresa"))),
        periodoDesde: requiredValue(form.get("periodoDesde")),
        periodoHasta: requiredValue(form.get("periodoHasta")),
        totalHoras: Number(formValue(form.get("totalHoras")) ?? liquidacion?.totalHoras ?? 0),
        estado: requiredValue(form.get("estado")),
        observaciones: formValue(form.get("observaciones")),
      };
      if (liquidacion?.idLiquidacion) {
        await estibaApi.updateLiquidacion(liquidacion.idLiquidacion, payload);
        toast.success("Liquidacion actualizada.");
      } else {
        await estibaApi.liquidaciones(payload);
        toast.success("Liquidacion creada.");
      }
      onClose();
      onSaved();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={liquidacion ? "Editar liquidacion" : "Nueva liquidacion"}
    >
      <form className="grid gap-4" onSubmit={submit}>
        <Field label="Empresa" required>
          <SelectInput
            name="idEmpresa"
            defaultValue={defaultEmpresaId(empresas, liquidacion?.idEmpresa)}
            required
          >
            <option value="" disabled>
              Seleccionar empresa
            </option>
            {empresas.map((empresa) => (
              <option key={empresa.idEmpresa} value={empresa.idEmpresa}>
                {empresa.nombre}
              </option>
            ))}
          </SelectInput>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Desde" required>
            <TextInput
              name="periodoDesde"
              type="date"
              defaultValue={toDateInput(liquidacion?.periodoDesde)}
              required
            />
          </Field>
          <Field label="Hasta" required>
            <TextInput
              name="periodoHasta"
              type="date"
              defaultValue={toDateInput(liquidacion?.periodoHasta)}
              required
            />
          </Field>
        </div>
        <Field label="Estado" required>
          <TextInput
            name="estado"
            defaultValue={liquidacion?.estado ?? "Pendiente"}
            required
            maxLength={80}
          />
        </Field>
        {liquidacion && (
          <Field label="Total horas">
            <TextInput
              name="totalHoras"
              type="number"
              step="0.01"
              min="0"
              defaultValue={liquidacion.totalHoras ?? 0}
            />
          </Field>
        )}
        <Field label="Observaciones">
          <TextareaInput
            name="observaciones"
            defaultValue={liquidacion?.observaciones ?? ""}
            maxLength={1000}
          />
        </Field>
        <div className="flex justify-end gap-2">
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

// NOTIFICACIONES
export function NotificacionesPage() {
  const { hasRole } = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [estadoTarget, setEstadoTarget] = useState<Notificacion | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("");

  const clearFilters = () => {
    setSearch("");
    setTipoFilter("");
    setEstadoFilter("");
  };

  return (
    <>
      <ModuleShell<Notificacion>
        title="Notificaciones"
        fetcher={(p) => notificacionesApi.list(p)}
        rowKey={(r) => r.idNotificacion}
        deps={[refreshKey]}
        filters={
          <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
            <Field label="Buscar">
              <TextInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Destinatario o mensaje"
              />
            </Field>
            <Field label="Tipo">
              <SelectInput
                value={tipoFilter}
                onChange={(event) => setTipoFilter(event.target.value)}
              >
                <option value="">Todos</option>
                <option value="Sistema">Sistema</option>
                <option value="Email">Email</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="SMS">SMS</option>
              </SelectInput>
            </Field>
            <Field label="Estado">
              <TextInput
                value={estadoFilter}
                onChange={(event) => setEstadoFilter(event.target.value)}
                placeholder="Estado"
              />
            </Field>
            <div className="flex items-end">
              <Button type="button" variant="outline" className="w-full" onClick={clearFilters}>
                Limpiar
              </Button>
            </div>
          </div>
        }
        localFilter={(row) => {
          const matchesSearch =
            !search || textIncludes(row.destinatario, search) || textIncludes(row.mensaje, search);
          const matchesTipo = !tipoFilter || normalizeText(row.tipo) === normalizeText(tipoFilter);
          const matchesEstado = !estadoFilter || textIncludes(row.estado, estadoFilter);
          return matchesSearch && matchesTipo && matchesEstado;
        }}
        actions={() =>
          hasRole("Administrador", "Oficina") ? (
            <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
              Nueva notificacion
            </Button>
          ) : null
        }
        rowActions={(row) => (
          <Button size="sm" variant="outline" onClick={() => setEstadoTarget(row)}>
            Cambiar estado
          </Button>
        )}
        columns={[
          { key: "tipo", header: "Tipo" },
          { key: "destinatario", header: "Destinatario" },
          { key: "mensaje", header: "Mensaje" },
          { key: "fechaEnvio", header: "Fecha", render: (r) => formatDateTime(r.fechaEnvio) },
          { key: "estado", header: "Estado", render: (r) => <StatusBadge>{r.estado}</StatusBadge> },
        ]}
      />
      <NotificacionModal
        open={open}
        onClose={() => setOpen(false)}
        onSaved={() => setRefreshKey((key) => key + 1)}
      />
      <EstadoNotificacionModal
        notificacion={estadoTarget}
        onClose={() => setEstadoTarget(null)}
        onSaved={() => setRefreshKey((key) => key + 1)}
      />
    </>
  );
}

function NotificacionModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: OnSaved;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const { usuarios } = useReferenceData(open);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      await notificacionesApi.create({
        idUsuario: numberValue(form.get("idUsuario")),
        idOrdenServicio: numberValue(form.get("idOrdenServicio")),
        idCitacion: numberValue(form.get("idCitacion")),
        tipo: requiredValue(form.get("tipo")),
        destinatario: requiredValue(form.get("destinatario")),
        mensaje: requiredValue(form.get("mensaje")),
      });
      toast.success("Notificacion creada.");
      onClose();
      onSaved();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nueva notificacion" size="lg">
      <form className="grid gap-4" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Usuario">
            <SelectInput name="idUsuario">
              <option value="">Sin usuario</option>
              {usuarios.map((item) => (
                <option key={item.idUsuario} value={item.idUsuario}>
                  {item.nombre} {item.apellido}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Orden">
            <TextInput name="idOrdenServicio" type="number" />
          </Field>
          <Field label="Citacion">
            <TextInput name="idCitacion" type="number" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo" required>
            <SelectInput name="tipo" required defaultValue="Sistema">
              <option value="Sistema">Sistema</option>
              <option value="Email">Email</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="SMS">SMS</option>
            </SelectInput>
          </Field>
          <Field label="Destinatario" required>
            <TextInput name="destinatario" required maxLength={180} />
          </Field>
        </div>
        <Field label="Mensaje" required>
          <TextareaInput name="mensaje" required maxLength={1000} />
        </Field>
        <div className="flex justify-end gap-2">
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

function EstadoNotificacionModal({
  notificacion,
  onClose,
  onSaved,
}: {
  notificacion: Notificacion | null;
  onClose: () => void;
  onSaved: OnSaved;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!notificacion) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      await notificacionesApi.setEstado(
        notificacion.idNotificacion,
        requiredValue(form.get("estado")),
      );
      toast.success("Estado actualizado.");
      onClose();
      onSaved();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open={!!notificacion} onClose={onClose} title="Cambiar estado">
      <form className="grid gap-4" onSubmit={submit}>
        <Field label="Estado" required>
          <TextInput
            name="estado"
            defaultValue={notificacion?.estado ?? ""}
            required
            maxLength={80}
          />
        </Field>
        <div className="flex justify-end gap-2">
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

// TRAZABILIDAD
export function TrazabilidadPage() {
  const [selected, setSelected] = useState<Trazabilidad | null>(null);
  const [entidadFilter, setEntidadFilter] = useState("");
  const [accionFilter, setAccionFilter] = useState("");
  const [usuarioFilter, setUsuarioFilter] = useState("");
  const [registroFilter, setRegistroFilter] = useState("");
  return (
    <>
      <ModuleShell<Trazabilidad>
        title="Trazabilidad"
        description="Historial de cambios del sistema"
        fetcher={(p) => trazabilidadApi.list(p)}
        rowKey={(r) => r.idTrazabilidad}
        filters={
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
            <Field label="Entidad">
              <TextInput
                value={entidadFilter}
                onChange={(event) => setEntidadFilter(event.target.value)}
                placeholder="Entidad"
              />
            </Field>
            <Field label="Accion">
              <TextInput
                value={accionFilter}
                onChange={(event) => setAccionFilter(event.target.value)}
                placeholder="Accion"
              />
            </Field>
            <Field label="Usuario">
              <TextInput
                value={usuarioFilter}
                onChange={(event) => setUsuarioFilter(event.target.value)}
                placeholder="Usuario"
              />
            </Field>
            <Field label="Registro">
              <TextInput
                value={registroFilter}
                onChange={(event) => setRegistroFilter(event.target.value)}
                placeholder="ID"
              />
            </Field>
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setEntidadFilter("");
                  setAccionFilter("");
                  setUsuarioFilter("");
                  setRegistroFilter("");
                }}
              >
                Limpiar
              </Button>
            </div>
          </div>
        }
        localFilter={(row) =>
          (!entidadFilter || textIncludes(row.entidad, entidadFilter)) &&
          (!accionFilter || textIncludes(row.accion, accionFilter)) &&
          (!usuarioFilter || textIncludes(row.usuario, usuarioFilter)) &&
          (!registroFilter || textIncludes(row.idRegistroAfectado, registroFilter))
        }
        rowActions={(row) => (
          <Button
            size="sm"
            variant="outline"
            icon={<Eye className="h-4 w-4" />}
            onClick={() => setSelected(row)}
          >
            Detalles
          </Button>
        )}
        columns={[
          { key: "fecha", header: "Fecha", render: (row) => formatDateTime(row.fecha) },
          { key: "usuario", header: "Usuario" },
          { key: "accion", header: "Accion" },
          { key: "entidad", header: "Entidad" },
          { key: "idRegistroAfectado", header: "Registro" },
        ]}
      />
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Detalle de trazabilidad"
        size="xl"
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <JsonAuditPanel title="Datos previos" value={selected?.datosPrevios} />
          <JsonAuditPanel title="Datos nuevos" value={selected?.datosNuevos} />
        </div>
      </Modal>
    </>
  );
}
