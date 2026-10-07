import { prisma } from "@/lib/db";
import { armarControlWhatsApp, armarDashboard, type ResumenDashboard } from "@/lib/dashboard";
import { inicioSemanaYmd, limitesDiaUtc, sumarDiasYmd, ymdEnZona } from "@/lib/fecha";
import { ROL_TECNICO } from "@/lib/roles";

export async function obtenerDashboard(): Promise<ResumenDashboard> {
  const hoy = ymdEnZona();
  const desde = sumarDiasYmd(inicioSemanaYmd(hoy), -7 * 7);

  const [filas, avisos, tecnicos] = await Promise.all([
    prisma.orden.findMany({
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
    }),
    prisma.avisoWhatsApp.findMany({
      where: { createdAt: { gte: limitesDiaUtc(desde) } },
      select: {
        createdAt: true,
        enviadoPor: { select: { nombre: true, rol: true } },
      },
    }),
    prisma.usuario.findMany({
      where: { rol: ROL_TECNICO, activo: true },
      select: { nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  const resumen = armarDashboard(filas);
  return {
    ...resumen,
    whatsapp: armarControlWhatsApp(
      avisos.map((aviso) => ({
        createdAt: aviso.createdAt.toISOString(),
        rol: aviso.enviadoPor?.rol ?? null,
        nombre: aviso.enviadoPor?.nombre ?? null,
      })),
      tecnicos,
      hoy,
    ),
  };
}
