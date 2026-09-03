const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@ordenes.local").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "Admin123!";
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.usuario.upsert({
    where: { email },
    update: {},
    create: {
      email,
      nombre: "Administrador",
      passwordHash,
      rol: "admin",
      activo: true,
    },
  });

  await prisma.orden.createMany({
    data: [
      {
        orden: "1001",
        cliente: "Juan Pérez",
        ciudad: "Guadalajara",
        colonia: "Centro",
        direccion: "Av. Juárez 100",
        telefono: "3312345678",
        comentario: "Entregar por la tarde",
      },
      {
        orden: "1002",
        cliente: "María López",
        ciudad: "Zapopan",
        colonia: "Americana",
        direccion: "Calle Libertad 45",
        telefono: "3323456789",
        comentario: null,
      },
      {
        orden: "1003",
        cliente: "Carlos Méndez",
        ciudad: "Guadalajara",
        colonia: "Obrera",
        direccion: "Calle 8 N.° 22",
        telefono: "3334567890",
        comentario: "Recuperó equipo: sí\nEquipos recuperados: ONU, Router",
      },
      {
        orden: "1004",
        cliente: "Ana Ruiz",
        ciudad: "Tlaquepaque",
        colonia: "San Pedro",
        direccion: "Av. Revolución 50",
        telefono: "3345678901",
        comentario: "Recuperar Equipos / Macs: AA:BB:CC:DD:EE:FF",
      },
    ],
    skipDuplicates: true,
  });

  console.info(`Usuario listo: ${email}`);
  await backfillAcuses();
}

async function backfillAcuses() {
  const ordenes = await prisma.orden.findMany({
    where: { comentario: { contains: "---ACUSE---" } },
    select: { id: true, comentario: true },
  });
  let guardados = 0;

  for (const orden of ordenes) {
    const acuse = extraerAcuseCjs(orden.comentario);
    const comentario = comentarioSinAcuseCjs(orden.comentario);
    if (acuse) {
      await prisma.infoAcuseRecibido.upsert({
        where: { ordenId: orden.id },
        create: { ordenId: orden.id, ...acuse },
        update: acuse,
      });
      guardados += 1;
    }
    if (comentario !== (orden.comentario ?? "").trim()) {
      await prisma.orden.update({
        where: { id: orden.id },
        data: { comentario: comentario || null },
      });
    }
  }

  if (ordenes.length > 0) {
    console.info(`Acuses migrados a info_acuse_recibido: ${guardados}`);
  }
}

function extraerAcuseCjs(comentario) {
  const text = comentario ?? "";
  const start = text.indexOf("---ACUSE---");
  const end = text.indexOf("---FIN-ACUSE---");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const json = JSON.parse(text.slice(start + "---ACUSE---".length, end).trim());
    if (!json || typeof json !== "object") return null;
    const texto = (value) => (typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim());
    const accesorios = {};
    const raw = json.accesorios ?? json.a;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      for (const [nombre, qty] of Object.entries(raw)) {
        const n = Number(qty);
        if (Number.isFinite(n) && n > 0) accesorios[nombre] = Math.min(9, Math.floor(n));
      }
    }
    return {
      cliente: texto(json.cliente ?? json.c),
      contrato: texto(json.contrato ?? json.n),
      fecha: texto(json.fecha ?? json.f),
      modemOnu: texto(json.modemOnu ?? json.modem_onu ?? json.m),
      router: texto(json.router ?? json.r),
      equipoDigital: texto(json.equipoDigital ?? json.equipo_digital ?? json.d),
      accesorios,
      nombreFirma: texto(json.nombreFirma ?? json.nombre_firma ?? json.s),
    };
  } catch {
    return null;
  }
}

function comentarioSinAcuseCjs(comentario) {
  return (comentario ?? "")
    .replace(/---ACUSE---[\s\S]*?---FIN-ACUSE---/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
