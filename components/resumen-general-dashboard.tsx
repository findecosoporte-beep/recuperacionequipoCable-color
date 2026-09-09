"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dropdown } from "primereact/dropdown";
import { Message } from "primereact/message";
import { InformeResumenBar } from "@/components/informe-resumen-bar";
import { useAuth } from "@/components/auth-provider";
import { AppShell } from "@/components/app-shell";
import { apiRequest } from "@/lib/api-client";
import { etiquetaPeriodo } from "@/lib/fecha";
import { titleCase } from "@/lib/format-orden";
import type {
  ResumenClienteGrupo,
  ResumenCodigosClientes,
  ResumenEquipoPendiente,
} from "@/lib/informes-resumen";
import { esRolPanel } from "@/lib/roles";

const TODAS = "";

export function ResumenGeneralDashboard() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const [ciudad, setCiudad] = useState(TODAS);
  const [tipoEquipo, setTipoEquipo] = useState(TODAS);
  const [empresaEjecutora, setEmpresaEjecutora] = useState(TODAS);
  const [ciudades, setCiudades] = useState<string[]>([]);
  const [tiposEquipo, setTiposEquipo] = useState<string[]>([]);
  const [empresasEjecutoras, setEmpresasEjecutoras] = useState<string[]>([]);
  const [grupos, setGrupos] = useState<ResumenClienteGrupo[]>([]);
  const [total, setTotal] = useState(0);
  const [pendiente, setPendiente] = useState<ResumenEquipoPendiente | null>(null);
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(
    async (filtros: {
      ciudad: string;
      tipoEquipo: string;
      empresaEjecutora: string;
    }) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filtros.ciudad) params.set("ciudad", filtros.ciudad);
      if (filtros.tipoEquipo) params.set("tipoEquipo", filtros.tipoEquipo);
      if (filtros.empresaEjecutora) {
        params.set("empresaEjecutora", filtros.empresaEjecutora);
      }
      const suffix = params.toString() ? `?${params.toString()}` : "";
      const [clientes, equipo] = await Promise.all([
        apiRequest<ResumenCodigosClientes>(
          `/api/v1/informes-recepcion/resumen-clientes${suffix}`,
        ),
        apiRequest<ResumenEquipoPendiente>(
          `/api/v1/informes-recepcion/resumen-pendiente${suffix}`,
        ),
      ]);
      setCiudades(clientes.ciudades.length ? clientes.ciudades : equipo.ciudades);
      setTiposEquipo(clientes.tiposEquipo ?? []);
      setEmpresasEjecutoras(clientes.empresasEjecutoras ?? []);
      setGrupos(clientes.grupos);
      setTotal(clientes.total);
      setPendiente(equipo);
      setAbiertos(
        Object.fromEntries(clientes.grupos.map((grupo) => [grupo.empresa, true])),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo cargar el resumen",
      );
    } finally {
      setLoading(false);
    }
  },
  []);

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
    void cargar({ ciudad, tipoEquipo, empresaEjecutora });
  }, [ready, user, router, cargar, ciudad, tipoEquipo, empresaEjecutora]);

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

          <div className="mt-8 grid gap-3 md:grid-cols-3 md:items-end">
            <label className="resumen-clientes-filtro">
              <span>CIUDAD</span>
              <Dropdown
                value={ciudad}
                options={[
                  { label: "All", value: TODAS },
                  ...ciudades.map((item) => ({
                    label: titleCase(item),
                    value: item,
                  })),
                ]}
                onChange={(event) => setCiudad(String(event.value ?? TODAS))}
                className="w-full"
                disabled={loading}
              />
            </label>
            <label className="resumen-clientes-filtro">
              <span>TIPO DE EQUIPO</span>
              <Dropdown
                value={tipoEquipo}
                options={[
                  { label: "All", value: TODAS },
                  ...tiposEquipo.map((item) => ({
                    label: item,
                    value: item,
                  })),
                ]}
                onChange={(event) => setTipoEquipo(String(event.value ?? TODAS))}
                className="w-full"
                disabled={loading}
              />
            </label>
            <label className="resumen-clientes-filtro">
              <span>EMPRESA EJECUTORA</span>
              <Dropdown
                value={empresaEjecutora}
                options={[
                  { label: "All", value: TODAS },
                  ...empresasEjecutoras.map((item) => ({
                    label: item,
                    value: item,
                  })),
                ]}
                onChange={(event) =>
                  setEmpresaEjecutora(String(event.value ?? TODAS))
                }
                className="w-full"
                disabled={loading}
              />
            </label>
          </div>

          <section className="mt-6">
            <h2 className="resumen-clientes-titulo">EQUIPO PENDIENTE</h2>
            {loading ? (
              <p className="m-0 py-6 text-center text-[var(--text-color-secondary)]">
                Cargando equipo pendiente...
              </p>
            ) : !pendiente || pendiente.periodos.length === 0 ? (
              <p className="m-0 py-6 text-center text-[var(--text-color-secondary)]">
                Aún no hay equipo pendiente para resumir.
              </p>
            ) : (
              <div className="grid gap-5">
                {pendiente.periodos.length > 1 ? (
                  <article className="rounded-md border border-[var(--surface-200)] p-4">
                    <h3 className="m-0 mb-3 text-sm font-semibold uppercase">
                      Total
                    </h3>
                    <InformeResumenBar pendiente={pendiente.pendiente} />
                  </article>
                ) : null}
                {pendiente.periodos.map((item) => (
                  <article
                    key={item.periodo}
                    className="rounded-md border border-[var(--surface-200)] p-4"
                  >
                    <h3 className="m-0 mb-3 text-sm font-semibold uppercase">
                      {etiquetaPeriodo(item.periodo)}
                    </h3>
                    <InformeResumenBar pendiente={item.pendiente} />
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="resumen-clientes mt-8">
            <h2 className="resumen-clientes-titulo">CÓDIGOS DE CLIENTES</h2>

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
