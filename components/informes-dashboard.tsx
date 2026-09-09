"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { InformeMesDialog } from "@/components/informe-mes-dialog";
import { InformeResumenBar } from "@/components/informe-resumen-bar";
import { InformeTablaDialog } from "@/components/informe-tabla-dialog";
import { useAuth } from "@/components/auth-provider";
import { AppShell } from "@/components/app-shell";
import { apiRequest } from "@/lib/api-client";
import { downloadPlantillaInformes, parseInformesExcel } from "@/lib/excel-informes";
import { etiquetaPeriodo } from "@/lib/fecha";
import {
  type FilaInforme,
  type InformeRecepcionActual,
  type InformeRecepcionCargaResumen,
} from "@/lib/informes-tabla";
import { esRolPanel } from "@/lib/roles";

function fechaCarga(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

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
      setError(err instanceof Error ? err.message : "No se pudo abrir la tabla");
      setTablaOpen(false);
    } finally {
      setTablaLoading(false);
    }
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

  if (!ready || !user || !esRolPanel(user.rol)) {
    return (
      <div className="flex flex-1 items-center justify-center text-[var(--text-color-secondary)]">
        Cargando...
      </div>
    );
  }

  return (
    <AppShell title="Informes generales" subtitle="Recuperación">
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
            Cada informe subido muestra el resumen de equipo pendiente. Pulsa
            Ver tabla para abrir el detalle.
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

          <div className="mt-6 grid gap-5">
            {loading ? (
              <p className="m-0 py-8 text-center text-[var(--text-color-secondary)]">
                Cargando informes...
              </p>
            ) : cargas.length === 0 ? (
              <p className="m-0 py-8 text-center text-[var(--text-color-secondary)]">
                Aún no hay informes. Agrega un archivo para ver el resumen.
              </p>
            ) : (
              cargas.map((carga) => (
                <article
                  key={carga.periodo}
                  className="rounded-md border border-[var(--surface-200)] p-4"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="m-0 text-base font-semibold uppercase">
                        {etiquetaPeriodo(carga.periodo)}
                      </h2>
                      <p className="m-0 mt-1 text-sm text-[var(--text-color-secondary)]">
                        {carga.archivo} · {carga.filas} filas
                        {fechaCarga(carga.createdAt)
                          ? ` · ${fechaCarga(carga.createdAt)}`
                          : ""}
                      </p>
                    </div>
                    <Button
                      type="button"
                      label="Ver tabla"
                      icon="pi pi-table"
                      outlined
                      onClick={() => void abrirTabla(carga)}
                    />
                  </div>
                  <InformeResumenBar pendiente={carga.pendiente} />
                </article>
              ))
            )}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
