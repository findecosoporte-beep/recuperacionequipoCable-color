"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { OrdenFormModal } from "@/components/orden-form-modal";
import { apiRequest, apiRequestWithMeta } from "@/lib/api-client";
import { downloadPlantillaExcel, parseOrdenesExcel } from "@/lib/excel-import";
import { parseNombreCliente } from "@/lib/nombre-cliente";
import {
  formatOrdenNumero,
  formatTelefono,
  titleCase,
  visiblePages,
} from "@/lib/format-orden";
import type { BulkImportResult, Orden, OrdenPayload } from "@/lib/types";

interface ListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function OrdenesDashboard() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const [items, setItems] = useState<Orden[]>([]);
  const [meta, setMeta] = useState<ListMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Orden | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(
    async (page = 1, search = query, pageSize = meta.limit) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(pageSize),
        });
        if (search.trim()) params.set("q", search.trim());
        const result = await apiRequestWithMeta<Orden[]>(
          `/api/v1/ordenes?${params.toString()}`,
        );
        setItems(result.data);
        if (result.meta) setMeta(result.meta);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar las órdenes");
      } finally {
        setLoading(false);
      }
    },
    [meta.limit, query],
  );

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    void load(1, query);
    // Solo al entrar con sesión lista
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user, router]);

  if (!ready || !user) {
    return (
      <div className="flex flex-1 items-center justify-center text-[var(--text-color-secondary)]">
        Cargando...
      </div>
    );
  }

  function openCreate() {
    setEditing(null);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(orden: Orden) {
    setEditing(orden);
    setFormError(null);
    setModalOpen(true);
  }

  async function saveOrden(payload: OrdenPayload) {
    setSaving(true);
    setFormError(null);
    try {
      const body = {
        ...payload,
        comentario: payload.comentario.trim() ? payload.comentario.trim() : null,
      };
      if (editing) {
        await apiRequest<Orden>(`/api/v1/ordenes/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        await apiRequest<Orden>("/api/v1/ordenes", {
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

  function removeOrden(orden: Orden) {
    confirmDialog({
      message: `¿Eliminar la orden ${formatOrdenNumero(orden.orden)}?`,
      header: "Eliminar orden",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Eliminar",
      rejectLabel: "Cancelar",
      acceptClassName: "p-button-danger",
      accept: () => {
        void (async () => {
          try {
            await apiRequest(`/api/v1/ordenes/${orden.id}`, { method: "DELETE" });
            await load(meta.page, query);
          } catch (err) {
            setError(err instanceof Error ? err.message : "No se pudo eliminar");
          }
        })();
      },
    });
  }

  async function importExcel(file: File) {
    setImporting(true);
    setError(null);
    setImportMessage(null);
    try {
      const parsed = await parseOrdenesExcel(await file.arrayBuffer());
      let inserted = 0;
      let skipped = parsed.omitidas;
      const duplicates: string[] = [];
      const chunkSize = 500;

      for (let i = 0; i < parsed.ordenes.length; i += chunkSize) {
        const chunk = parsed.ordenes.slice(i, i + chunkSize);
        const result = await apiRequest<BulkImportResult>("/api/v1/ordenes/bulk", {
          method: "POST",
          body: JSON.stringify(chunk),
        });
        inserted += result.inserted;
        skipped += result.skipped;
        duplicates.push(...result.duplicates);
      }

      const parts = [`Se importaron ${inserted} órdenes.`];
      if (skipped > 0) parts.push(`Se omitieron ${skipped}.`);
      if (duplicates.length > 0) {
        parts.push(
          `Duplicadas: ${duplicates.slice(0, 8).join(", ")}${duplicates.length > 8 ? "…" : ""}.`,
        );
      }
      if (parsed.avisos.length > 0) parts.push(parsed.avisos.join(" "));
      setImportMessage(parts.join(" "));
      await load(1, query);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo importar el Excel");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <AppShell title="Panel de órdenes" subtitle="Órdenes de campo">
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
            placeholder="Buscar orden, cliente, ciudad, teléfono..."
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" label="Buscar" icon="pi pi-search" outlined />
            <Button type="button" label="Nueva orden" icon="pi pi-plus" onClick={openCreate} />
            <Button
              type="button"
              label={importing ? "Cargando Excel..." : "Cargar Excel"}
              icon="pi pi-upload"
              outlined
              loading={importing}
              onClick={() => fileInputRef.current?.click()}
            />
            <Button
              type="button"
              label="Plantilla"
              link
              onClick={() => void downloadPlantillaExcel()}
            />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importExcel(file);
            }}
          />
        </form>

        {importMessage ? (
          <div className="col-span-4">
            <Message severity="success" text={importMessage} />
          </div>
        ) : null}

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
            emptyMessage="No hay órdenes todavía"
            tableStyle={{ minWidth: "100%" }}
            stripedRows
          >
            <Column
              header="Orden"
              style={{ width: "12%" }}
              body={(row: Orden) => <Tag value={formatOrdenNumero(row.orden)} severity="info" />}
            />
            <Column
              header="Cliente"
              style={{ width: "16%" }}
              body={(row: Orden) => {
                const { nombre } = parseNombreCliente(row.cliente);
                return <strong>{titleCase(nombre || row.cliente)}</strong>;
              }}
            />
            <Column
              header="Código cliente"
              style={{ width: "10%" }}
              body={(row: Orden) => {
                const { codigo } = parseNombreCliente(row.cliente);
                return codigo ? <Tag value={codigo} /> : "—";
              }}
            />
            <Column header="Ciudad" style={{ width: "12%" }} body={(row: Orden) => titleCase(row.ciudad)} />
            <Column header="Colonia" style={{ width: "12%" }} body={(row: Orden) => titleCase(row.colonia)} />
            <Column
              header="Dirección"
              style={{ width: "18%" }}
              body={(row: Orden) => titleCase(row.direccion)}
            />
            <Column
              header="Teléfono"
              style={{ width: "12%" }}
              body={(row: Orden) => formatTelefono(row.telefono)}
            />
            <Column
              header="Comentario"
              style={{ width: "12%" }}
              body={(row: Orden) =>
                row.comentario?.trim() ? titleCase(row.comentario) : "Sin comentario"
              }
            />
            <Column
              header="Acciones"
              style={{ width: "10%" }}
              body={(row: Orden) => (
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
                    label="Borrar"
                    size="small"
                    text
                    severity="danger"
                    onClick={() => removeOrden(row)}
                  />
                </div>
              )}
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

      <OrdenFormModal
        open={modalOpen}
        orden={editing}
        saving={saving}
        error={formError}
        onClose={() => setModalOpen(false)}
        onSubmit={saveOrden}
      />
    </AppShell>
  );
}
