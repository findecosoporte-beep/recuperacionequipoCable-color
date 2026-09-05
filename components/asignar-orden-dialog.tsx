"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { apiRequest } from "@/lib/api-client";
import { formatOrdenNumero, titleCase } from "@/lib/format-orden";
import type { Orden, Tecnico } from "@/lib/types";

export async function guardarAsignacionOrden(ordenId: string, tecnicoId: string | null) {
  return apiRequest<{
    id: string;
    orden: string;
    tecnicoId: string | null;
    tecnico: { id: string; nombre: string; email: string; activo: boolean } | null;
  }>("/api/v1/asignaciones/orden", {
    method: "POST",
    body: JSON.stringify({ ordenId, tecnicoId }),
  });
}

interface Props {
  orden: Orden | null;
  tecnicos: Tecnico[];
  saving: boolean;
  defaultTecnicoId?: string | null;
  onClose: () => void;
  onConfirm: (tecnicoId: string | null) => void;
}

export function AsignarOrdenDialog({
  orden,
  tecnicos,
  saving,
  defaultTecnicoId,
  onClose,
  onConfirm,
}: Props) {
  const [tecnicoId, setTecnicoId] = useState<string | null>(
    orden?.tecnicoId ?? defaultTecnicoId ?? null,
  );

  useEffect(() => {
    setTecnicoId(orden?.tecnicoId ?? defaultTecnicoId ?? null);
  }, [orden, defaultTecnicoId]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onConfirm(tecnicoId);
  }

  return (
    <Dialog
      visible={Boolean(orden)}
      modal
      style={{ width: "90vw", maxWidth: "28rem" }}
      header={orden ? `Asignar ${formatOrdenNumero(orden.orden)}` : "Asignar orden"}
      onHide={onClose}
    >
      {orden ? (
        <form onSubmit={submit} className="grid gap-4">
          <p className="m-0 text-sm text-[var(--text-color-secondary)]">
            {titleCase(orden.cliente)} · {titleCase(orden.ciudad)}
            {orden.tecnico?.nombre ? ` · ahora: ${titleCase(orden.tecnico.nombre)}` : " · sin técnico"}
          </p>
          <label className="grid gap-1 text-sm font-medium">
            Técnico
            <Dropdown
              value={tecnicoId}
              options={tecnicos.map((item) => ({
                label: item.zona ? `${item.nombre} · ${item.zona}` : item.nombre,
                value: item.id,
              }))}
              placeholder="Sin asignar"
              className="w-full"
              showClear
              onChange={(event) => setTecnicoId(event.value ?? null)}
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" label="Cancelar" outlined onClick={onClose} disabled={saving} />
            <Button
              type="submit"
              label={tecnicoId ? "Asignar" : "Dejar sin técnico"}
              icon="pi pi-user"
              loading={saving}
            />
          </div>
        </form>
      ) : null}
    </Dialog>
  );
}
