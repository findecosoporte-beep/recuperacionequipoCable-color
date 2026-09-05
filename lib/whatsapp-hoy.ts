import type { AvisoWhatsApp } from "@/lib/types";
import { numeroWhatsApp, telefonoWhatsApp1 } from "@/lib/whatsapp";

export interface ClaveAvisoHoy {
  ordenId?: string | null;
  telefono?: string | null;
}

export function telefonoClaveAviso(telefono: string | null | undefined): string | null {
  const raw = (telefono ?? "").trim();
  if (!raw) return null;
  return telefonoWhatsApp1(raw) ?? numeroWhatsApp(raw.replace(/\D/g, ""));
}

export function avisoEnviadoHoy(
  avisos: AvisoWhatsApp[],
  clave: ClaveAvisoHoy,
): AvisoWhatsApp | undefined {
  const ordenId = clave.ordenId?.trim() || null;
  const telefono = telefonoClaveAviso(clave.telefono);
  if (!ordenId && !telefono) return undefined;

  return avisos.find((aviso) => {
    if (ordenId && aviso.ordenId === ordenId) return true;
    const avisoTelefono = telefonoClaveAviso(aviso.telefono);
    return Boolean(telefono && avisoTelefono && avisoTelefono === telefono);
  });
}
