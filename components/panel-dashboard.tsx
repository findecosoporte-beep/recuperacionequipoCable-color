"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Message } from "primereact/message";
import { useAuth } from "@/components/auth-provider";
import { AppShell } from "@/components/app-shell";
import { apiRequest } from "@/lib/api-client";
import type { ConteoCiudad, ConteoNombre, ResumenDashboard } from "@/lib/dashboard";
import { esRolPanel } from "@/lib/roles";

const SERIES = [
  { key: "porRecuperar", label: "Equipos por recuperar", detalle: "por órdenes", color: "#0369a1" },
  { key: "recuperados", label: "Equipos recuperados", detalle: "por órdenes", color: "#059669" },
  { key: "porAnular", label: "Mandados a anular", detalle: "por órdenes", color: "#d97706" },
  { key: "anulados", label: "Anulados", detalle: "por órdenes", color: "#5c2d91" },
] as const;

export function PanelDashboard() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const [datos, setDatos] = useState<ResumenDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    let cancelado = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiRequest<ResumenDashboard>("/api/v1/dashboard");
        if (!cancelado) setDatos(data);
      } catch (err) {
        if (!cancelado) {
          setError(err instanceof Error ? err.message : "No se pudo cargar el dashboard");
        }
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [ready, router, user]);

  if (!ready || !user || !esRolPanel(user.rol)) {
    return (
      <div className="flex flex-1 items-center justify-center text-[var(--text-color-secondary)]">
        Cargando...
      </div>
    );
  }

  const valores = {
    porRecuperar: datos?.porRecuperar ?? 0,
    recuperados: datos?.recuperados ?? 0,
    porAnular: datos?.porAnular ?? 0,
    anulados: datos?.anulados ?? 0,
  };

  return (
    <AppShell title="Dashboard" subtitle="Recuperación">
      <main className="grid w-full min-w-0 gap-4 px-3 py-4 sm:px-5 sm:py-5">
        {error ? <Message severity="error" text={error} /> : null}

        <p className="m-0 text-sm text-[var(--text-color-secondary)]">
          Cada número es una orden. Entra lo que registra el técnico en la app y lo que marca el
          administrador en el panel.
        </p>

        <section className="grid grid-cols-1 gap-3 min-[520px]:grid-cols-2 xl:grid-cols-4">
          {SERIES.map((serie) => (
            <article
              key={serie.key}
              className="rounded-md border border-[var(--surface-200)] bg-white p-4"
            >
              <p className="m-0 text-sm font-semibold" style={{ color: serie.color }}>
                {serie.label}
              </p>
              <p className="m-0 mt-2 text-4xl font-bold text-black">
                {loading ? "…" : valores[serie.key]}
              </p>
              <p className="m-0 mt-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-color-secondary)]">
                {serie.detalle}
              </p>
            </article>
          ))}
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(17rem,24rem)_minmax(0,1fr)]">
          <article className="rounded-md border border-[var(--surface-200)] bg-white p-4">
            <h2 className="m-0 text-sm font-bold uppercase tracking-wide">Distribución</h2>
            {loading ? (
              <p className="py-10 text-center text-[var(--text-color-secondary)]">Cargando gráfico...</p>
            ) : (
              <Donut
                partes={SERIES.map((serie) => ({
                  label: serie.label,
                  color: serie.color,
                  value: valores[serie.key],
                }))}
                total={datos?.total ?? 0}
              />
            )}
          </article>

          <article className="rounded-md border border-[var(--surface-200)] bg-white p-4">
            <h2 className="m-0 text-sm font-bold uppercase tracking-wide">Por ciudad</h2>
            <Leyenda />
            {loading ? (
              <p className="py-10 text-center text-[var(--text-color-secondary)]">Cargando gráfico...</p>
            ) : (
              <BarrasCiudad filas={datos?.porCiudad ?? []} />
            )}
          </article>
        </section>

        <section className="grid min-w-0 gap-4 lg:grid-cols-2">
          <article className="rounded-md border border-[var(--surface-200)] bg-white p-4">
            <h2 className="m-0 text-sm font-bold uppercase tracking-wide">
              Tipos de equipo recuperado
            </h2>
            {loading ? (
              <p className="py-10 text-center text-[var(--text-color-secondary)]">Cargando gráfico...</p>
            ) : (
              <BarrasSimples
                filas={datos?.porEquipo ?? []}
                color="#059669"
                vacio="Aún no hay equipos recuperados con detalle."
              />
            )}
          </article>
          <article className="rounded-md border border-[var(--surface-200)] bg-white p-4">
            <h2 className="m-0 text-sm font-bold uppercase tracking-wide">
              Motivos de anulación
            </h2>
            {loading ? (
              <p className="py-10 text-center text-[var(--text-color-secondary)]">Cargando gráfico...</p>
            ) : (
              <BarrasSimples
                filas={datos?.porMotivo ?? []}
                color="#5c2d91"
                vacio="Aún no hay órdenes mandadas a anular ni anuladas."
              />
            )}
          </article>
        </section>
      </main>
    </AppShell>
  );
}

function Leyenda() {
  return (
    <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold">
      {SERIES.map((serie) => (
        <span key={serie.key} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: serie.color }}
          />
          {serie.label}
        </span>
      ))}
    </div>
  );
}

function Donut({
  partes,
  total,
}: {
  partes: Array<{ label: string; color: string; value: number }>;
  total: number;
}) {
  const radio = 68;
  const circunferencia = 2 * Math.PI * radio;
  let recorrido = 0;

  return (
    <div className="mt-4 flex w-full min-w-0 flex-col items-center gap-4 sm:flex-row sm:items-center">
      <svg viewBox="0 0 180 180" className="h-52 w-52" role="img" aria-label="Distribución de órdenes">
        <circle cx="90" cy="90" r={radio} fill="none" stroke="#e2e8f0" strokeWidth="22" />
        {total > 0
          ? partes.map((parte) => {
              const largo = (parte.value / total) * circunferencia;
              const segmento = (
                <circle
                  key={parte.label}
                  cx="90"
                  cy="90"
                  r={radio}
                  fill="none"
                  stroke={parte.color}
                  strokeWidth="22"
                  strokeDasharray={`${largo} ${circunferencia - largo}`}
                  strokeDashoffset={-recorrido}
                  transform="rotate(-90 90 90)"
                />
              );
              recorrido += largo;
              return segmento;
            })
          : null}
        <text x="90" y="86" textAnchor="middle" fill="#0f172a" fontSize="28" fontWeight="700">
          {total}
        </text>
        <text x="90" y="108" textAnchor="middle" fill="#64748b" fontSize="12">
          órdenes
        </text>
      </svg>
      <ul className="m-0 grid min-w-0 flex-1 gap-2 p-0">
        {partes.map((parte) => (
          <li key={parte.label} className="flex items-center justify-between text-sm">
            <span className="inline-flex items-center gap-2 font-semibold">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: parte.color }} />
              {parte.label}
            </span>
            <span>
              {parte.value}
              {total > 0 ? ` · ${Math.round((parte.value / total) * 100)}%` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BarrasCiudad({ filas }: { filas: ConteoCiudad[] }) {
  if (filas.length === 0) {
    return (
      <p className="py-10 text-center text-[var(--text-color-secondary)]">
        Aún no hay órdenes por recuperar, recuperadas, mandadas a anular o anuladas.
      </p>
    );
  }

  const maximo = Math.max(
    ...filas.map(
      (fila) => fila.porRecuperar + fila.recuperados + fila.porAnular + fila.anulados,
    ),
    1,
  );

  return (
    <div className="mt-4 grid gap-3">
      {filas.map((fila) => {
        const total = fila.porRecuperar + fila.recuperados + fila.porAnular + fila.anulados;
        return (
          <div key={fila.ciudad}>
            <div className="mb-1 flex min-w-0 items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-semibold">{fila.ciudad}</span>
              <span className="shrink-0">{total}</span>
            </div>
            <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
              <span style={{ width: `${(fila.porRecuperar / maximo) * 100}%`, background: "#0369a1" }} />
              <span style={{ width: `${(fila.recuperados / maximo) * 100}%`, background: "#059669" }} />
              <span style={{ width: `${(fila.porAnular / maximo) * 100}%`, background: "#d97706" }} />
              <span style={{ width: `${(fila.anulados / maximo) * 100}%`, background: "#5c2d91" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BarrasSimples({
  filas,
  color,
  vacio,
}: {
  filas: ConteoNombre[];
  color: string;
  vacio: string;
}) {
  if (filas.length === 0) {
    return <p className="py-10 text-center text-[var(--text-color-secondary)]">{vacio}</p>;
  }

  const maximo = Math.max(...filas.map((fila) => fila.total), 1);

  return (
    <div className="mt-4 grid gap-3">
      {filas.map((fila) => (
        <div key={fila.nombre}>
          <div className="mb-1 flex min-w-0 items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 break-words font-semibold">{fila.nombre}</span>
            <span className="shrink-0">{fila.total}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full"
              style={{ width: `${(fila.total / maximo) * 100}%`, background: color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
