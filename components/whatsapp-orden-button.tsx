"use client";

import { confirmDialog } from "primereact/confirmdialog";
import { Button } from "primereact/button";
import { formatHora } from "@/lib/fecha";
import { useEmpresaWhatsApp } from "@/lib/whatsapp-empresa";
import { registrarEnvioWhatsApp } from "@/lib/whatsapp-envio";
import { recordarAvisoHoy, useAvisosWhatsAppHoy } from "@/lib/whatsapp-hoy-client";
import { enlaceWhatsAppOrden, plantillaPorEmpresa, telefonoWhatsApp1 } from "@/lib/whatsapp";
import type { Orden } from "@/lib/types";

interface Props {
  orden: Orden;
}

export function WhatsAppOrdenButton({ orden }: Props) {
  const { empresa } = useEmpresaWhatsApp();
  const { avisoDe } = useAvisosWhatsAppHoy();
  const url = enlaceWhatsAppOrden(orden, plantillaPorEmpresa(empresa));
  const telefono = telefonoWhatsApp1(orden.telefono);
  const avisoHoy = avisoDe({ ordenId: orden.id, telefono });

  function enviar() {
    if (!url || !telefono) return;
    window.open(url, "_blank", "noopener,noreferrer");
    recordarAvisoHoy({
      ordenId: orden.id,
      telefono,
      numeroOrden: orden.orden,
      cliente: orden.cliente,
    });
    void registrarEnvioWhatsApp(orden.id, empresa);
  }

  function onClick() {
    if (!url) return;
    if (!avisoHoy) {
      enviar();
      return;
    }

    confirmDialog({
      header: "Mensaje enviado hoy",
      icon: "pi pi-exclamation-triangle",
      message: `Ya se envió mensaje el día de hoy a este cliente${
        avisoHoy.createdAt ? ` (${formatHora(avisoHoy.createdAt)})` : ""
      }. ¿Quieres abrir WhatsApp de nuevo?`,
      acceptLabel: "Abrir de nuevo",
      rejectLabel: "Cancelar",
      accept: enviar,
    });
  }

  return (
    <Button
      type="button"
      label={avisoHoy ? "Enviado hoy" : "WhatsApp"}
      icon="pi pi-whatsapp"
      size="small"
      text
      severity={avisoHoy ? "warning" : "success"}
      disabled={!url}
      title={avisoHoy ? "Ya se envió mensaje el día de hoy" : "Enviar WhatsApp"}
      onClick={onClick}
    />
  );
}
