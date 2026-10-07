import { prisma } from "@/lib/db";
import { armarDashboard, type ResumenDashboard } from "@/lib/dashboard";

export async function obtenerDashboard(): Promise<ResumenDashboard> {
  const filas = await prisma.orden.findMany({
    select: {
      ciudad: true,
      estadoAnulacion: true,
      motivoAnulacion: true,
      comentario: true,
      recuperadoPorId: true,
      acuse: {
        select: {
          modemOnu: true,
          router: true,
          equipoDigital: true,
        },
      },
    },
  });

  return armarDashboard(filas);
}
