"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Message } from "primereact/message";
import { InformeResumenBar } from "@/components/informe-resumen-bar";
import { useAuth } from "@/components/auth-provider";
import { AppShell } from "@/components/app-shell";
import { apiRequest } from "@/lib/api-client";
import { etiquetaPeriodo } from "@/lib/fecha";
import {
  resumenPendienteDeItems,
  type InformeRecepcionActual,
  type InformeRecepcionCargaResumen,
} from "@/lib/informes-tabla";
import { esRolPanel } from "@/lib/roles";

export function ResumenGeneralDashboard() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const [cargas, setCargas] = useState<InformeRecepcionCargaResumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarLista = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<InformeRecepcionActual>("/api/v1/informes-recepcion");
      setCargas(data.cargas);
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
    void cargarLista();
  }, [ready, user, router, cargarLista]);

  const total = useMemo(
    () => resumenPendienteDeItems(cargas.map((carga) => carga.pendiente)),
    [cargas],
  );

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

          {loading ? (
            <p className="m-0 py-8 text-center text-[var(--text-color-secondary)]">
              Cargando resumen...
            </p>
          ) : cargas.length === 0 ? (
            <p className="m-0 py-8 text-center text-[var(--text-color-secondary)]">
              Aún no hay informes para resumir. Sube un archivo en Informes
              generales.
            </p>
          ) : (
            <div className="mt-6 grid gap-5">
              <article className="rounded-md border border-[var(--surface-200)] p-4">
                <h2 className="m-0 mb-3 text-base font-semibold uppercase">
                  Total de todos los informes
                </h2>
                <InformeResumenBar pendiente={total} />
              </article>
              {cargas.map((carga) => (
                <article
                  key={carga.periodo}
                  className="rounded-md border border-[var(--surface-200)] p-4"
                >
                  <h2 className="m-0 mb-1 text-base font-semibold uppercase">
                    {etiquetaPeriodo(carga.periodo)}
                  </h2>
                  <p className="m-0 mb-3 text-sm text-[var(--text-color-secondary)]">
                    {carga.archivo} · {carga.filas} filas
                  </p>
                  <InformeResumenBar pendiente={carga.pendiente} />
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </AppShell>
  );
}
