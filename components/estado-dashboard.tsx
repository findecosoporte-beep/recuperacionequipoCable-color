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
import { esRolPanel } from "@/lib/roles";
import { AppShell } from "@/components/app-shell";
import { MarcarRecuperadaDialog } from "@/components/marcar-recuperada-dialog";
import { apiRequest, apiRequestWithMeta } from "@/lib/api-client";
import {
  estadoOrden,
  estadoOrdenLabel,
  estadoOrdenSeverity,
  equiposRecuperadosDe,
  withEquiposRecuperados,
  withRecupero,
  type EstadoAnulacion,
  type EstadoOrden,
} from "@/lib/estado-orden";
import { comentarioSinAcuse, resumenAcuse } from "@/lib/acuse";
import { parseNombreCliente } from "@/lib/nombre-cliente";
import {
  formatOrdenNumero,
  formatTelefono,
  titleCase,
  visiblePages,
} from "@/lib/format-orden";
import type { Orden } from "@/lib/types";

interface ListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type FiltroEstado = Extract<
  EstadoOrden,
  "recuperada" | "por_recuperar" | "por_anular" | "anulada"
>;

const FILTROS: Array<{
  id: FiltroEstado;
  label: string;
  icon: string;
  severity?: "warning" | "danger" | "secondary";
}> = [
  { id: "recuperada", label: "Recuperadas", icon: "pi pi-check-circle" },
  { id: "por_recuperar", label: "Por recuperar", icon: "pi pi-clock", severity: "warning" },
  { id: "por_anular", label: "Por anular", icon: "pi pi-ban", severity: "danger" },
  { id: "anulada", label: "Anuladas", icon: "pi pi-times-circle", severity: "secondary" },
];

function emptyMessage(filtro: FiltroEstado): string {
  switch (filtro) {
    case "recuperada":
      return "No hay órdenes recuperadas todavía";
    case "por_recuperar":
      return "No hay órdenes por recuperar";
    case "por_anular":
      return "No hay órdenes para anular";
    case "anulada":
      return "No hay órdenes anuladas";
  }
}

export function EstadoDashboard() {
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
  const [filtro, setFiltro] = useState<FiltroEstado>("recuperada");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recuperoOrden, setRecuperoOrden] = useState<Orden | null>(null);
  const requestId = useRef(0);
  const filtroRef = useRef(filtro);
  filtroRef.current = filtro;

  const load = useCallback(
    async (page = 1, search = query, pageSize = meta.limit, estado?: FiltroEstado) => {
      const selected = estado ?? filtroRef.current;
      const currentRequest = ++requestId.current;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(pageSize),
          estado: selected,
        });
        if (search.trim()) params.set("q", search.trim());
        const result = await apiRequestWithMeta<Orden[]>(
          `/api/v1/ordenes?${params.toString()}`,
        );
        if (currentRequest !== requestId.current) return;
        setItems(result.data);
        if (result.meta) setMeta(result.meta);
      } catch (err) {
        if (currentRequest !== requestId.current) return;
        setError(err instanceof Error ? err.message : "No se pudieron cargar las órdenes");
      } finally {
        if (currentRequest === requestId.current) setLoading(false);
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
    void load(1, query, meta.limit, filtro);
    // Recarga al entrar o al cambiar de filtro. La búsqueda usa el botón Buscar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user, router, filtro]);

  async function marcarRecuperada(orden: Orden, equipos: string) {
    setSavingId(orden.id);
    setError(null);
    try {
      const comentario = withEquiposRecuperados(withRecupero(orden.comentario, "si"), equipos);
      await apiRequest<Orden>(`/api/v1/ordenes/${orden.id}`, {
        method: "PATCH",
        body: JSON.stringify({ comentario, estadoAnulacion: null }),
      });
      setRecuperoOrden(null);
      setFiltro("recuperada");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo marcar como recuperada");
    } finally {
      setSavingId(null);
    }
  }

  async function quitarRecuperada(orden: Orden) {
    setSavingId(orden.id);
    setError(null);
    try {
      await apiRequest<Orden>(`/api/v1/ordenes/${orden.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          comentario: withRecupero(orden.comentario, "no"),
        }),
      });
      await load(meta.page, query, meta.limit, filtro);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo quitar la recuperación");
    } finally {
      setSavingId(null);
    }
  }

  async function setAnulacion(orden: Orden, estadoAnulacion: EstadoAnulacion | null) {
    setSavingId(orden.id);
    setError(null);
    try {
      await apiRequest<Orden>(`/api/v1/ordenes/${orden.id}`, {
        method: "PATCH",
        body: JSON.stringify({ estadoAnulacion }),
      });
      if (estadoAnulacion === "por_anular") {
        setFiltro("por_anular");
        return;
      }
      if (estadoAnulacion === "anulada") {
        setFiltro("anulada");
        return;
      }
      await load(meta.page, query, meta.limit, filtro);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el estado");
    } finally {
      setSavingId(null);
    }
  }

  function confirmarAnulacion(
    orden: Orden,
    siguiente: EstadoAnulacion | null,
    message: string,
    header: string,
    acceptLabel: string,
  ) {
    confirmDialog({
      message,
      header,
      icon: "pi pi-exclamation-triangle",
      acceptLabel,
      rejectLabel: "Cancelar",
      acceptClassName: siguiente === null ? undefined : "p-button-danger",
      accept: () => {
        void setAnulacion(orden, siguiente);
      },
    });
  }

  if (!ready || !user || !esRolPanel(user.rol)) {
    return (
      <div className="flex flex-1 items-center justify-center text-[var(--text-color-secondary)]">
        Cargando...
      </div>
    );
  }

  return (
    <AppShell title="Estado de recuperación" subtitle="Órdenes de campo">
      <ConfirmDialog />
      <MarcarRecuperadaDialog
        orden={recuperoOrden}
        saving={Boolean(recuperoOrden && savingId === recuperoOrden.id)}
        onClose={() => setRecuperoOrden(null)}
        onConfirm={(equipos) => {
          if (!recuperoOrden) return;
          void marcarRecuperada(recuperoOrden, equipos);
        }}
      />

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
            placeholder="Buscar orden..."
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button type="submit" label="Buscar" icon="pi pi-search" outlined />
        </form>

        <div className="col-span-4 flex flex-wrap gap-2">
          {FILTROS.map((item) => (
            <Button
              key={item.id}
              type="button"
              label={item.label}
              icon={item.icon}
              outlined={filtro !== item.id}
              severity={item.severity}
              data-estado={item.id}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setFiltro(item.id);
              }}
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
            emptyMessage={emptyMessage(filtro)}
            tableStyle={{ minWidth: "100%" }}
            stripedRows
          >
            <Column
              header="Orden"
              style={{ width: "11%" }}
              body={(row: Orden) => <Tag value={formatOrdenNumero(row.orden)} severity="info" />}
            />
            <Column
              header="Cliente"
              style={{ width: "14%" }}
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
              header="Teléfono"
              style={{ width: "11%" }}
              body={(row: Orden) => formatTelefono(row.telefono)}
            />
            <Column
              header="Estado"
              style={{ width: "11%" }}
              body={(row: Orden) => {
                const estado = estadoOrden(row);
                return (
                  <Tag value={estadoOrdenLabel(estado)} severity={estadoOrdenSeverity(estado)} />
                );
              }}
            />
            <Column
              header="Equipo / comentario"
              style={{ width: "16%" }}
              body={(row: Orden) => {
                const nota = comentarioSinAcuse(row.comentario);
                const equipos = equiposRecuperadosDe(nota) || resumenAcuse(row.acuse);
                const texto = equipos || nota || (row.acuse ? "Acuse recibido" : "Sin comentario");
                return (
                  <div className="flex flex-col gap-1">
                    <span>{titleCase(texto)}</span>
                    {row.acuse?.nombreFirma ? (
                      <span className="text-xs text-[var(--text-color-secondary)]">
                        Recibió: {row.acuse.nombreFirma}
                      </span>
                    ) : null}
                  </div>
                );
              }}
            />
            <Column
              header="Acciones"
              style={{ width: "16%" }}
              body={(row: Orden) => {
                const busy = savingId === row.id;
                if (filtro === "por_anular") {
                  return (
                    <div className="flex flex-wrap gap-1">
                      <Button
                        type="button"
                        label="Anulada"
                        size="small"
                        text
                        loading={busy}
                        onClick={() =>
                          confirmarAnulacion(
                            row,
                            "anulada",
                            `¿Marcar la orden ${formatOrdenNumero(row.orden)} como anulada?`,
                            "Confirmar anulación",
                            "Marcar anulada",
                          )
                        }
                      />
                      <Button
                        type="button"
                        label="Quitar"
                        size="small"
                        text
                        severity="secondary"
                        loading={busy}
                        onClick={() =>
                          confirmarAnulacion(
                            row,
                            null,
                            `¿Quitar ${formatOrdenNumero(row.orden)} de por anular?`,
                            "Quitar de anular",
                            "Quitar",
                          )
                        }
                      />
                    </div>
                  );
                }
                if (filtro === "anulada") {
                  return (
                    <Button
                      type="button"
                      label="Reabrir"
                      size="small"
                      text
                      loading={busy}
                      onClick={() =>
                        confirmarAnulacion(
                          row,
                          null,
                          `¿Reabrir la orden ${formatOrdenNumero(row.orden)}? Volverá a su lista de recuperación.`,
                          "Reabrir orden",
                          "Reabrir",
                        )
                      }
                    />
                  );
                }
                if (filtro === "recuperada") {
                  return (
                    <div className="flex flex-wrap gap-1">
                      <Button
                        type="button"
                        label="Quitar recuperada"
                        size="small"
                        text
                        severity="secondary"
                        loading={busy}
                        onClick={() =>
                          confirmDialog({
                            message: `¿Quitar la orden ${formatOrdenNumero(row.orden)} de recuperadas?`,
                            header: "Quitar recuperada",
                            icon: "pi pi-exclamation-triangle",
                            acceptLabel: "Quitar",
                            rejectLabel: "Cancelar",
                            accept: () => {
                              void quitarRecuperada(row);
                            },
                          })
                        }
                      />
                      <Button
                        type="button"
                        label="Mandar a anular"
                        size="small"
                        text
                        severity="danger"
                        loading={busy}
                        onClick={() =>
                          confirmarAnulacion(
                            row,
                            "por_anular",
                            `¿Mandar a anular la orden ${formatOrdenNumero(row.orden)}?`,
                            "Mandar a anular",
                            "Mandar a anular",
                          )
                        }
                      />
                    </div>
                  );
                }
                return (
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      label="Marcar recuperada"
                      size="small"
                      text
                      loading={busy}
                      onClick={() => setRecuperoOrden(row)}
                    />
                    <Button
                      type="button"
                      label="Mandar a anular"
                      size="small"
                      text
                      severity="danger"
                      loading={busy}
                      onClick={() =>
                        confirmarAnulacion(
                          row,
                          "por_anular",
                          `¿Mandar a anular la orden ${formatOrdenNumero(row.orden)}?`,
                          "Mandar a anular",
                          "Mandar a anular",
                        )
                      }
                    />
                  </div>
                );
              }}
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
