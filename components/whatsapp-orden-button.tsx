"use client";

import { confirmDialog } from "primereact/confirmdialog";
import { Button } from "primereact/button";
import { formatHora } from "@/lib/fecha";
import { registrarEnvioWhatsApp } from "@/lib/whatsapp-envio";
import { recordarAvisoHoy, useAvisosWhatsAppHoy } from "@/lib/whatsapp-hoy-client";
import {
  destinosWhatsApp,
  empresaPorCiudad,
  enlacesWhatsAppOrden,
  etiquetaEmpresa,
  MARCA_ORDEN,
  plantillaPorEmpresa,
} from "@/lib/whatsapp";
import type { Orden } from "@/lib/types";

interface Props {
  orden: Orden;
}

export function WhatsAppOrdenButton({ orden }: Props) {
  const empresa = empresaPorCiudad(orden.ciudad);
  const marca = MARCA_ORDEN[empresa];
  const { avisoDe } = useAvisosWhatsAppHoy();
  const destinos = destinosWhatsApp([orden]);
  const urls = enlacesWhatsAppOrden(orden, plantillaPorEmpresa(empresa));
  const avisoHoy = avisoDe({
    ordenId: orden.id,
    telefono: destinos[0]?.wa,
  });

  function enviar() {
    if (urls.length === 0) return;
    for (const url of urls) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
    for (const destino of destinos) {
      recordarAvisoHoy({
        ordenId: orden.id,
        telefono: destino.wa,
        numeroOrden: orden.orden,
        cliente: orden.cliente,
      });
    }
    void registrarEnvioWhatsApp(orden.id, empresa);
  }

  function onClick() {
    if (urls.length === 0) return;
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

  const varios = destinos.length > 1;

  return (
    <Button
      type="button"
      label={avisoHoy ? "Enviado hoy" : varios ? `WhatsApp (${destinos.length})` : "WhatsApp"}
      icon="pi pi-whatsapp"
      size="small"
      text
      severity={avisoHoy ? "warning" : undefined}
      disabled={urls.length === 0}
      style={avisoHoy ? undefined : { color: marca.color }}
      title={
        avisoHoy
          ? "Ya se envió mensaje el día de hoy"
          : varios
            ? `WhatsApp de ${etiquetaEmpresa(empresa)} al Teléfono 1 y al Teléfono 2`
            : `WhatsApp de ${etiquetaEmpresa(empresa)}`
      }
      onClick={onClick}
    />
  );
}
