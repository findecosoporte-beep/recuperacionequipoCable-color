import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

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
