"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { InformeMesDialog } from "@/components/informe-mes-dialog";
import { InformeTabla } from "@/components/informe-tabla";
import { useAuth } from "@/components/auth-provider";
import { AppShell } from "@/components/app-shell";
import { apiRequest, apiRequestWithMeta } from "@/lib/api-client";
import { downloadPlantillaInformes, parseInformesExcel } from "@/lib/excel-informes";
import { etiquetaPeriodo } from "@/lib/fecha";
import { titleCase } from "@/lib/format-orden";
import {
  type FilaInforme,
  type InformeRecepcionActual,
} from "@/lib/informes-tabla";
import { esRolPanel } from "@/lib/roles";

const TODAS = "";

interface OpcionesFiltro {
  ciudades: string[];
  tiposEquipo: string[];
  empresas: string[];
  empresasEjecutoras: string[];
}

interface FilasResponse {
  filas: FilaInforme[];
  archivo: string | null;
  periodo: string | null;
  periodos: string[];
  opciones: OpcionesFiltro;
}

const OPCIONES_VACIAS: OpcionesFiltro = {
  ciudades: [],
  tiposEquipo: [],
  empresas: [],
  empresasEjecutoras: [],
};

export function InformesDashboard() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const periodoCargaRef = useRef("");
  const [filas, setFilas] = useState<FilaInforme[]>([]);
  const [archivo, setArchivo] = useState<string | null>(null);
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [periodoVista, setPeriodoVista] = useState("");
  const [periodoCarga, setPeriodoCarga] = useState("");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [ciudad, setCiudad] = useState(TODAS);
  const [tipoEquipo, setTipoEquipo] = useState(TODAS);
  const [empresaEjecutora, setEmpresaEjecutora] = useState(TODAS);
  const [opciones, setOpciones] = useState<OpcionesFiltro>(OPCIONES_VACIAS);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [mesDialogOpen, setMesDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const cargar = useCallback(
    async (
      periodo: string,
      filtros: {
        q: string;
        ciudad: string;
        tipoEquipo: string;
        empresaEjecutora: string;
      },
      pagina: number,
    ) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (periodo) params.set("periodo", periodo);
        if (filtros.q.trim()) params.set("q", filtros.q.trim());
        if (filtros.ciudad) params.set("ciudad", filtros.ciudad);
        if (filtros.tipoEquipo) params.set("tipoEquipo", filtros.tipoEquipo);
        if (filtros.empresaEjecutora) {
          params.set("empresaEjecutora", filtros.empresaEjecutora);
        }
        params.set("page", String(pagina));
        params.set("limit", "10");
        const result = await apiRequestWithMeta<FilasResponse>(
          `/api/v1/informes-recepcion/filas?${params.toString()}`,
        );
        setFilas(result.data.filas);
        setArchivo(result.data.archivo);
        setPeriodos(result.data.periodos);
        setOpciones(result.data.opciones);
        if (result.data.periodo) setPeriodoVista(result.data.periodo);
        setPage(result.meta?.page ?? pagina);
        setTotal(result.meta?.total ?? result.data.filas.length);
        setTotalPages(result.meta?.totalPages ?? 1);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "No se pudo cargar el informe",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
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
    void cargar(periodoVista, { q, ciudad, tipoEquipo, empresaEjecutora }, page);
  }, [
    ready,
    user,
    router,
    cargar,
    periodoVista,
    q,
    ciudad,
    tipoEquipo,
    empresaEjecutora,
    page,
  ]);

  function confirmarMes(periodo: string) {
    periodoCargaRef.current = periodo;
    setPeriodoCarga(periodo);
    setMesDialogOpen(false);
    window.setTimeout(() => fileInputRef.current?.click(), 0);
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
      const mesGuardado = saved.periodoGuardado ?? periodoCargaRef.current;
      setPeriodoVista(mesGuardado);
      setPage(1);
      const mes = etiquetaPeriodo(mesGuardado);
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

  const opcionesVista = periodos.map((periodo) => ({
    label: etiquetaPeriodo(periodo),
    value: periodo,
  }));

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
            {periodos.length > 0 ? (
              <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm sm:max-w-[16rem]">
                <span className="text-[var(--text-color-secondary)]">Ver mes</span>
                <Dropdown
                  value={periodoVista}
                  options={opcionesVista}
                  onChange={(event) => {
                    setPeriodoVista(String(event.value ?? ""));
                    setPage(1);
                  }}
                  className="w-full"
                />
              </label>
            ) : null}
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

          <form
            className="mt-4 grid gap-3 md:grid-cols-5 md:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              setQ(qInput.trim());
              setPage(1);
            }}
          >
            <label className="grid gap-1 text-sm">
              <span className="text-[var(--text-color-secondary)]">Buscar</span>
              <InputText
                value={qInput}
                placeholder="Código, orden, serie, técnico..."
                onChange={(event) => setQInput(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-[var(--text-color-secondary)]">Ciudad</span>
              <Dropdown
                value={ciudad}
                options={[
                  { label: "Todas", value: TODAS },
                  ...opciones.ciudades.map((item) => ({
                    label: titleCase(item),
                    value: item,
                  })),
                ]}
                onChange={(event) => {
                  setCiudad(String(event.value ?? TODAS));
                  setPage(1);
                }}
                className="w-full"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-[var(--text-color-secondary)]">
                Tipo de equipo
              </span>
              <Dropdown
                value={tipoEquipo}
                options={[
                  { label: "Todos", value: TODAS },
                  ...opciones.tiposEquipo.map((item) => ({
                    label: item,
                    value: item,
                  })),
                ]}
                onChange={(event) => {
                  setTipoEquipo(String(event.value ?? TODAS));
                  setPage(1);
                }}
                className="w-full"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-[var(--text-color-secondary)]">
                Empresa ejecutora
              </span>
              <Dropdown
                value={empresaEjecutora}
                options={[
                  { label: "Todas", value: TODAS },
                  ...opciones.empresasEjecutoras.map((item) => ({
                    label: item,
                    value: item,
                  })),
                ]}
                onChange={(event) => {
                  setEmpresaEjecutora(String(event.value ?? TODAS));
                  setPage(1);
                }}
                className="w-full"
              />
            </label>
            <Button type="submit" label="Filtrar" icon="pi pi-search" />
          </form>

          <p className="mt-3 mb-0 text-sm text-[var(--text-color-secondary)]">
            {archivo
              ? `${archivo}${total ? ` · ${total} filas` : ""}`
              : "Sube un Excel para ver las filas tal como vienen en el archivo."}
          </p>

          <InformeMesDialog
            open={mesDialogOpen}
            periodos={periodos}
            onClose={() => setMesDialogOpen(false)}
            onConfirm={confirmarMes}
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

          <div className="mt-6">
            {loading && filas.length === 0 ? (
              <p className="m-0 py-8 text-center text-[var(--text-color-secondary)]">
                Cargando informe...
              </p>
            ) : (
              <InformeTabla
                filas={filas}
                page={page}
                total={total}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            )}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
