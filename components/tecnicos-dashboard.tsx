"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { DataTable } from "primereact/datatable";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { useAuth } from "@/components/auth-provider";
import { AppShell } from "@/components/app-shell";
import { TecnicoFormModal } from "@/components/tecnico-form-modal";
import { apiRequest, apiRequestWithMeta } from "@/lib/api-client";
import { formatTelefono, titleCase, visiblePages } from "@/lib/format-orden";
import { esAdmin, esRolPanel, etiquetaRol } from "@/lib/roles";
import type { Tecnico, TecnicoPayload } from "@/lib/types";

interface ListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type FiltroActivo = "todos" | "activos" | "inactivos";

export function TecnicosDashboard() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const [items, setItems] = useState<Tecnico[]>([]);
  const [meta, setMeta] = useState<ListMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [query, setQuery] = useState("");
  const [filtro, setFiltro] = useState<FiltroActivo>("todos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Tecnico | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(
    async (page = 1, search = query, pageSize = meta.limit, activo = filtro) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(pageSize),
        });
        if (search.trim()) params.set("q", search.trim());
        if (activo === "activos") params.set("activo", "true");
        if (activo === "inactivos") params.set("activo", "false");
        const result = await apiRequestWithMeta<Tecnico[]>(
          `/api/v1/tecnicos?${params.toString()}`,
        );
        setItems(result.data);
        if (result.meta) setMeta(result.meta);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar los técnicos");
      } finally {
        setLoading(false);
      }
    },
    [filtro, meta.limit, query],
  );

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!esRolPanel(user.rol)) {
      router.replace("/acceso-app");
      return;
    }
    void load(1, query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user, router, filtro]);

  if (!ready || !user || !esRolPanel(user.rol)) {
    return (
      <div className="flex flex-1 items-center justify-center text-[var(--text-color-secondary)]">
        Cargando...
      </div>
    );
  }

  const puedeGestionar = esAdmin(user.rol);

  function openCreate() {
    setEditing(null);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(tecnico: Tecnico) {
    setEditing(tecnico);
    setFormError(null);
    setModalOpen(true);
  }

  async function saveTecnico(payload: TecnicoPayload) {
    if (!editing && !payload.password) {
      setFormError("La contraseña es obligatoria al crear un técnico");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const body = {
        nombre: payload.nombre,
        email: payload.email,
        telefono: payload.telefono.trim() ? payload.telefono.trim() : null,
        zona: payload.zona.trim() ? payload.zona.trim() : null,
        activo: payload.activo,
        ...(payload.password ? { password: payload.password } : {}),
      };
      if (editing) {
        await apiRequest<Tecnico>(`/api/v1/tecnicos/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        await apiRequest<Tecnico>("/api/v1/tecnicos", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      setModalOpen(false);
      await load(editing ? meta.page : 1, query);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  async function setActivo(tecnico: Tecnico, activo: boolean) {
    try {
      await apiRequest<Tecnico>(`/api/v1/tecnicos/${tecnico.id}`, {
        method: "PATCH",
        body: JSON.stringify({ activo }),
      });
      await load(meta.page, query);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar");
    }
  }

  function removeTecnico(tecnico: Tecnico) {
    confirmDialog({
      message: `¿Eliminar a ${tecnico.nombre}? Ya no podrá entrar a la app de campo.`,
      header: "Eliminar técnico",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Eliminar",
      rejectLabel: "Cancelar",
      acceptClassName: "p-button-danger",
      accept: () => {
        void (async () => {
          try {
            await apiRequest(`/api/v1/tecnicos/${tecnico.id}`, { method: "DELETE" });
            await load(meta.page, query);
          } catch (err) {
            setError(err instanceof Error ? err.message : "No se pudo eliminar");
          }
        })();
      },
    });
  }

  return (
    <AppShell title="Técnicos recuperadores" subtitle="Usuarios de campo">
      <ConfirmDialog />

      <main className="mx-auto grid w-full flex-1 grid-cols-4 gap-4 px-4 py-6 sm:px-6">
        <form
          className="col-span-4 flex flex-col gap-3 lg:flex-row lg:items-center"
          onSubmit={(event) => {
            event.preventDefault();
            void load(1, query);
          }}
        >
          <InputText
            value={query}
            className="w-full"
            placeholder="Buscar nombre, email, teléfono o zona..."
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" label="Buscar" icon="pi pi-search" outlined />
            {puedeGestionar ? (
              <Button type="button" label="Nuevo técnico" icon="pi pi-plus" onClick={openCreate} />
            ) : null}
          </div>
        </form>

        <div className="col-span-4 flex flex-wrap gap-2">
          {(
            [
              ["todos", "Todos"],
              ["activos", "Activos"],
              ["inactivos", "Inactivos"],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              type="button"
              label={label}
              size="small"
              outlined={filtro !== id}
              onClick={() => setFiltro(id)}
            />
          ))}
        </div>

        {error ? (
          <div className="col-span-4">
            <Message severity="error" text={error} />
          </div>
        ) : null}

        <div className="col-span-4">
          <DataTable
            value={items}
            dataKey="id"
            loading={loading}
            emptyMessage="No hay técnicos recuperadores todavía"
            tableStyle={{ minWidth: "100%" }}
            stripedRows
          >
            <Column
              header="Nombre"
              style={{ width: "20%" }}
              body={(row: Tecnico) => <strong>{titleCase(row.nombre)}</strong>}
            />
            <Column field="email" header="Email" style={{ width: "20%" }} />
            <Column
              header="Teléfono"
              style={{ width: "14%" }}
              body={(row: Tecnico) =>
                row.telefono ? formatTelefono(row.telefono) : "—"
              }
            />
            <Column
              header="Zona"
              style={{ width: "16%" }}
              body={(row: Tecnico) => (row.zona ? titleCase(row.zona) : "—")}
            />
            <Column
              header="Rol"
              style={{ width: "14%" }}
              body={(row: Tecnico) => <Tag value={etiquetaRol(row.rol)} />}
            />
            <Column
              header="Estado"
              style={{ width: "10%" }}
              body={(row: Tecnico) => (
                <Tag
                  value={row.activo ? "Activo" : "Inactivo"}
                  severity={row.activo ? "success" : "secondary"}
                />
              )}
            />
            <Column
              header="Acciones"
              style={{ width: "16%" }}
              body={(row: Tecnico) =>
                puedeGestionar ? (
                <div className="flex flex-wrap gap-1">
                  <Button
                    type="button"
                    label="Editar"
                    size="small"
                    text
                    onClick={() => openEdit(row)}
                  />
                  <Button
                    type="button"
                    label={row.activo ? "Desactivar" : "Activar"}
                    size="small"
                    text
                    onClick={() => void setActivo(row, !row.activo)}
                  />
                  <Button
                    type="button"
                    label="Borrar"
                    size="small"
                    text
                    severity="danger"
                    onClick={() => removeTecnico(row)}
                  />
                </div>
                ) : (
                  "—"
                )
              }
            />
          </DataTable>
          <div className="mt-3 flex flex-col gap-3 rounded-md border border-[var(--surface-200)] bg-[var(--surface-0)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span>
                {meta.total === 0
                  ? "Sin resultados"
                  : `Mostrando ${Math.min((meta.page - 1) * meta.limit + 1, meta.total)}-${Math.min(meta.page * meta.limit, meta.total)} de ${meta.total}`}
              </span>
              <label className="flex items-center gap-2 font-medium">
                Por página
                <select
                  value={meta.limit}
                  className="p-inputtext p-component"
                  onChange={(event) => {
                    void load(1, query, Number(event.target.value));
                  }}
                >
                  {[10, 20, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <Button
                type="button"
                label="Anterior"
                size="small"
                outlined
                disabled={meta.page <= 1}
                onClick={() => void load(meta.page - 1, query, meta.limit)}
              />
              {visiblePages(meta.page, meta.totalPages).map((page, index) =>
                page === "…" ? (
                  <span key={`ellipsis-${index}`} className="px-2">
                    …
                  </span>
                ) : (
                  <Button
                    key={page}
                    type="button"
                    label={String(page)}
                    size="small"
                    outlined={page !== meta.page}
                    onClick={() => void load(page, query, meta.limit)}
                  />
                ),
              )}
              <Button
                type="button"
                label="Siguiente"
                size="small"
                outlined
                disabled={meta.page >= meta.totalPages}
                onClick={() => void load(meta.page + 1, query, meta.limit)}
              />
            </div>
          </div>
        </div>
      </main>

      <TecnicoFormModal
        open={modalOpen}
        tecnico={editing}
        saving={saving}
        error={formError}
        onClose={() => setModalOpen(false)}
        onSubmit={saveTecnico}
      />
    </AppShell>
  );
}
