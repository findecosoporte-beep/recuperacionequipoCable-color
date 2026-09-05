import { NextRequest, NextResponse } from "next/server";
import { acuseDeOrden, htmlAcuse, tieneAcuse } from "@/lib/acuse";
import { verificarEnlaceAcuse } from "@/lib/acuse-enlace";
import { findOrden } from "@/lib/ordenes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const ordenId = verificarEnlaceAcuse(token);
  if (!ordenId) {
    return new NextResponse("Acuse no encontrado", { status: 404 });
  }

  try {
    const orden = await findOrden(ordenId);
    const acuse = acuseDeOrden(orden);
    if (!acuse || !tieneAcuse(orden)) {
      return new NextResponse("Acuse no encontrado", { status: 404 });
    }

    return new NextResponse(htmlAcuse(acuse, { compartir: true }), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch {
    return new NextResponse("Acuse no encontrado", { status: 404 });
  }
}
