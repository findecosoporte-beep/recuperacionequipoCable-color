"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { useAuth } from "@/components/auth-provider";
import { AppShell } from "@/components/app-shell";
import { apiRequest, apiRequestWithMeta } from "@/lib/api-client";
import { titleCase } from "@/lib/format-orden";
import { esRolPanel } from "@/lib/roles";
import type { CiudadAsignacion, ResumenAsignacion, Tecnico } from "@/lib/types";

export function AsignacionDashboard() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [tecnicoId, setTecnicoId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [resumen, setResumen] = useState<ResumenAsignacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const loadTecnicos = useCallback(async () => {
    const result = await apiRequestWithMeta<Tecnico[]>(
      "/api/v1/tecnicos?limit=100&activo=true",
    );
    setTecnicos(result.data);
  }, []);

  const load = useCallback(
    async (selected = tecnicoId, search = query) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (selected) params.set("tecnicoId", selected);
        if (search.trim()) params.set("q", search.trim());
        const suffix = params.toString() ? `?${params.toString()}` : "";
        const data = await apiRequest<ResumenAsignacion>(`/api/v1/asignaciones${suffix}`);
        setResumen(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar la asignación");
      } finally {
        setLoading(false);
      }
    },
    [query, tecnicoId],
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
    void loadTecnicos().catch((err) => {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los técnicos");
      setLoading(false);
    });
  }, [ready, user, router, loadTecnicos]);

  useEffect(() => {
    if (!ready || !user || !esRolPanel(user.rol)) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user, tecnicoId]);

  if (!ready || !user || !esRolPanel(user.rol)) {
    return (
      <div className="flex flex-1 items-center justify-center text-[var(--text-color-secondary)]">
        Cargando...
      </div>
    );
  }

  const tecnico = tecnicos.find((item) => item.id === tecnicoId) ?? null;

  async function asignar(ciudad: CiudadAsignacion, modo: "libres" | "todas") {
    if (!tecnicoId) return;
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const result = await apiRequest<{ updated: number }>("/api/v1/asignaciones", {
        method: "POST",
        body: JSON.stringify({ tecnicoId, ciudad: ciudad.ciudad, modo }),
      });
      setOk(
        modo === "todas"
          ? `Se asignaron ${result.updated} órdenes de ${titleCase(ciudad.ciudad)} a ${tecnico?.nombre ?? "el técnico"}.`
          : `Se asignaron ${result.updated} órdenes libres de ${titleCase(ciudad.ciudad)}.`,
      );
      await load(tecnicoId, query);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo asignar");
    } finally {
      setSaving(false);
    }
  }

  async function liberar(ciudad: CiudadAsignacion) {
    if (!tecnicoId) return;
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const result = await apiRequest<{ updated: number }>(
        "/api/v1/asignaciones/liberar",
        {
          method: "POST",
          body: JSON.stringify({ tecnicoId, ciudad: ciudad.ciudad }),
        },
      );
      setOk(`Se liberaron ${result.updated} órdenes de ${titleCase(ciudad.ciudad)}.`);
      await load(tecnicoId, query);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo liberar");
    } finally {
      setSaving(false);
    }
  }

  function confirmarAsignar(ciudad: CiudadAsignacion, modo: "libres" | "todas") {
    if (!tecnico) return;
    const cantidad = modo === "libres" ? ciudad.libres : ciudad.total;
    confirmDialog({
      header: modo === "todas" ? "Asignar toda la ciudad" : "Asignar órdenes libres",
      message:
        modo === "todas"
          ? `¿Asignar las ${cantidad} órdenes de ${titleCase(ciudad.ciudad)} a ${tecnico.nombre}? Si otra persona ya las tenía, se las quitas.`
          : `¿Asignar ${cantidad} órdenes sin técnico de ${titleCase(ciudad.ciudad)} a ${tecnico.nombre}?`,
      icon: "pi pi-map-marker",
      acceptLabel: "Asignar",
      rejectLabel: "Cancelar",
      accept: () => {
        void asignar(ciudad, modo);
      },
    });
  }

  function confirmarLiberar(ciudad: CiudadAsignacion) {
    if (!tecnico) return;
    confirmDialog({
      header: "Quitar ciudad",
      message: `¿Quitar las ${ciudad.asignadas} órdenes de ${titleCase(ciudad.ciudad)} a ${tecnico.nombre}? Quedarán sin técnico.`,
      icon: "pi pi-times",
      acceptLabel: "Liberar",
      rejectLabel: "Cancelar",
      acceptClassName: "p-button-danger",
      accept: () => {
        void liberar(ciudad);
      },
    });
  }

  return (
    <AppShell title="Asignar por ciudad" subtitle="Técnicos recuperadores">
      <ConfirmDialog />

      <main className="mx-auto grid w-full flex-1 grid-cols-4 gap-4 px-4 py-6 sm:px-6">
        <form
          className="col-span-4 flex flex-col gap-3 lg:flex-row lg:items-center"
          onSubmit={(event) => {
            event.preventDefault();
            void load(tecnicoId, query);
          }}
        >
          <Dropdown
            value={tecnicoId}
            options={tecnicos.map((item) => ({
              label: item.zona
                ? `${item.nombre} · ${item.zona}`
                : item.nombre,
              value: item.id,
            }))}
            placeholder="Elige un técnico"
            className="w-full lg:max-w-sm"
            showClear
            onChange={(event) => setTecnicoId(event.value ?? null)}
          />
          <InputText
            value={query}
            className="w-full"
            placeholder="Filtrar ciudad..."
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button type="submit" label="Buscar" icon="pi pi-search" outlined />
        </form>

        <div className="col-span-4 rounded-md border border-[var(--surface-200)] bg-[var(--surface-0)] px-4 py-3 text-sm">
          {tecnico ? (
            <p className="m-0">
              <strong>{tecnico.nombre}</strong> tiene{" "}
              <strong>{resumen?.totalAsignadas ?? 0}</strong> órdenes asignadas
              {tecnico.zona ? ` · zona ${titleCase(tecnico.zona)}` : ""}.
              Asigna una ciudad para pasarle todas las órdenes de ese lugar.
            </p>
          ) : (
            <p className="m-0 text-[var(--text-color-secondary)]">
              Elige un técnico para asignarle las órdenes de una ciudad. Las
              libres no tienen técnico; “Asignar todas” también toma las que
              otro técnico ya tenía.
            </p>
          )}
        </div>

        {ok ? (
          <div className="col-span-4">
            <Message severity="success" text={ok} />
          </div>
        ) : null}

        {error ? (
          <div className="col-span-4">
            <Message severity="error" text={error} />
          </div>
        ) : null}

        <div className="col-span-4">
          <DataTable
            key={tecnicoId ?? "sin-tecnico"}
            value={resumen?.ciudades ?? []}
            dataKey="ciudad"
            loading={loading || saving}
            emptyMessage="No hay ciudades con órdenes"
            tableStyle={{ minWidth: "100%" }}
            stripedRows
          >
            <Column
              header="Ciudad"
              style={{ width: "22%" }}
              body={(row: CiudadAsignacion) => (
                <strong>{titleCase(row.ciudad)}</strong>
              )}
            />
            <Column
              header="Total"
              style={{ width: "10%" }}
              body={(row: CiudadAsignacion) => row.total}
            />
            <Column
              header="Sin técnico"
              style={{ width: "12%" }}
              body={(row: CiudadAsignacion) =>
                row.libres > 0 ? (
                  <Tag value={String(row.libres)} severity="warning" />
                ) : (
                  "0"
                )
              }
            />
            <Column
              header="Este técnico"
              style={{ width: "12%" }}
              body={(row: CiudadAsignacion) =>
                row.asignadas > 0 ? (
                  <Tag value={String(row.asignadas)} severity="success" />
                ) : (
                  "0"
                )
              }
            />
            <Column
              header="Otro técnico"
              style={{ width: "12%" }}
              body={(row: CiudadAsignacion) =>
                row.otras > 0 ? <Tag value={String(row.otras)} /> : "0"
              }
            />
            <Column
              header="Acciones"
              style={{ width: "32%" }}
              body={(row: CiudadAsignacion) => (
                <div className="flex flex-wrap gap-1">
                  <Button
                    type="button"
                    label="Asignar libres"
                    size="small"
                    disabled={!tecnicoId || row.libres === 0}
                    onClick={() => confirmarAsignar(row, "libres")}
                  />
                  <Button
                    type="button"
                    label="Asignar todas"
                    size="small"
                    outlined
                    disabled={!tecnicoId || row.total === 0}
                    onClick={() => confirmarAsignar(row, "todas")}
                  />
                  <Button
                    type="button"
                    label="Liberar"
                    size="small"
                    text
                    severity="danger"
                    disabled={!tecnicoId || row.asignadas === 0}
                    onClick={() => confirmarLiberar(row)}
                  />
                </div>
              )}
            />
          </DataTable>
        </div>
      </main>
    </AppShell>
  );
}
