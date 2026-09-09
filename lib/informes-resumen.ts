import { prisma } from "@/lib/db";
import { cargasVigentesPorPeriodo } from "@/lib/informes-tabla";

export interface FilaResumenCliente {
  ciudad: string;
  empresa: string;
  empresaEjecutora: string;
  codigoCliente: string;
}

export interface ResumenClienteHijo {
  empresaEjecutora: string;
  clientes: number;
}

export interface ResumenClienteGrupo {
  empresa: string;
  clientes: number;
  hijos: ResumenClienteHijo[];
}

export interface ResumenCodigosClientes {
  ciudades: string[];
  grupos: ResumenClienteGrupo[];
  total: number;
}

function clave(value: string): string {
  return value.trim().toUpperCase();
}

function etiqueta(value: string, vacio: string): string {
  const trimmed = value.trim();
  return trimmed ? trimmed.toUpperCase() : vacio;
}

export function armarResumenCodigosClientes(
  filas: FilaResumenCliente[],
  ciudad?: string | null,
): ResumenCodigosClientes {
  const ciudadesMap = new Map<string, string>();
  for (const fila of filas) {
    const k = clave(fila.ciudad);
    if (!k) continue;
    if (!ciudadesMap.has(k)) ciudadesMap.set(k, fila.ciudad.trim());
  }
  const ciudades = [...ciudadesMap.values()].sort((a, b) =>
    a.localeCompare(b, "es", { sensitivity: "base" }),
  );

  const filtro = ciudad?.trim() ? clave(ciudad) : "";
  const visibles = filtro
    ? filas.filter((fila) => clave(fila.ciudad) === filtro)
    : filas;

  const gruposMap = new Map<string, Map<string, Set<string>>>();
  const todos = new Set<string>();

  for (const fila of visibles) {
    const codigo = clave(fila.codigoCliente);
    if (!codigo) continue;
    const empresa = etiqueta(fila.empresa, "SIN EMPRESA");
    const ejecutora = etiqueta(fila.empresaEjecutora, "SIN EMPRESA EJECUTORA");
    const hijos = gruposMap.get(empresa) ?? new Map<string, Set<string>>();
    const codes = hijos.get(ejecutora) ?? new Set<string>();
    codes.add(codigo);
    hijos.set(ejecutora, codes);
    gruposMap.set(empresa, hijos);
    todos.add(codigo);
  }

  const grupos = [...gruposMap.entries()]
    .map(([empresa, hijosMap]) => {
      const hijos = [...hijosMap.entries()]
        .map(([empresaEjecutora, codes]) => ({
          empresaEjecutora,
          clientes: codes.size,
        }))
        .sort(
          (a, b) =>
            b.clientes - a.clientes ||
            a.empresaEjecutora.localeCompare(b.empresaEjecutora, "es"),
        );
      const clientes = new Set([...hijosMap.values()].flatMap((set) => [...set]))
        .size;
      return { empresa, clientes, hijos };
    })
    .sort(
      (a, b) =>
        b.clientes - a.clientes || a.empresa.localeCompare(b.empresa, "es"),
    );

  return { ciudades, grupos, total: todos.size };
}

export async function obtenerResumenCodigosClientes(
  ciudad?: string | null,
): Promise<ResumenCodigosClientes> {
  const todas = await prisma.informeRecepcionCarga.findMany();
  const vigentes = cargasVigentesPorPeriodo(todas);
  const ids = vigentes.map((carga) => carga.id);
  if (ids.length === 0) {
    return { ciudades: [], grupos: [], total: 0 };
  }

  const items = await prisma.informeRecepcionFila.findMany({
    where: { cargaId: { in: ids } },
    select: {
      datosCliente: { select: { codigoCliente: true } },
      datosRecepcion: {
        select: { ciudad: true, empresa: true, empresaEjecutora: true },
      },
    },
  });

  return armarResumenCodigosClientes(
    items.map((item) => ({
      ciudad: item.datosRecepcion?.ciudad ?? "",
      empresa: item.datosRecepcion?.empresa ?? "",
      empresaEjecutora: item.datosRecepcion?.empresaEjecutora ?? "",
      codigoCliente: item.datosCliente?.codigoCliente ?? "",
    })),
    ciudad,
  );
}
