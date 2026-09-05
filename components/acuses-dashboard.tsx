"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { useAuth } from "@/components/auth-provider";
import { AppShell } from "@/components/app-shell";
import { accesoriosTexto } from "@/lib/acuse";
import { apiRequestWithMeta } from "@/lib/api-client";
import { formatOrdenNumero, telefonosFormateados, titleCase, visiblePages } from "@/lib/format-orden";
import { esRolPanel } from "@/lib/roles";
import type { InfoAcuseRecibido } from "@/lib/types";

interface ListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function AcusesDashboard() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const [items, setItems] = useState<InfoAcuseRecibido[]>([]);
  const [meta, setMeta] = useState<ListMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const result = await apiRequestWithMeta<InfoAcuseRecibido[]>(
          `/api/v1/acuses?${params.toString()}`,
        );
        setItems(result.data);
        if (result.meta) setMeta(result.meta);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar los acuses");
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
    if (!esRolPanel(user.rol)) {
      router.replace("/acceso-app");
      return;
    }
    void load(1, query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user, router]);

  if (!ready || !user || !esRolPanel(user.rol)) {
    return (
      <div className="flex flex-1 items-center justify-center text-[var(--text-color-secondary)]">
        Cargando...
      </div>
    );
  }

  return (
    <AppShell title="Acuses de recibo" subtitle="Info acuse recibido">
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
            placeholder="Buscar por orden, cliente, serial, contrato o quien recibió..."
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button type="submit" label="Buscar" icon="pi pi-search" outlined />
        </form>

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
            emptyMessage="Aún no hay acuses recibidos desde el teléfono."
            tableStyle={{ minWidth: "78rem" }}
            stripedRows
            scrollable
          >
            <Column
              header="Orden"
              style={{ minWidth: "8rem" }}
              body={(row: InfoAcuseRecibido) => (
                <Tag value={formatOrdenNumero(row.numeroOrden)} severity="info" />
              )}
            />
            <Column
              header="Cliente"
              style={{ minWidth: "12rem" }}
              body={(row: InfoAcuseRecibido) => <strong>{titleCase(row.cliente)}</strong>}
            />
            <Column
              header="Contrato"
              style={{ minWidth: "8rem" }}
              body={(row: InfoAcuseRecibido) => row.contrato || "—"}
            />
            <Column
              header="Fecha"
              style={{ minWidth: "10rem" }}
              body={(row: InfoAcuseRecibido) => row.fecha || "—"}
            />
            <Column
              header="Modem/ONU"
              style={{ minWidth: "9rem" }}
              body={(row: InfoAcuseRecibido) => row.modemOnu || "—"}
            />
            <Column
              header="Router"
              style={{ minWidth: "9rem" }}
              body={(row: InfoAcuseRecibido) => row.router || "—"}
            />
            <Column
              header="Equipo digital"
              style={{ minWidth: "9rem" }}
              body={(row: InfoAcuseRecibido) => row.equipoDigital || "—"}
            />
            <Column
              header="Accesorios"
              style={{ minWidth: "12rem" }}
              body={(row: InfoAcuseRecibido) => accesoriosTexto(row.accesorios) || "—"}
            />
            <Column
              header="Recibió"
              style={{ minWidth: "10rem" }}
              body={(row: InfoAcuseRecibido) => titleCase(row.nombreFirma || "—")}
            />
            <Column
              header="Ciudad"
              style={{ minWidth: "8rem" }}
              body={(row: InfoAcuseRecibido) => titleCase(row.ciudad)}
            />
            <Column
              header="Colonia"
              style={{ minWidth: "8rem" }}
              body={(row: InfoAcuseRecibido) => titleCase(row.colonia)}
            />
            <Column
              header="Teléfono 1"
              style={{ minWidth: "9rem" }}
              body={(row: InfoAcuseRecibido) => telefonosFormateados(row.telefono)[0]}
            />
            <Column
              header="Teléfono 2"
              style={{ minWidth: "9rem" }}
              body={(row: InfoAcuseRecibido) => telefonosFormateados(row.telefono)[1]}
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
    </AppShell>
  );
}
