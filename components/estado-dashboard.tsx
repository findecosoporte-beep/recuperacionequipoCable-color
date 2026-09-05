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
import { MotivoAnulacionDialog } from "@/components/motivo-anulacion-dialog";
import { WhatsAppPorRecuperarDialog } from "@/components/whatsapp-por-recuperar-dialog";
import { RecuperadasPorSemana } from "@/components/recuperadas-por-semana";
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
import { accesoriosTexto, comentarioSinAcuse, resumenAcuse } from "@/lib/acuse";
import { parseNombreCliente } from "@/lib/nombre-cliente";
import {
  formatOrdenNumero,
  telefonosFormateados,
  titleCase,
  visiblePages,
} from "@/lib/format-orden";
import {
  formatFechaHora,
  inicioSemanaYmd,
  sumarDiasYmd,
  ymdEnZona,
} from "@/lib/fecha";
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
  const [anularOrden, setAnularOrden] = useState<Orden | null>(null);
  const [whatsappAbierto, setWhatsappAbierto] = useState(false);
  const [vista, setVista] = useState<"lista" | "semana">("lista");
  const [semanaInicio, setSemanaInicio] = useState(() => inicioSemanaYmd());
  const requestId = useRef(0);
  const filtroRef = useRef(filtro);
  const vistaRef = useRef(vista);
  const semanaRef = useRef(semanaInicio);
  filtroRef.current = filtro;
  vistaRef.current = vista;
  semanaRef.current = semanaInicio;

  const load = useCallback(
    async (page = 1, search = query, pageSize = meta.limit, estado?: FiltroEstado) => {
      const selected = estado ?? filtroRef.current;
      const currentRequest = ++requestId.current;
      const esSemana = selected === "recuperada" && vistaRef.current === "semana";
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(esSemana ? 1 : page),
          limit: String(esSemana ? 100 : pageSize),
          estado: selected,
        });
        if (search.trim()) params.set("q", search.trim());
        if (selected === "recuperada") {
          params.set("sort", "recuperadaEn");
          params.set("order", "desc");
          if (esSemana) {
            params.set("desde", semanaRef.current);
            params.set("hasta", sumarDiasYmd(semanaRef.current, 6));
          }
        }
        const result = await apiRequestWithMeta<Orden[]>(
          `/api/v1/ordenes?${params.toString()}`,
        );
        if (currentRequest !== requestId.current) return;
        setItems(result.data);
        if (result.meta) {
          setMeta(
            esSemana ? { ...result.meta, limit: pageSize, page: 1 } : result.meta,
          );
        }
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
    // Recarga al entrar, al cambiar de filtro o de vista semanal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user, router, filtro, vista, semanaInicio]);

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

  async function setAnulacion(
    orden: Orden,
    estadoAnulacion: EstadoAnulacion | null,
    motivoAnulacion?: string | null,
  ) {
    setSavingId(orden.id);
    setError(null);
    try {
      await apiRequest<Orden>(`/api/v1/ordenes/${orden.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          estadoAnulacion,
          ...(estadoAnulacion === null
            ? { motivoAnulacion: null }
            : motivoAnulacion !== undefined
              ? { motivoAnulacion }
              : {}),
        }),
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
      <MotivoAnulacionDialog
        orden={anularOrden}
        saving={Boolean(anularOrden && savingId === anularOrden.id)}
        onClose={() => setAnularOrden(null)}
        onConfirm={(motivo) => {
          if (!anularOrden) return;
          setAnularOrden(null);
          void setAnulacion(anularOrden, "por_anular", motivo);
        }}
      />
      <WhatsAppPorRecuperarDialog
        visible={whatsappAbierto}
        search={query}
        onClose={() => setWhatsappAbierto(false)}
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

        {filtro === "recuperada" ? (
          <div className="col-span-4 flex flex-wrap gap-2">
            <Button
              type="button"
              label="Por fecha y hora"
              icon="pi pi-clock"
              outlined={vista !== "lista"}
              onClick={() => setVista("lista")}
            />
            <Button
              type="button"
              label="Semanal"
              icon="pi pi-calendar"
              outlined={vista !== "semana"}
              onClick={() => setVista("semana")}
            />
          </div>
        ) : null}

        {filtro === "por_recuperar" ? (
          <div className="col-span-4 flex flex-col gap-3 rounded-md border border-[var(--surface-200)] bg-[var(--surface-0)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="m-0 font-semibold">Aviso por WhatsApp</p>
              <p className="mt-1 mb-0 text-sm text-[var(--text-color-secondary)]">
                Un solo mensaje para todos, al Teléfono 1 de cada cliente.
              </p>
            </div>
            <Button
              type="button"
              label="Enviar un mensaje a todos"
              icon="pi pi-whatsapp"
              severity="success"
              onClick={() => setWhatsappAbierto(true)}
            />
          </div>
        ) : null}

        {error ? (
          <div className="col-span-4">
            <Message severity="error" text={error} />
          </div>
        ) : null}

        <div className="col-span-4">
          {filtro === "recuperada" && vista === "semana" ? (
            <RecuperadasPorSemana
              items={items}
              semanaInicio={semanaInicio}
              loading={loading}
              onPrev={() => setSemanaInicio(sumarDiasYmd(semanaInicio, -7))}
              onNext={() => setSemanaInicio(sumarDiasYmd(semanaInicio, 7))}
              onHoy={() => setSemanaInicio(inicioSemanaYmd(ymdEnZona()))}
            />
          ) : (
            <>
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
              header="Teléfono 1"
              style={{ width: "10%" }}
              body={(row: Orden) => telefonosFormateados(row.telefono)[0]}
            />
            <Column
              header="Teléfono 2"
              style={{ width: "10%" }}
              body={(row: Orden) => telefonosFormateados(row.telefono)[1]}
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
            {filtro === "por_anular" || filtro === "anulada" ? (
              <Column
                header="Motivo"
                style={{ width: "18%" }}
                body={(row: Orden) =>
                  row.motivoAnulacion ? (
                    <span className="text-sm">{row.motivoAnulacion}</span>
                  ) : (
                    "—"
                  )
                }
              />
            ) : null}
            {filtro === "recuperada" ? (
              <>
                <Column
                  header="Fecha y hora"
                  style={{ width: "12%" }}
                  body={(row: Orden) => formatFechaHora(row.recuperadaEn)}
                />
                <Column
                  header="Modem/ONU"
                  style={{ width: "9%" }}
                  body={(row: Orden) => row.acuse?.modemOnu || "—"}
                />
                <Column
                  header="Router"
                  style={{ width: "9%" }}
                  body={(row: Orden) => row.acuse?.router || "—"}
                />
                <Column
                  header="Equipo digital"
                  style={{ width: "9%" }}
                  body={(row: Orden) => row.acuse?.equipoDigital || "—"}
                />
                <Column
                  header="Accesorios"
                  style={{ width: "12%" }}
                  body={(row: Orden) => accesoriosTexto(row.acuse?.accesorios) || "—"}
                />
                <Column
                  header="Recibió"
                  style={{ width: "10%" }}
                  body={(row: Orden) =>
                    row.acuse?.nombreFirma ? titleCase(row.acuse.nombreFirma) : "—"
                  }
                />
              </>
            ) : (
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
            )}
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
                        onClick={() => setAnularOrden(row)}
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
                      onClick={() => setAnularOrden(row)}
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
            </>
          )}
        </div>
      </main>
    </AppShell>
  );
}
