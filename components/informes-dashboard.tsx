"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { useAuth } from "@/components/auth-provider";
import { AppShell } from "@/components/app-shell";
import { downloadPlantillaInformes, parseInformesExcel } from "@/lib/excel-informes";
import {
  COLUMNAS,
  FIJAS,
  GRUPOS,
  type FilaInforme,
} from "@/lib/informes-tabla";
import { esRolPanel } from "@/lib/roles";

const FILAS_VACIAS = 12;

export function InformesDashboard() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filas, setFilas] = useState<FilaInforme[]>([]);
  const [archivo, setArchivo] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!esRolPanel(user.rol)) {
      router.replace("/acceso-app");
    }
  }, [ready, user, router]);

  async function agregarArchivo(file: File) {
    setImporting(true);
    setError(null);
    setOk(null);
    try {
      if (file.size > 8 * 1024 * 1024) {
        throw new Error("El Excel no puede superar 8 MB");
      }
      const parsed = await parseInformesExcel(await file.arrayBuffer());
      setFilas(parsed.filas);
      setArchivo(file.name);
      setOk(`Se cargaron ${parsed.filas.length} filas desde ${file.name}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo leer el Excel");
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

  const filasTabla = filas.length > 0 ? filas : Array.from({ length: FILAS_VACIAS }, () => ({}));

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
              label={importing ? "Cargando archivo..." : "Agregar archivo"}
              icon="pi pi-upload"
              loading={importing}
              onClick={() => fileInputRef.current?.click()}
            />
            <Button
              type="button"
              label="Descargar plantilla"
              icon="pi pi-download"
              outlined
              onClick={() => void downloadPlantillaInformes()}
            />
            {archivo ? (
              <span className="text-sm text-[var(--text-color-secondary)]">{archivo}</span>
            ) : null}
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
          </div>
        </div>
      </main>
    </AppShell>
  );
}
