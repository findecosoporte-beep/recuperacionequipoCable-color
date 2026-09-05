"use client";

import { apiRequest } from "@/lib/api-client";
import type { EmpresaWhatsApp } from "@/lib/whatsapp";

export async function registrarEnvioWhatsApp(
  ordenId: string,
  empresa: EmpresaWhatsApp,
  telefono?: string,
): Promise<void> {
  try {
    await apiRequest("/api/v1/avisos-whatsapp", {
      method: "POST",
      body: JSON.stringify({
        ordenId,
        empresa,
        ...(telefono ? { telefono } : {}),
      }),
    });
    window.dispatchEvent(new Event("aviso-whatsapp"));
  } catch {
    // El chat de WhatsApp ya se abrió; el control se puede completar después.
  }
}
