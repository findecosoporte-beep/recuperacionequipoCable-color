"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { FloatLabel } from "primereact/floatlabel";
import { InputText } from "primereact/inputtext";
import { equiposRecuperadosDe } from "@/lib/estado-orden";
import { formatOrdenNumero } from "@/lib/format-orden";
import type { Orden } from "@/lib/types";

interface Props {
  orden: Orden | null;
  saving: boolean;
  onClose: () => void;
  onConfirm: (equipos: string) => void;
}

export function MarcarRecuperadaDialog({ orden, saving, onClose, onConfirm }: Props) {
  const [equipos, setEquipos] = useState("");

  useEffect(() => {
    if (!orden) {
      setEquipos("");
      return;
    }
    setEquipos(equiposRecuperadosDe(orden.comentario));
  }, [orden]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onConfirm(equipos.trim());
  }

  return (
    <Dialog
      visible={Boolean(orden)}
      modal
      style={{ width: "90vw", maxWidth: "28rem" }}
      header="Marcar como recuperada"
      onHide={onClose}
    >
      {orden ? (
        <form onSubmit={submit} className="grid gap-4">
          <p className="m-0 text-sm text-[var(--text-color-secondary)]">
            La orden {formatOrdenNumero(orden.orden)} pasará a Recuperadas. El equipo es
            opcional.
          </p>
          <FloatLabel>
            <InputText
              id="equipos-recuperados"
              className="w-full"
              value={equipos}
              onChange={(event) => setEquipos(event.target.value)}
            />
            <label htmlFor="equipos-recuperados">Equipo recuperado (opcional)</label>
          </FloatLabel>
          <div className="flex justify-end gap-2">
            <Button type="button" label="Cancelar" outlined onClick={onClose} disabled={saving} />
            <Button type="submit" label="Marcar recuperada" icon="pi pi-check" loading={saving} />
          </div>
        </form>
      ) : null}
    </Dialog>
  );
}
