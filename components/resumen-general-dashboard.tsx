"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Dropdown } from "primereact/dropdown";
import { Message } from "primereact/message";
import { useAuth } from "@/components/auth-provider";
import { AppShell } from "@/components/app-shell";
import { apiRequest } from "@/lib/api-client";
import { titleCase } from "@/lib/format-orden";
import type {
  ResumenClienteGrupo,
  ResumenCodigosClientes,
} from "@/lib/informes-resumen";
import { esRolPanel } from "@/lib/roles";

const TODAS = "";

export function ResumenGeneralDashboard() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const [ciudad, setCiudad] = useState(TODAS);
  const [ciudades, setCiudades] = useState<string[]>([]);
  const [grupos, setGrupos] = useState<ResumenClienteGrupo[]>([]);
  const [total, setTotal] = useState(0);
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async (filtro: string) => {
    setLoading(true);
    setError(null);
    try {
      const suffix = filtro
        ? `?ciudad=${encodeURIComponent(filtro)}`
        : "";
      const data = await apiRequest<ResumenCodigosClientes>(
        `/api/v1/informes-recepcion/resumen-clientes${suffix}`,
      );
      setCiudades(data.ciudades);
      setGrupos(data.grupos);
      setTotal(data.total);
      setAbiertos(
        Object.fromEntries(data.grupos.map((grupo) => [grupo.empresa, true])),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo cargar el resumen",
      );
    } finally {
      setLoading(false);
    }
  }, []);

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
    void cargar(ciudad);
  }, [ready, user, router, cargar, ciudad]);

  const opcionesCiudad = useMemo(
    () => [
      { label: "All", value: TODAS },
      ...ciudades.map((item) => ({
        label: titleCase(item),
        value: item,
      })),
    ],
    [ciudades],
  );

  function toggleGrupo(empresa: string) {
    setAbiertos((actual) => ({
      ...actual,
      [empresa]: !actual[empresa],
    }));
  }

  if (!ready || !user || !esRolPanel(user.rol)) {
    return (
      <div className="flex flex-1 items-center justify-center text-[var(--text-color-secondary)]">
        Cargando...
      </div>
    );
  }

  return (
    <AppShell title="Resumen general" subtitle="Recuperación">
      <main className="mx-auto w-full flex-1 px-4 py-6 sm:px-6">
        <div className="rounded-md border border-[var(--surface-200)] bg-white px-4 py-8 sm:px-6">
          <header className="text-center">
            <p className="m-0 text-base uppercase tracking-wide text-[#5c2d91]">
              CABLE COLOR
            </p>
            <h1 className="m-0 mt-1 text-2xl font-bold uppercase tracking-wide text-black sm:text-3xl">
              RESUMEN GENERAL
            </h1>
            <p className="m-0 mt-1 text-base uppercase tracking-wide text-black">
              CONTROL DE RECEPCIÓN DE EQUIPOS
            </p>
          </header>

          {error ? (
            <div className="mt-4">
              <Message severity="error" text={error} />
            </div>
          ) : null}

          <section className="resumen-clientes mt-8">
            <h2 className="resumen-clientes-titulo">CÓDIGOS DE CLIENTES</h2>
            <label className="resumen-clientes-filtro">
              <span>CIUDAD</span>
              <Dropdown
                value={ciudad}
                options={opcionesCiudad}
                onChange={(event) => setCiudad(String(event.value ?? TODAS))}
                className="w-full"
                disabled={loading}
              />
            </label>

            {loading ? (
              <p className="m-0 py-8 text-center text-[var(--text-color-secondary)]">
                Cargando resumen...
              </p>
            ) : grupos.length === 0 ? (
              <p className="m-0 py-8 text-center text-[var(--text-color-secondary)]">
                Aún no hay códigos de cliente para resumir. Sube un archivo en
                Informes generales.
              </p>
            ) : (
              <div className="resumen-clientes-wrap">
                <table className="resumen-clientes-tabla">
                  <thead>
                    <tr>
                      <th>Empresa Ejecutora</th>
                      <th>Clientes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupos.map((grupo) => {
                      const abierto = abiertos[grupo.empresa] !== false;
                      return (
                        <GrupoClientes
                          key={grupo.empresa}
                          grupo={grupo}
                          abierto={abierto}
                          onToggle={() => toggleGrupo(grupo.empresa)}
                        />
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th>Total Clientes</th>
                      <th>{total}</th>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </AppShell>
  );
}

function GrupoClientes({
  grupo,
  abierto,
  onToggle,
}: {
  grupo: ResumenClienteGrupo;
  abierto: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="resumen-clientes-grupo">
        <td>
          <button
            type="button"
            className="resumen-clientes-toggle"
            aria-expanded={abierto}
            onClick={onToggle}
          >
            {abierto ? "−" : "+"}
          </button>
          {grupo.empresa}
        </td>
        <td>{grupo.clientes}</td>
      </tr>
      {abierto
        ? grupo.hijos.map((hijo) => (
            <tr key={`${grupo.empresa}-${hijo.empresaEjecutora}`}>
              <td className="resumen-clientes-hijo">{hijo.empresaEjecutora}</td>
              <td>{hijo.clientes}</td>
            </tr>
          ))
        : null}
    </>
  );
}
