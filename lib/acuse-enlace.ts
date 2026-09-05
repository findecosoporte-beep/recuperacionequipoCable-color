import { createHmac, timingSafeEqual } from "crypto";
import { getJwtSecret } from "@/lib/env";
import type { DestinoWhatsApp } from "@/lib/whatsapp";

export function firmarEnlaceAcuse(ordenId: string): string {
  const id = ordenId.trim();
  const firma = createHmac("sha256", getJwtSecret()).update(id).digest("base64url");
  return Buffer.from(`${id}.${firma}`).toString("base64url");
}

export function verificarEnlaceAcuse(token: string | null | undefined): string | null {
  try {
    const raw = Buffer.from((token ?? "").trim(), "base64url").toString("utf8");
    const corte = raw.lastIndexOf(".");
    if (corte <= 0 || corte === raw.length - 1) return null;
    const ordenId = raw.slice(0, corte);
    const firma = raw.slice(corte + 1);
    const esperada = createHmac("sha256", getJwtSecret()).update(ordenId).digest("base64url");
    const a = Buffer.from(firma);
    const b = Buffer.from(esperada);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return ordenId;
  } catch {
    return null;
  }
}

export function mensajeAcuseWhatsApp(destino: DestinoWhatsApp, url: string): string {
  const nombre = destino.nombre || "cliente";
  const orden = destino.ordenes.join(", ");
  return `Hola ${nombre}, le compartimos el acuse de recibo de su equipo (orden ${orden}) en PDF: ${url}`;
}
