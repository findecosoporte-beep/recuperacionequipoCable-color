"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { AppShell } from "@/components/app-shell";
import { esRolPanel } from "@/lib/roles";

interface ColumnaInforme {
  key: string;
  label: string;
  width: string;
}

interface GrupoInforme {
  label: string;
  cols: ColumnaInforme[];
}

const FIJAS: ColumnaInforme[] = [
  { key: "n", label: "#", width: "2.5rem" },
  { key: "fechaCliente", label: "FECHA QUE ENTREGO EL CLIENTE", width: "7.5rem" },
];

const GRUPOS: GrupoInforme[] = [
  {
    label: "TIPO DE EQUIPO",
    cols: [
      { key: "cajaTvAnaloga", label: "CAJA TV ANALOGA", width: "5.5rem" },
      { key: "dtt", label: "DTT", width: "3.5rem" },
      { key: "dth", label: "DTH", width: "3.5rem" },
      { key: "modem", label: "MODEM", width: "4.5rem" },
      { key: "ont", label: "ONT", width: "3.5rem" },
      { key: "router", label: "ROUTER", width: "4.5rem" },
      { key: "otros", label: "OTROS", width: "4rem" },
      { key: "tipoEquipo", label: "TIPO DE EQUIPO", width: "7rem" },
      { key: "identificador", label: "IDENTIFICADOR", width: "8rem" },
    ],
  },
  {
    label: "DATOS DEL CLIENTE",
    cols: [
      { key: "modelo", label: "MODELO", width: "6rem" },
      { key: "codigoCliente", label: "Código de Cliente", width: "7rem" },
      { key: "contratoAnulado", label: "Contrato Anulado", width: "7rem" },
      { key: "numeroOrden", label: "Número Orden", width: "6.5rem" },
    ],
  },
  {
    label: "DATOS DEL EQUIPO",
    cols: [
      { key: "serie", label: "Serie", width: "7rem" },
      { key: "codigoBarra", label: "Código Barra", width: "7rem" },
      { key: "tarjeta", label: "Tarjeta", width: "6rem" },
    ],
  },
  {
    label: "ACCESORIOS",
    cols: [
      { key: "fuentePoder", label: "FUENTE PODER", width: "5.5rem" },
      { key: "cableHdmi", label: "CABLE HDMI", width: "5.5rem" },
      { key: "cableRca", label: "C- RCA", width: "4rem" },
      { key: "fix", label: "FIX", width: "3.5rem" },
      { key: "control", label: "CONTROL", width: "5rem" },
      { key: "patchCord", label: "PATCH CORD", width: "5.5rem" },
      { key: "cajaModem", label: "CAJA MODEM", width: "5.5rem" },
    ],
  },
  {
    label: "DATOS DE RECEPCION DE EQUIPO",
    cols: [
      {
        key: "tecnico",
        label: "NOMBRE DE TÉCNICO DE RECUPERACIÓN DE EQUIPOS",
        width: "11rem",
      },
      { key: "empresaEjecutora", label: "EMPRESA EJECUTORA", width: "8rem" },
      { key: "procedencia", label: "PROCEDENCIA", width: "7rem" },
      { key: "ciudad", label: "CIUDAD", width: "6rem" },
      { key: "region", label: "REGIÓN", width: "6rem" },
      { key: "empresa", label: "EMPRESA", width: "6rem" },
      { key: "supervisor", label: "SUPERVISOR", width: "8rem" },
    ],
  },
  {
    label: "EQUIPO PENDIENTE",
    cols: [
      { key: "cajaTvAnalogaP", label: "CAJA TV ANALOGA_P", width: "6rem" },
      { key: "dttP", label: "DTT_P", width: "4rem" },
      { key: "dthP", label: "DTH_P", width: "4rem" },
      { key: "modemP", label: "MODEM_P", width: "5rem" },
      { key: "ontP", label: "ONT_P", width: "4rem" },
      { key: "routerP", label: "ROUTER_P", width: "5rem" },
      { key: "otrosP", label: "OTROS_P", width: "4.5rem" },
      { key: "totalP", label: "TOTAL_P", width: "4.5rem" },
    ],
  },
];

const COLUMNAS: ColumnaInforme[] = [
  ...FIJAS,
  ...GRUPOS.flatMap((grupo) => grupo.cols),
];
const FILAS_VACIAS = 12;

export function InformesDashboard() {
  const router = useRouter();
  const { user, ready } = useAuth();

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
                {Array.from({ length: FILAS_VACIAS }, (_, index) => (
                  <tr key={index}>
                    {COLUMNAS.map((col) => (
                      <td key={col.key} />
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
