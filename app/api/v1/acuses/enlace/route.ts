import { NextRequest } from "next/server";
import { requirePanelAccess } from "@/lib/auth";
import { acuseDeOrden, tieneAcuse } from "@/lib/acuse";
import { firmarEnlaceAcuse } from "@/lib/acuse-enlace";
import { badRequest } from "@/lib/errors";
import { apiHandler, handleOptions, json, readJson } from "@/lib/http";
import { findOrden } from "@/lib/ordenes";
import { acuseEnlaceSchema } from "@/lib/validators";
import { destinosWhatsApp, numerosWhatsAppDe } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const OPTIONS = handleOptions;

export const POST = apiHandler(async (request: NextRequest) => {
  await requirePanelAccess(request);
  const input = acuseEnlaceSchema.parse(await readJson(request));
  const orden = await findOrden(input.ordenId);
  if (!tieneAcuse(orden)) {
    throw badRequest("Guarda el acuse primero para poder compartirlo");
  }
  const telefonos = numerosWhatsAppDe(orden.telefono);
  if (telefonos.length === 0) {
    throw badRequest("Esta orden no tiene un número de WhatsApp válido");
  }

  const token = firmarEnlaceAcuse(orden.id);
  const acuse = acuseDeOrden(orden);
  return json({
    token,
    path: `/a/${token}`,
    telefonos,
    destinos: destinosWhatsApp([orden]),
    cliente: acuse?.cliente ?? orden.cliente,
  });
});
