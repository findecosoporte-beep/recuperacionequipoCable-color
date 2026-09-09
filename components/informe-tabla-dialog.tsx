"use client";

import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InformeTabla } from "@/components/informe-tabla";
import { etiquetaPeriodo } from "@/lib/fecha";
import type { FilaInforme } from "@/lib/informes-tabla";

interface Props {
  open: boolean;
  periodo: string | null;
  archivo: string | null;
  loading: boolean;
  filas: FilaInforme[];
  onClose: () => void;
}

export function InformeTablaDialog({
  open,
  periodo,
  archivo,
  loading,
  filas,
  onClose,
}: Props) {
  const titulo = periodo
    ? `Informe ${etiquetaPeriodo(periodo)}`
    : "Informe de recepción";

  return (
    <Dialog
      visible={open}
      modal
      maximizable
      className="informe-tabla-dialog"
      style={{ width: "96vw", maxWidth: "96rem" }}
      contentStyle={{ overflow: "hidden" }}
      header={titulo}
      onHide={onClose}
      footer={
        <Button type="button" label="Cerrar" outlined onClick={onClose} />
      }
    >
      {archivo ? (
        <p className="mt-0 mb-3 text-sm text-[var(--text-color-secondary)]">
          {archivo}
          {filas.length ? ` · ${filas.length} filas` : ""}
        </p>
      ) : null}
      {loading ? (
        <p className="m-0 py-8 text-center text-[var(--text-color-secondary)]">
          Cargando tabla...
        </p>
      ) : (
        <InformeTabla filas={filas} />
      )}
    </Dialog>
  );
}
