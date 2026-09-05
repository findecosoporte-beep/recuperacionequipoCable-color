"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import * as XLSX from "xlsx";
import { useAuth } from "@/components/auth-provider";
import { AppShell } from "@/components/app-shell";
import { apiRequest } from "@/lib/api-client";
import { inicioSemanaYmd, ymdEnZona } from "@/lib/fecha";
import { formatOrdenNumero } from "@/lib/format-orden";
import { imprimirHtml } from "@/lib/imprimir-html";
import {
  filasExcelReporte,
  htmlReporte,
  nombreArchivoReporte,
  TIPOS_REPORTE,
  tituloReporte,
  type FilaReporte,
  type ResumenReporte,
  type TipoReporte,
} from "@/lib/reportes";
import { esRolPanel } from "@/lib/roles";

interface ReporteRespuesta {
  tipo: TipoReporte;
  desde?: string;
  hasta?: string;
  total: number;
  truncated: boolean;
  items: FilaReporte[];
  resumen: ResumenReporte;
}

export function ReportesDashboard() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const [tipo, setTipo] = useState<TipoReporte>("recuperadas");
  const [desde, setDesde] = useState(() => inicioSemanaYmd(ymdEnZona()));
  const [hasta, setHasta] = useState(() => ymdEnZona());
  const [ciudad, setCiudad] = useState("");
  const [query, setQuery] = useState("");
  const [reporte, setReporte] = useState<ReporteRespuesta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ tipo, desde, hasta });
      if (ciudad.trim()) params.set("ciudad", ciudad.trim());
      if (query.trim()) params.set("q", query.trim());
      const data = await apiRequest<ReporteRespuesta>(`/api/v1/reportes?${params.toString()}`);
      setReporte(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar el reporte");
    } finally {
      setLoading(false);
    }
  }, [ciudad, desde, hasta, query, tipo]);

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
  }, [ready, user, router]);

  useEffect(() => {
    if (!ready || !user || !esRolPanel(user.rol)) return;
    void generar();
    // Solo al entrar o al cambiar el tipo del reporte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user, tipo]);

  function descargarExcel() {
    if (!reporte) return;
    const hoja = XLSX.utils.json_to_sheet(filasExcelReporte(reporte.tipo, reporte.items));
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, reporte.tipo === "por_anular" ? "Por anular" : "Recuperadas");
    XLSX.writeFile(libro, nombreArchivoReporte(reporte.tipo, reporte.desde, reporte.hasta));
  }

  if (!ready || !user || !esRolPanel(user.rol)) {
    return (
      <div className="flex flex-1 items-center justify-center text-[var(--text-color-secondary)]">
        Cargando...
      </div>
    );
  }

  const filas = reporte?.items ?? [];
  const resumen = reporte?.resumen;

  return (
    <AppShell title="Reportes" subtitle="Recuperadas y por anular">
      <main className="mx-auto grid w-full flex-1 grid-cols-4 gap-4 px-4 py-6 sm:px-6">
        <div className="col-span-4 flex flex-wrap gap-2">
          {TIPOS_REPORTE.map((item) => (
            <Button
              key={item.id}
              type="button"
              label={item.label}
              icon={item.id === "recuperadas" ? "pi pi-check-circle" : "pi pi-ban"}
              outlined={tipo !== item.id}
              severity={item.id === "por_anular" ? "danger" : undefined}
              onClick={() => setTipo(item.id)}
            />
          ))}
        </div>

        <form
          className="col-span-4 grid gap-3 md:grid-cols-5 md:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            void generar();
          }}
        >
          <label className="grid gap-1 text-sm font-medium">
            Desde
            <InputText type="date" value={desde} onChange={(event) => setDesde(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Hasta
            <InputText type="date" value={hasta} onChange={(event) => setHasta(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Ciudad
            <InputText
              value={ciudad}
              placeholder="Todas"
              onChange={(event) => setCiudad(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Buscar
            <InputText
              value={query}
              placeholder="Orden, cliente, teléfono..."
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <Button type="submit" label="Generar" icon="pi pi-chart-bar" loading={loading} />
        </form>

        {error ? (
          <div className="col-span-4">
            <Message severity="error" text={error} />
          </div>
        ) : null}

        {resumen ? (
          <div className="col-span-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-[var(--surface-200)] bg-[var(--surface-0)] px-4 py-3">
              <p className="m-0 text-xs uppercase tracking-wide text-[var(--text-color-secondary)]">Total</p>
              <p className="m-0 mt-1 text-2xl font-extrabold">{resumen.total}</p>
            </div>
            <div className="rounded-lg border border-[var(--surface-200)] bg-[var(--surface-0)] px-4 py-3">
              <p className="m-0 text-xs uppercase tracking-wide text-[var(--text-color-secondary)]">Ciudades</p>
              <p className="m-0 mt-1 text-2xl font-extrabold">{resumen.ciudades}</p>
            </div>
            <div className="rounded-lg border border-[var(--surface-200)] bg-[var(--surface-0)] px-4 py-3">
              <p className="m-0 text-xs uppercase tracking-wide text-[var(--text-color-secondary)]">Técnicos</p>
              <p className="m-0 mt-1 text-2xl font-extrabold">{resumen.tecnicos}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--surface-200)] bg-[var(--surface-0)] px-4 py-3">
              <Button
                type="button"
                label="Excel"
                icon="pi pi-file-excel"
                severity="success"
                disabled={filas.length === 0}
                onClick={descargarExcel}
              />
              <Button
                type="button"
                label="Imprimir / PDF"
                icon="pi pi-print"
                outlined
                disabled={filas.length === 0}
                onClick={() => {
                  imprimirHtml(htmlReporte(tipo, filas, desde, hasta));
                }}
              />
            </div>
          </div>
        ) : null}

        {reporte?.truncated ? (
          <div className="col-span-4">
            <Message severity="warn" text="El reporte se cortó en 2,000 órdenes. Acota el rango de fechas." />
          </div>
        ) : null}

        <div className="col-span-4">
          <DataTable
            value={filas}
            dataKey="id"
            loading={loading}
            emptyMessage={`No hay ${tituloReporte(tipo).toLowerCase()} en este rango.`}
            tableStyle={{ minWidth: "78rem" }}
            stripedRows
            scrollable
          >
            <Column
              header="Orden"
              style={{ minWidth: "8rem" }}
              body={(row: FilaReporte) => <Tag value={formatOrdenNumero(row.orden)} severity="info" />}
            />
            <Column field="cliente" header="Cliente" style={{ minWidth: "12rem" }} />
            <Column field="ciudad" header="Ciudad" style={{ minWidth: "9rem" }} />
            <Column field="colonia" header="Colonia" style={{ minWidth: "9rem" }} />
            <Column field="telefono1" header="Teléfono 1" style={{ minWidth: "8rem" }} />
            <Column field="tecnico" header="Técnico" style={{ minWidth: "9rem" }} />
            <Column field="fecha" header="Fecha" style={{ minWidth: "10rem" }} />
            {tipo === "por_anular" ? (
              <Column field="motivoAnulacion" header="Motivo" style={{ minWidth: "14rem" }} />
            ) : (
              <>
                <Column field="equipos" header="Equipos" style={{ minWidth: "12rem" }} />
                <Column field="recuperadoPor" header="Recuperó" style={{ minWidth: "9rem" }} />
              </>
            )}
          </DataTable>
        </div>
      </main>
    </AppShell>
  );
}
