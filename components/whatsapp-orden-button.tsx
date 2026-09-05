"use client";

import { Button } from "primereact/button";
import { useEmpresaWhatsApp } from "@/lib/whatsapp-empresa";
import { registrarEnvioWhatsApp } from "@/lib/whatsapp-envio";
import { enlaceWhatsAppOrden, plantillaPorEmpresa } from "@/lib/whatsapp";
import type { Orden } from "@/lib/types";

interface Props {
  orden: Orden;
}

export function WhatsAppOrdenButton({ orden }: Props) {
  const { empresa } = useEmpresaWhatsApp();
  const url = enlaceWhatsAppOrden(orden, plantillaPorEmpresa(empresa));

  return (
    <Button
      type="button"
      label="WhatsApp"
      icon="pi pi-whatsapp"
      size="small"
      text
      severity="success"
      disabled={!url}
      onClick={() => {
        if (!url) return;
        window.open(url, "_blank", "noopener,noreferrer");
        void registrarEnvioWhatsApp(orden.id, empresa);
      }}
    />
  );
}
