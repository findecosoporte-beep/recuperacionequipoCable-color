"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { Message } from "primereact/message";
import { useAuth } from "@/components/auth-provider";
import { AppShell } from "@/components/app-shell";
import { apiRequest } from "@/lib/api-client";
import { downloadPlantillaInformes, parseInformesExcel } from "@/lib/excel-informes";
import {
  etiquetaPeriodo,
  opcionesPeriodoCarga,
  periodoEnZona,
} from "@/lib/fecha";
import {
  COLUMNAS,
  FIJAS,
  GRUPOS,
  type FilaInforme,
  type InformeRecepcionActual,
} from "@/lib/informes-tabla";
import { esRolPanel } from "@/lib/roles";

const FILAS_VACIAS = 12;
const TODOS = "";

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
  const [filas, setFilas] = useState<FilaInforme[]>([]);
  const [archivo, setArchivo] = useState<string | null>(null);
  const [guardadoEn, setGuardadoEn] = useState<string | null>(null);
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [periodoVista, setPeriodoVista] = useState(TODOS);
  const [periodoCarga, setPeriodoCarga] = useState(periodoEnZona);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const aplicarCarga = useCallback((data: InformeRecepcionActual) => {
    setFilas(data.filas);
    setArchivo(data.archivo);
    setGuardadoEn(data.createdAt);
    setPeriodos(data.periodos);
  }, []);

  const cargar = useCallback(
    async (periodo: string) => {
      setLoading(true);
      setError(null);
      try {
        const suffix = periodo ? `?periodo=${encodeURIComponent(periodo)}` : "";
        const data = await apiRequest<InformeRecepcionActual>(
          `/api/v1/informes-recepcion${suffix}`,
        );
        aplicarCarga(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "No se pudo cargar el informe",
        );
      } finally {
        setLoading(false);
      }
    },
    [aplicarCarga],
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
    void cargar(TODOS);
  }, [ready, user, router, cargar]);

  async function agregarArchivo(file: File) {
    setImporting(true);
    setError(null);
    setOk(null);
    try {
      if (file.size > 8 * 1024 * 1024) {
        throw new Error("El Excel no puede superar 8 MB");
      }
      const parsed = await parseInformesExcel(await file.arrayBuffer());
      const saved = await apiRequest<InformeRecepcionActual>(
        "/api/v1/informes-recepcion",
        {
          method: "POST",
          body: JSON.stringify({
            archivo: file.name,
            periodo: periodoCarga,
            filas: parsed.filas,
          }),
        },
      );
      aplicarCarga(saved);
      setPeriodoVista(TODOS);
      const mes = etiquetaPeriodo(saved.periodoGuardado ?? periodoCarga);
      const deEsteMes = saved.filasDelPeriodo ?? parsed.filas.length;
      setOk(
        `Se guardó ${mes} (${deEsteMes} filas). El acumulado tiene ${saved.total} filas.`,
      );
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

  const filasTabla: FilaInforme[] =
    filas.length > 0
      ? filas
      : Array.from({ length: FILAS_VACIAS }, (): FilaInforme => ({}));
  const fecha = fechaCarga(guardadoEn);
  const opcionesVista = [
    { label: "Todos los meses (acumulado)", value: TODOS },
    ...periodos.map((periodo) => ({
      label: etiquetaPeriodo(periodo),
      value: periodo,
    })),
  ];
  const opcionesCarga = opcionesPeriodoCarga(periodos).map((periodo) => ({
    label: etiquetaPeriodo(periodo),
    value: periodo,
  }));
  const reemplazaMes = periodos.includes(periodoCarga);

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

          <div className="mt-6 flex flex-wrap items-end gap-2">
            <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm sm:max-w-[16rem]">
              <span className="text-[var(--text-color-secondary)]">Ver</span>
              <Dropdown
                value={periodoVista}
                options={opcionesVista}
                onChange={(event) => {
                  const value = event.value ?? TODOS;
                  setPeriodoVista(value);
                  void cargar(value);
                }}
                className="w-full"
              />
            </label>
            <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm sm:max-w-[16rem]">
              <span className="text-[var(--text-color-secondary)]">
                Mes de este archivo
              </span>
              <Dropdown
                value={periodoCarga}
                options={opcionesCarga}
                onChange={(event) => setPeriodoCarga(event.value ?? periodoEnZona())}
                className="w-full"
              />
            </label>
            <Button
              type="button"
              label={importing ? "Guardando archivo..." : "Agregar archivo"}
              icon="pi pi-upload"
              loading={importing}
              disabled={loading}
              onClick={() => fileInputRef.current?.click()}
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
            {reemplazaMes
              ? `Si subes de nuevo ${etiquetaPeriodo(periodoCarga)}, se reemplaza solo ese mes. Los demás se quedan.`
              : "Cada mes se suma al acumulado. Elige el mes del Excel antes de subirlo."}
            {archivo ? ` Último archivo: ${archivo}${fecha ? ` · ${fecha}` : ""}.` : ""}
          </p>

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

          <div className="informes-tabla-wrap">
            {loading ? (
              <p className="m-0 py-8 text-center text-[var(--text-color-secondary)]">
                Cargando informe guardado...
              </p>
            ) : (
              <table className="informes-tabla">
                <colgroup>
                  {COLUMNAS.map((col) => (
                    <col key={col.key} style={{ width: col.width }} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    {FIJAS.map((col) => (
                      <th key={col.key} rowSpan={2}>
                        {col.label}
                      </th>
                    ))}
                    {GRUPOS.map((grupo) => (
                      <th key={grupo.label} colSpan={grupo.cols.length}>
                        {grupo.label}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    {GRUPOS.flatMap((grupo) =>
                      grupo.cols.map((col) => (
                        <th key={col.key}>{col.label}</th>
                      )),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filasTabla.map((fila, index) => (
                    <tr key={index}>
                      {COLUMNAS.map((col) => (
                        <td key={col.key}>{fila[col.key] ?? ""}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
