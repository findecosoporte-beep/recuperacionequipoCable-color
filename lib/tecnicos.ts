import { prisma } from "@/lib/db";
import { publicUser } from "@/lib/auth";
import { notFound } from "@/lib/errors";
import { hashPassword } from "@/lib/password";
import { ROL_TECNICO } from "@/lib/roles";
import type { Prisma } from "@prisma/client";
import type {
  TecnicoCreateInput,
  TecnicoListQuery,
  TecnicoUpdateInput,
} from "@/lib/validators-tecnicos";

function contains(value: string) {
  return { contains: value, mode: "insensitive" as const };
}

function toTecnico(user: {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  telefono: string | null;
  zona: string | null;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...publicUser(user),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function buildWhere(query: TecnicoListQuery): Prisma.UsuarioWhereInput {
  const filters: Prisma.UsuarioWhereInput[] = [{ rol: ROL_TECNICO }];

  if (query.activo !== undefined) {
    filters.push({ activo: query.activo });
  }
  if (query.zona) {
    filters.push({ zona: contains(query.zona) });
  }
  if (query.q) {
    filters.push({
      OR: [
        { nombre: contains(query.q) },
        { email: contains(query.q) },
        { telefono: contains(query.q) },
        { zona: contains(query.q) },
      ],
    });
  }

  return { AND: filters };
}

export async function listTecnicos(query: TecnicoListQuery) {
  const where = buildWhere(query);
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await prisma.$transaction([
    prisma.usuario.findMany({
      where,
      orderBy: { nombre: "asc" },
      skip,
      take: query.limit,
    }),
    prisma.usuario.count({ where }),
  ]);

  return {
    items: items.map(toTecnico),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function findTecnico(id: string) {
  const user = await prisma.usuario.findFirst({
    where: { id, rol: ROL_TECNICO },
  });
  if (!user) {
    throw notFound("Técnico no encontrado");
  }
  return user;
}

export async function getTecnico(id: string) {
  return toTecnico(await findTecnico(id));
}

export async function createTecnico(input: TecnicoCreateInput) {
  const user = await prisma.usuario.create({
    data: {
      nombre: input.nombre,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      rol: ROL_TECNICO,
      telefono: input.telefono,
      zona: input.zona,
      activo: input.activo,
    },
  });
  return toTecnico(user);
}

export async function updateTecnico(id: string, input: TecnicoUpdateInput) {
  const current = await findTecnico(id);
  const user = await prisma.usuario.update({
    where: { id: current.id },
    data: {
      ...(input.nombre !== undefined ? { nombre: input.nombre } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.telefono !== undefined ? { telefono: input.telefono } : {}),
      ...(input.zona !== undefined ? { zona: input.zona } : {}),
      ...(input.activo !== undefined ? { activo: input.activo } : {}),
      ...(input.password
        ? { passwordHash: await hashPassword(input.password) }
        : {}),
    },
  });
  return toTecnico(user);
}

export async function deleteTecnico(id: string) {
  const current = await findTecnico(id);
  await prisma.usuario.delete({ where: { id: current.id } });
  return toTecnico(current);
}
