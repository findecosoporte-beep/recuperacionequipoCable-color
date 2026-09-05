"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { useAuth } from "@/components/auth-provider";
import { AppShell } from "@/components/app-shell";
import { AsignarOrdenDialog, guardarAsignacionOrden } from "@/components/asignar-orden-dialog";
import { apiRequest, apiRequestWithMeta } from "@/lib/api-client";
import { formatOrdenNumero, titleCase, visiblePages } from "@/lib/format-orden";
import { parseNombreCliente } from "@/lib/nombre-cliente";
import { esRolPanel } from "@/lib/roles";
import type { BarrioAsignacion, CiudadAsignacion, Orden, ResumenAsignacion, Tecnico } from "@/lib/types";

interface ListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function AsignacionDashboard() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [tecnicoId, setTecnicoId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [vista, setVista] = useState<"ciudad" | "barrio" | "orden">("ciudad");
  const [resumen, setResumen] = useState<ResumenAsignacion | null>(null);
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [meta, setMeta] = useState<ListMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [asignarOrden, setAsignarOrden] = useState<Orden | null>(null);

  const loadTecnicos = useCallback(async () => {
    const result = await apiRequestWithMeta<Tecnico[]>(
      "/api/v1/tecnicos?limit=100&activo=true",
    );
    setTecnicos(result.data);
  }, []);

  const load = useCallback(
    async (selected = tecnicoId, search = query) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (selected) params.set("tecnicoId", selected);
        if (search.trim()) params.set("q", search.trim());
        const suffix = params.toString() ? `?${params.toString()}` : "";
        const data = await apiRequest<ResumenAsignacion>(`/api/v1/asignaciones${suffix}`);
        setResumen(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar la asignación");
      } finally {
        setLoading(false);
      }
    },
    [query, tecnicoId],
  );

  const loadOrdenes = useCallback(
    async (page = 1, search = query, pageSize = meta.limit) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(pageSize),
          estado: "por_recuperar",
        });
        if (search.trim()) params.set("q", search.trim());
        const result = await apiRequestWithMeta<Orden[]>(`/api/v1/ordenes?${params.toString()}`);
        setOrdenes(result.data);
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
    if (!esRolPanel(user.rol)) {
      router.replace("/acceso-app");
      return;
    }
    void loadTecnicos().catch((err) => {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los técnicos");
      setLoading(false);
    });
  }, [ready, user, router, loadTecnicos]);

  useEffect(() => {
    if (!ready || !user || !esRolPanel(user.rol)) return;
    if (vista === "orden") {
      void loadOrdenes(1, query);
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user, tecnicoId, vista]);

  if (!ready || !user || !esRolPanel(user.rol)) {
    return (
      <div className="flex flex-1 items-center justify-center text-[var(--text-color-secondary)]">
        Cargando...
      </div>
    );
  }

  const tecnico = tecnicos.find((item) => item.id === tecnicoId) ?? null;

  function etiquetaLugar(ciudad: string, colonia?: string) {
    const barrio = colonia?.trim() ? titleCase(colonia) : "sin barrio";
    return colonia !== undefined ? `${titleCase(ciudad)} · ${barrio}` : titleCase(ciudad);
  }

  async function asignar(lugar: { ciudad: string; colonia?: string }, modo: "libres" | "todas") {
    if (!tecnicoId) return;
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const result = await apiRequest<{ updated: number }>("/api/v1/asignaciones", {
        method: "POST",
        body: JSON.stringify({
          tecnicoId,
          ciudad: lugar.ciudad,
          colonia: lugar.colonia,
          modo,
        }),
      });
      const sitio = etiquetaLugar(lugar.ciudad, lugar.colonia);
      setOk(
        modo === "todas"
          ? `Se asignaron ${result.updated} órdenes pendientes de ${sitio} a ${tecnico?.nombre ?? "el técnico"}.`
          : `Se asignaron ${result.updated} órdenes libres de ${sitio}.`,
      );
      await load(tecnicoId, query);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo asignar");
    } finally {
      setSaving(false);
    }
  }

  async function liberar(lugar: { ciudad: string; colonia?: string }) {
    if (!tecnicoId) return;
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const result = await apiRequest<{ updated: number }>(
        "/api/v1/asignaciones/liberar",
        {
          method: "POST",
          body: JSON.stringify({
            tecnicoId,
            ciudad: lugar.ciudad,
            colonia: lugar.colonia,
          }),
        },
      );
      setOk(`Se liberaron ${result.updated} órdenes de ${etiquetaLugar(lugar.ciudad, lugar.colonia)}.`);
      await load(tecnicoId, query);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo liberar");
    } finally {
      setSaving(false);
    }
  }

  function confirmarAsignar(
    lugar: { ciudad: string; colonia?: string; total: number; libres: number },
    modo: "libres" | "todas",
  ) {
    if (!tecnico) return;
    const cantidad = modo === "libres" ? lugar.libres : lugar.total;
    const sitio = etiquetaLugar(lugar.ciudad, lugar.colonia);
    const ambito = lugar.colonia !== undefined ? "barrio" : "ciudad";
    confirmDialog({
      header: modo === "todas" ? `Asignar pendientes del ${ambito}` : "Asignar órdenes libres",
      message:
        modo === "todas"
          ? `¿Asignar las ${cantidad} órdenes pendientes de ${sitio} a ${tecnico.nombre}? Las ya recuperadas no se mueven.`
          : `¿Asignar ${cantidad} órdenes pendientes sin técnico de ${sitio} a ${tecnico.nombre}?`,
      icon: "pi pi-map-marker",
      acceptLabel: "Asignar",
      rejectLabel: "Cancelar",
      accept: () => {
        void asignar(lugar, modo);
      },
    });
  }

  async function asignarUnaOrden(siguienteTecnicoId: string | null) {
    if (!asignarOrden) return;
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const result = await guardarAsignacionOrden(asignarOrden.id, siguienteTecnicoId);
      const nombre = result.tecnico?.nombre;
      setOk(
        nombre
          ? `La orden ${formatOrdenNumero(result.orden)} quedó asignada a ${nombre}.`
          : `La orden ${formatOrdenNumero(result.orden)} quedó sin técnico.`,
      );
      setAsignarOrden(null);
      await loadOrdenes(meta.page, query);
      if (tecnicoId) await load(tecnicoId, query);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo asignar la orden");
    } finally {
      setSaving(false);
    }
  }

  function confirmarLiberar(lugar: { ciudad: string; colonia?: string; asignadas: number }) {
    if (!tecnico) return;
    const ambito = lugar.colonia !== undefined ? "barrio" : "ciudad";
    confirmDialog({
      header: `Quitar ${ambito}`,
      message: `¿Quitar las ${lugar.asignadas} órdenes pendientes de ${etiquetaLugar(lugar.ciudad, lugar.colonia)} a ${tecnico.nombre}? Las que él ya recuperó se quedan en su lista.`,
      icon: "pi pi-times",
      acceptLabel: "Liberar",
      rejectLabel: "Cancelar",
      acceptClassName: "p-button-danger",
      accept: () => {
        void liberar(lugar);
      },
    });
  }

  return (
    <AppShell title="Asignación" subtitle="Por ciudad, barrio u orden">
      <ConfirmDialog />
      <AsignarOrdenDialog
        orden={asignarOrden}
        tecnicos={tecnicos}
        saving={saving}
        defaultTecnicoId={tecnicoId}
        onClose={() => setAsignarOrden(null)}
        onConfirm={(siguienteTecnicoId) => {
          void asignarUnaOrden(siguienteTecnicoId);
        }}
      />

      <main className="mx-auto grid w-full flex-1 grid-cols-4 gap-4 px-4 py-6 sm:px-6">
        <div className="col-span-4 flex flex-wrap gap-2">
          <Button
            type="button"
            label="Por ciudad"
            icon="pi pi-map-marker"
            outlined={vista !== "ciudad"}
            onClick={() => {
              setQuery("");
              setVista("ciudad");
            }}
          />
          <Button
            type="button"
            label="Por barrio"
            icon="pi pi-home"
            outlined={vista !== "barrio"}
            onClick={() => {
              setQuery("");
              setVista("barrio");
            }}
          />
          <Button
            type="button"
            label="Por orden"
            icon="pi pi-list"
            outlined={vista !== "orden"}
            onClick={() => {
              setQuery("");
              setVista("orden");
            }}
          />
        </div>

        <form
          className="col-span-4 flex flex-col gap-3 lg:flex-row lg:items-center"
          onSubmit={(event) => {
            event.preventDefault();
            if (vista === "orden") {
              void loadOrdenes(1, query);
              return;
            }
            void load(tecnicoId, query);
          }}
        >
          {vista !== "orden" ? (
            <Dropdown
              value={tecnicoId}
              options={tecnicos.map((item) => ({
                label: item.zona
                  ? `${item.nombre} · ${item.zona}`
                  : item.nombre,
                value: item.id,
              }))}
              placeholder="Elige un técnico"
              className="w-full lg:max-w-sm"
              showClear
              onChange={(event) => setTecnicoId(event.value ?? null)}
            />
          ) : null}
          <InputText
            value={query}
            className="w-full"
            placeholder={
              vista === "orden"
                ? "Buscar orden, cliente, ciudad..."
                : vista === "barrio"
                  ? "Filtrar ciudad o barrio..."
                  : "Filtrar ciudad..."
            }
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button type="submit" label="Buscar" icon="pi pi-search" outlined />
        </form>

        <div className="col-span-4 rounded-md border border-[var(--surface-200)] bg-[var(--surface-0)] px-4 py-3 text-sm">
          {vista === "orden" ? (
            <p className="m-0">
              Elige <strong>Asignar</strong> en cada orden pendiente para dársela a un técnico
              o dejarla sin asignar. Las recuperadas y anuladas no se reasignan.
            </p>
          ) : tecnico ? (
            <p className="m-0">
              <strong>{tecnico.nombre}</strong> tiene{" "}
              <strong>{resumen?.totalAsignadas ?? 0}</strong> órdenes asignadas
              {tecnico.zona ? ` · zona ${titleCase(tecnico.zona)}` : ""}.
              {vista === "barrio"
                ? " Asigna un barrio para pasarle solo las órdenes pendientes de esa colonia."
                : " Asigna una ciudad para pasarle las órdenes pendientes de ese lugar."}{" "}
              Las que ya están recuperadas no se mueven y solo las ve quien las recuperó.
            </p>
          ) : (
            <p className="m-0 text-[var(--text-color-secondary)]">
              {vista === "barrio"
                ? "Elige un técnico para asignarle las órdenes pendientes de un barrio."
                : "Elige un técnico para asignarle las órdenes pendientes de una ciudad."}{" "}
              Las recuperadas no se reasignan.
            </p>
          )}
        </div>

        {ok ? (
          <div className="col-span-4">
            <Message severity="success" text={ok} />
          </div>
        ) : null}

        {error ? (
          <div className="col-span-4">
            <Message severity="error" text={error} />
          </div>
        ) : null}

        <div className="col-span-4">
          {vista === "orden" ? (
            <>
              <DataTable
                value={ordenes}
                dataKey="id"
                loading={loading || saving}
                emptyMessage="No hay órdenes por recuperar"
                tableStyle={{ minWidth: "100%" }}
                stripedRows
              >
                <Column
                  header="Orden"
                  style={{ width: "12%" }}
                  body={(row: Orden) => (
                    <Tag value={formatOrdenNumero(row.orden)} severity="info" />
                  )}
                />
                <Column
                  header="Cliente"
                  style={{ width: "22%" }}
                  body={(row: Orden) => {
                    const { nombre } = parseNombreCliente(row.cliente);
                    return <strong>{titleCase(nombre || row.cliente)}</strong>;
                  }}
                />
                <Column
                  header="Ciudad"
                  style={{ width: "16%" }}
                  body={(row: Orden) => titleCase(row.ciudad)}
                />
                <Column
                  header="Colonia"
                  style={{ width: "16%" }}
                  body={(row: Orden) => titleCase(row.colonia)}
                />
                <Column
                  header="Técnico"
                  style={{ width: "16%" }}
                  body={(row: Orden) =>
                    row.tecnico?.nombre ? (
                      <Tag value={titleCase(row.tecnico.nombre)} />
                    ) : (
                      "Sin asignar"
                    )
                  }
                />
                <Column
                  header="Acciones"
                  style={{ width: "18%" }}
                  body={(row: Orden) => (
                    <Button
                      type="button"
                      label="Asignar"
                      size="small"
                      icon="pi pi-user"
                      onClick={() => setAsignarOrden(row)}
                    />
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
                        void loadOrdenes(1, query, Number(event.target.value));
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
                    onClick={() => void loadOrdenes(meta.page - 1, query, meta.limit)}
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
                        onClick={() => void loadOrdenes(page, query, meta.limit)}
                      />
                    ),
                  )}
                  <Button
                    type="button"
                    label="Siguiente"
                    size="small"
                    outlined
                    disabled={meta.page >= meta.totalPages}
                    onClick={() => void loadOrdenes(meta.page + 1, query, meta.limit)}
                  />
                </div>
              </div>
            </>
          ) : vista === "barrio" ? (
          <DataTable
            key={`barrio-${tecnicoId ?? "sin-tecnico"}`}
            value={(resumen?.barrios ?? []).map((row) => ({
              ...row,
              id: `${row.ciudad}\0${row.colonia}`,
            }))}
            dataKey="id"
            loading={loading || saving}
            emptyMessage="No hay barrios con órdenes"
            tableStyle={{ minWidth: "100%" }}
            stripedRows
          >
            <Column
              header="Ciudad"
              style={{ width: "16%" }}
              body={(row: BarrioAsignacion) => (
                <strong>{titleCase(row.ciudad)}</strong>
              )}
            />
            <Column
              header="Barrio"
              style={{ width: "18%" }}
              body={(row: BarrioAsignacion) => titleCase(row.colonia) || "Sin barrio"}
            />
            <Column
              header="Total"
              style={{ width: "8%" }}
              body={(row: BarrioAsignacion) => row.total}
            />
            <Column
              header="Sin técnico"
              style={{ width: "10%" }}
              body={(row: BarrioAsignacion) =>
                row.libres > 0 ? (
                  <Tag value={String(row.libres)} severity="warning" />
                ) : (
                  "0"
                )
              }
            />
            <Column
              header="Este técnico"
              style={{ width: "10%" }}
              body={(row: BarrioAsignacion) =>
                row.asignadas > 0 ? (
                  <Tag value={String(row.asignadas)} severity="success" />
                ) : (
                  "0"
                )
              }
            />
            <Column
              header="Otro técnico"
              style={{ width: "10%" }}
              body={(row: BarrioAsignacion) =>
                row.otras > 0 ? <Tag value={String(row.otras)} /> : "0"
              }
            />
            <Column
              header="Acciones"
              style={{ width: "28%" }}
              body={(row: BarrioAsignacion) => (
                <div className="flex flex-wrap gap-1">
                  <Button
                    type="button"
                    label="Asignar libres"
                    size="small"
                    disabled={!tecnicoId || row.libres === 0}
                    onClick={() => confirmarAsignar(row, "libres")}
                  />
                  <Button
                    type="button"
                    label="Asignar pendientes"
                    size="small"
                    outlined
                    disabled={!tecnicoId || row.total === 0}
                    onClick={() => confirmarAsignar(row, "todas")}
                  />
                  <Button
                    type="button"
                    label="Liberar"
                    size="small"
                    text
                    severity="danger"
                    disabled={!tecnicoId || row.asignadas === 0}
                    onClick={() => confirmarLiberar(row)}
                  />
                </div>
              )}
            />
          </DataTable>
          ) : (
          <DataTable
            key={tecnicoId ?? "sin-tecnico"}
            value={resumen?.ciudades ?? []}
            dataKey="ciudad"
            loading={loading || saving}
            emptyMessage="No hay ciudades con órdenes"
            tableStyle={{ minWidth: "100%" }}
            stripedRows
          >
            <Column
              header="Ciudad"
              style={{ width: "22%" }}
              body={(row: CiudadAsignacion) => (
                <strong>{titleCase(row.ciudad)}</strong>
              )}
            />
            <Column
              header="Total"
              style={{ width: "10%" }}
              body={(row: CiudadAsignacion) => row.total}
            />
            <Column
              header="Sin técnico"
              style={{ width: "12%" }}
              body={(row: CiudadAsignacion) =>
                row.libres > 0 ? (
                  <Tag value={String(row.libres)} severity="warning" />
                ) : (
                  "0"
                )
              }
            />
            <Column
              header="Este técnico"
              style={{ width: "12%" }}
              body={(row: CiudadAsignacion) =>
                row.asignadas > 0 ? (
                  <Tag value={String(row.asignadas)} severity="success" />
                ) : (
                  "0"
                )
              }
            />
            <Column
              header="Otro técnico"
              style={{ width: "12%" }}
              body={(row: CiudadAsignacion) =>
                row.otras > 0 ? <Tag value={String(row.otras)} /> : "0"
              }
            />
            <Column
              header="Acciones"
              style={{ width: "32%" }}
              body={(row: CiudadAsignacion) => (
                <div className="flex flex-wrap gap-1">
                  <Button
                    type="button"
                    label="Asignar libres"
                    size="small"
                    disabled={!tecnicoId || row.libres === 0}
                    onClick={() => confirmarAsignar(row, "libres")}
                  />
                  <Button
                    type="button"
                    label="Asignar pendientes"
                    size="small"
                    outlined
                    disabled={!tecnicoId || row.total === 0}
                    onClick={() => confirmarAsignar(row, "todas")}
                  />
                  <Button
                    type="button"
                    label="Liberar"
                    size="small"
                    text
                    severity="danger"
                    disabled={!tecnicoId || row.asignadas === 0}
                    onClick={() => confirmarLiberar(row)}
                  />
                </div>
              )}
            />
          </DataTable>
          )}
        </div>
      </main>
    </AppShell>
  );
}
