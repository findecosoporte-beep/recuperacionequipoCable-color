"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import {
  MESES_DEL_ANIO,
  anioEnZona,
  armarPeriodo,
  etiquetaPeriodo,
  mesEnZona,
  opcionesAnioCarga,
} from "@/lib/fecha";

interface Props {
  open: boolean;
  periodos: string[];
  onClose: () => void;
  onConfirm: (periodo: string) => void;
}

export function InformeMesDialog({ open, periodos, onClose, onConfirm }: Props) {
  const [anio, setAnio] = useState(anioEnZona);
  const [mes, setMes] = useState(mesEnZona);

  useEffect(() => {
    if (!open) return;
    setAnio(anioEnZona());
    setMes(mesEnZona());
  }, [open]);

  const periodo = armarPeriodo(anio, mes);
  const reemplaza = periodos.includes(periodo);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onConfirm(periodo);
  }

  return (
    <Dialog
      visible={open}
      modal
      style={{ width: "90vw", maxWidth: "28rem" }}
      header="Informe de qué mes"
      onHide={onClose}
    >
      <form onSubmit={submit} className="grid gap-4">
        <p className="m-0 text-sm text-[var(--text-color-secondary)]">
          Elige el mes del Excel que vas a subir. Ese mes se guarda aparte y se suma al acumulado.
        </p>
        <label className="grid gap-1 text-sm font-medium">
          Año
          <Dropdown
            value={anio}
            options={opcionesAnioCarga(periodos).map((value) => ({
              label: String(value),
              value,
            }))}
            className="w-full"
            appendTo="self"
            onChange={(event) => setAnio(event.value ?? anioEnZona())}
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Mes
          <Dropdown
            value={mes}
            options={MESES_DEL_ANIO.map((item) => ({
              label: item.label,
              value: item.value,
            }))}
            className="w-full"
            appendTo="self"
            placeholder="Elige un mes"
            onChange={(event) => setMes(event.value ?? mesEnZona())}
          />
        </label>
        <p className="m-0 text-sm text-[var(--text-color-secondary)]">
          {reemplaza
            ? `Ya hay un informe de ${etiquetaPeriodo(periodo)}. Si subes este archivo, se reemplaza solo ese mes.`
            : `Se guardará como ${etiquetaPeriodo(periodo)}.`}
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" label="Cancelar" outlined onClick={onClose} />
          <Button type="submit" label="Elegir archivo" icon="pi pi-upload" />
        </div>
      </form>
    </Dialog>
  );
}
