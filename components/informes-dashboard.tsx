"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { DataTable } from "primereact/datatable";
import { Message } from "primereact/message";
import { InformeMesDialog } from "@/components/informe-mes-dialog";
import { InformeTablaDialog } from "@/components/informe-tabla-dialog";
import { useAuth } from "@/components/auth-provider";
import { AppShell } from "@/components/app-shell";
import { apiRequest } from "@/lib/api-client";
import {
  downloadInformeExcel,
  downloadPlantillaInformes,
  parseInformesExcel,
} from "@/lib/excel-informes";
import { etiquetaPeriodo, formatFechaHora, nombreMesDePeriodo } from "@/lib/fecha";
import { titleCase } from "@/lib/format-orden";
import {
  type FilaInforme,
  type InformeRecepcionActual,
  type InformeRecepcionCargaResumen,
} from "@/lib/informes-tabla";
import { esRolPanel } from "@/lib/roles";

export function InformesDashboard() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const periodoCargaRef = useRef("");
  const [cargas, setCargas] = useState<InformeRecepcionCargaResumen[]>([]);
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [periodoCarga, setPeriodoCarga] = useState("");
  const [mesDialogOpen, setMesDialogOpen] = useState(false);
  const [tablaOpen, setTablaOpen] = useState(false);
  const [tablaPeriodo, setTablaPeriodo] = useState<string | null>(null);
  const [tablaArchivo, setTablaArchivo] = useState<string | null>(null);
  const [tablaFilas, setTablaFilas] = useState<FilaInforme[]>([]);
  const [tablaLoading, setTablaLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const aplicarLista = useCallback((data: InformeRecepcionActual) => {
    setCargas(data.cargas);
    setPeriodos(data.periodos);
  }, []);

  const cargarLista = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<InformeRecepcionActual>("/api/v1/informes-recepcion");
      aplicarLista(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo cargar el informe",
      );
    } finally {
      setLoading(false);
    }
  }, [aplicarLista]);

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
    void cargarLista();
  }, [ready, user, router, cargarLista]);

  function confirmarMes(periodo: string) {
    periodoCargaRef.current = periodo;
    setPeriodoCarga(periodo);
    setMesDialogOpen(false);
    window.setTimeout(() => fileInputRef.current?.click(), 0);
  }

  async function abrirTabla(carga: InformeRecepcionCargaResumen) {
    setTablaPeriodo(carga.periodo);
    setTablaArchivo(carga.archivo);
    setTablaFilas([]);
    setTablaOpen(true);
    setTablaLoading(true);
    setError(null);
    try {
      const data = await apiRequest<InformeRecepcionActual>(
        `/api/v1/informes-recepcion?periodo=${encodeURIComponent(carga.periodo)}`,
      );
      setTablaFilas(data.filas);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo abrir el informe");
      setTablaOpen(false);
    } finally {
      setTablaLoading(false);
    }
  }

  async function descargarInforme(carga: InformeRecepcionCargaResumen) {
    setDownloading(carga.periodo);
    setError(null);
    try {
      const data = await apiRequest<InformeRecepcionActual>(
        `/api/v1/informes-recepcion?periodo=${encodeURIComponent(carga.periodo)}`,
      );
      await downloadInformeExcel(
        data.filas,
        carga.archivo || `informe-${carga.periodo}.xlsx`,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo descargar el informe",
      );
    } finally {
      setDownloading(null);
    }
  }

  async function eliminarInforme(carga: InformeRecepcionCargaResumen) {
    setDeleting(carga.periodo);
    setError(null);
    setOk(null);
    try {
      const data = await apiRequest<InformeRecepcionActual>(
        `/api/v1/informes-recepcion?periodo=${encodeURIComponent(carga.periodo)}`,
        { method: "DELETE" },
      );
      aplicarLista(data);
      if (tablaPeriodo === carga.periodo) {
        setTablaOpen(false);
        setTablaFilas([]);
        setTablaPeriodo(null);
      }
      setOk(`Se eliminó el informe de ${etiquetaPeriodo(carga.periodo)}.`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo eliminar el informe",
      );
    } finally {
      setDeleting(null);
    }
  }

  function confirmarEliminar(carga: InformeRecepcionCargaResumen) {
    confirmDialog({
      header: "Eliminar informe",
      message: `¿Eliminar el informe de ${etiquetaPeriodo(carga.periodo)} (${carga.archivo})? Esta acción no se puede deshacer.`,
      acceptLabel: "Eliminar",
      rejectLabel: "Cancelar",
      acceptClassName: "p-button-danger",
      accept: () => void eliminarInforme(carga),
    });
  }

  async function agregarArchivo(file: File) {
    setImporting(true);
    setError(null);
    setOk(null);
    try {
      if (file.size > 15 * 1024 * 1024) {
        throw new Error("El Excel no puede superar 15 MB");
      }
      const parsed = await parseInformesExcel(await file.arrayBuffer());
      const saved = await apiRequest<InformeRecepcionActual>(
        "/api/v1/informes-recepcion",
        {
          method: "POST",
          body: JSON.stringify({
            archivo: file.name,
            periodo: periodoCargaRef.current || periodoCarga,
            filas: parsed.filas,
          }),
        },
      );
      aplicarLista(saved);
      const mes = etiquetaPeriodo(saved.periodoGuardado ?? periodoCarga);
      const deEsteMes = saved.filasDelPeriodo ?? parsed.filas.length;
      setOk(`Se guardó ${mes} (${deEsteMes} filas).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el Excel");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const ocupado = Boolean(downloading || deleting);

  if (!ready || !user || !esRolPanel(user.rol)) {
    return (
      <div className="flex flex-1 items-center justify-center text-[var(--text-color-secondary)]">
        Cargando...
      </div>
    );
  }

  return (
    <AppShell title="Informes generales" subtitle="Recuperación">
      <ConfirmDialog />
      <main className="mx-auto w-full flex-1 px-4 py-6 sm:px-6">
        <div className="rounded-md border border-[var(--surface-200)] bg-white px-4 py-8 sm:px-6">
          <header className="text-center">
            <p className="m-0 text-base uppercase tracking-wide text-[#5c2d91]">
              CABLE COLOR
            </p>
            <h1 className="m-0 mt-1 text-2xl font-bold uppercase tracking-wide text-black sm:text-3xl">
              ADMINISTRACION DE EQUIPOS
            </h1>
            <p className="m-0 mt-1 text-base uppercase tracking-wide text-black">
              CONTROL DE RECEPCIÓN DE EQUIPOS
            </p>
          </header>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              label={importing ? "Guardando archivo..." : "Agregar archivo"}
              icon="pi pi-upload"
              loading={importing}
              disabled={loading}
              onClick={() => setMesDialogOpen(true)}
            />
            <Button
              type="button"
              label="Descargar plantilla"
              icon="pi pi-download"
              outlined
              onClick={() => void downloadPlantillaInformes()}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void agregarArchivo(file);
              }}
            />
          </div>

          <p className="mt-3 mb-0 text-sm text-[var(--text-color-secondary)]">
            Gestiona los informes por mes. En Acciones puedes ver el informe,
            descargar el Excel o eliminarlo.
          </p>

          <InformeMesDialog
            open={mesDialogOpen}
            periodos={periodos}
            onClose={() => setMesDialogOpen(false)}
            onConfirm={confirmarMes}
          />
          <InformeTablaDialog
            open={tablaOpen}
            periodo={tablaPeriodo}
            archivo={tablaArchivo}
            loading={tablaLoading}
            filas={tablaFilas}
            onClose={() => setTablaOpen(false)}
          />

          {error ? (
            <div className="mt-4">
              <Message severity="error" text={error} />
            </div>
          ) : null}
          {ok ? (
            <div className="mt-4">
              <Message severity="success" text={ok} />
            </div>
          ) : null}

          <div className="mt-6 overflow-auto">
            <DataTable
              value={cargas}
              dataKey="periodo"
              loading={loading}
              emptyMessage="Aún no hay informes. Agrega un archivo para empezar."
              size="small"
              stripedRows
              tableStyle={{ minWidth: "52rem" }}
            >
              <Column
                header="Fecha informe"
                style={{ width: "20%" }}
                body={(row: InformeRecepcionCargaResumen) =>
                  formatFechaHora(row.createdAt)
                }
              />
              <Column
                header="Mes de"
                style={{ width: "16%" }}
                body={(row: InformeRecepcionCargaResumen) => (
                  <span>
                    {nombreMesDePeriodo(row.periodo)}{" "}
                    {row.periodo.slice(0, 4)}
                  </span>
                )}
              />
              <Column
                header="Usuario"
                style={{ width: "18%" }}
                body={(row: InformeRecepcionCargaResumen) =>
                  titleCase(row.usuario ?? "")
                }
              />
              <Column
                header="Reporte"
                style={{ width: "28%" }}
                body={(row: InformeRecepcionCargaResumen) => (
                  <div>
                    <div className="font-medium">{row.archivo}</div>
                    <div className="text-sm text-[var(--text-color-secondary)]">
                      {row.filas} filas
                    </div>
                  </div>
                )}
              />
              <Column
                header="Acciones"
                style={{ width: "18%" }}
                body={(row: InformeRecepcionCargaResumen) => (
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      label="Ver"
                      icon="pi pi-table"
                      size="small"
                      text
                      onClick={() => void abrirTabla(row)}
                    />
                    <Button
                      type="button"
                      label="Descargar"
                      icon="pi pi-download"
                      size="small"
                      text
                      loading={downloading === row.periodo}
                      disabled={ocupado}
                      onClick={() => void descargarInforme(row)}
                    />
                    <Button
                      type="button"
                      label="Eliminar"
                      icon="pi pi-trash"
                      size="small"
                      text
                      severity="danger"
                      loading={deleting === row.periodo}
                      disabled={ocupado}
                      onClick={() => confirmarEliminar(row)}
                    />
                  </div>
                )}
              />
            </DataTable>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
