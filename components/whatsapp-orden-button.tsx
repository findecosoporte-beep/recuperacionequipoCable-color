"use client";

import { Button } from "primereact/button";
import { enlaceWhatsAppOrden } from "@/lib/whatsapp";
import type { Orden } from "@/lib/types";

interface Props {
  orden: Orden;
}

export function WhatsAppOrdenButton({ orden }: Props) {
  const url = enlaceWhatsAppOrden(orden);

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
      }}
    />
  );
}
