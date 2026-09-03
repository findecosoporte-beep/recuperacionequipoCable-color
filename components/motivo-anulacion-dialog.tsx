"use client";

import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { MOTIVOS_ANULACION } from "@/lib/motivo-anulacion";
import { formatOrdenNumero } from "@/lib/format-orden";
import type { Orden } from "@/lib/types";

interface Props {
  orden: Orden | null;
  saving: boolean;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
}

export function MotivoAnulacionDialog({ orden, saving, onClose, onConfirm }: Props) {
  return (
    <Dialog
      visible={Boolean(orden)}
      modal
      style={{ width: "90vw", maxWidth: "32rem" }}
      contentStyle={{ maxHeight: "70vh", overflow: "auto" }}
      header="Motivo de anulación"
      onHide={onClose}
    >
      {orden ? (
        <div className="grid gap-3">
          <p className="m-0 text-sm text-[var(--text-color-secondary)]">
            Elige por qué se manda a anular la orden {formatOrdenNumero(orden.orden)}.
            El técnico y el administrador verán este texto.
          </p>
          {MOTIVOS_ANULACION.map((motivo) => (
            <button
              key={motivo.id}
              type="button"
              disabled={saving}
              onClick={() => onConfirm(motivo.texto)}
              className="rounded-md border border-[var(--surface-200)] bg-[var(--surface-0)] p-3 text-left hover:border-[var(--primary-color)] disabled:opacity-60"
            >
              <strong className="block">{motivo.label}</strong>
              <span className="mt-1 block text-sm text-[var(--text-color-secondary)]">
                {motivo.texto}
              </span>
            </button>
          ))}
          <div className="flex justify-end">
            <Button type="button" label="Cancelar" outlined onClick={onClose} disabled={saving} />
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
