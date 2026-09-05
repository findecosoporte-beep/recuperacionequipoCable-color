"use client";

import { Button } from "primereact/button";
import { useEmpresaWhatsApp } from "@/lib/whatsapp-empresa";
import { EMPRESAS_WHATSAPP, etiquetaEmpresa } from "@/lib/whatsapp";

interface Props {
  compact?: boolean;
}

export function WhatsAppEmpresaSelector({ compact = false }: Props) {
  const { empresa, elegir } = useEmpresaWhatsApp();

  return (
    <div
      className={
        compact
          ? "flex flex-wrap items-center gap-2"
          : "flex flex-col gap-3 rounded-md border border-[var(--surface-200)] bg-[var(--surface-0)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      }
    >
      <div>
        <p className="m-0 font-semibold">Cliente del mensaje</p>
        <p className="mt-1 mb-0 text-sm text-[var(--text-color-secondary)]">
          El WhatsApp dirá que escribe {etiquetaEmpresa(empresa)}.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {EMPRESAS_WHATSAPP.map((item) => (
          <Button
            key={item.id}
            type="button"
            label={item.label}
            outlined={empresa !== item.id}
            onClick={() => elegir(item.id)}
          />
        ))}
      </div>
    </div>
  );
}
