import { prisma } from "@/lib/db";
import {
  cargasVigentesPorPeriodo,
  resumenPendienteDeItems,
  type InformeEquipoPendienteCampos,
  type InformeResumenPendiente,
} from "@/lib/informes-tabla";

export interface FilaResumenCliente {
  ciudad: string;
  empresa: string;
  empresaEjecutora: string;
  codigoCliente: string;
  tipoEquipo: string;
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
  tiposEquipo: string[];
  empresasEjecutoras: string[];
  grupos: ResumenClienteGrupo[];
  total: number;
}

export interface FilaResumenPendiente extends InformeEquipoPendienteCampos {
  ciudad: string;
  periodo: string;
  tipoEquipo: string;
  empresaEjecutora: string;
}

export interface ResumenPendientePeriodo {
  periodo: string;
  pendiente: InformeResumenPendiente;
}

export interface ResumenEquipoPendiente {
  ciudades: string[];
  pendiente: InformeResumenPendiente;
  periodos: ResumenPendientePeriodo[];
}

function clave(value: string): string {
  return value.trim().toUpperCase();
}

function etiqueta(value: string, vacio: string): string {
  const trimmed = value.trim();
  return trimmed ? trimmed.toUpperCase() : vacio;
}

function unicosDe<T>(filas: T[], campo: keyof T): string[] {
  const map = new Map<string, string>();
  for (const fila of filas) {
    const raw = String(fila[campo] ?? "");
    const k = clave(raw);
    if (!k) continue;
    if (!map.has(k)) map.set(k, raw.trim());
  }
  return [...map.values()].sort((a, b) =>
    a.localeCompare(b, "es", { sensitivity: "base" }),
  );
}

export function armarResumenCodigosClientes(
  filas: FilaResumenCliente[],
  filtros?: {
    ciudad?: string | null;
    tipoEquipo?: string | null;
    empresaEjecutora?: string | null;
  },
): ResumenCodigosClientes {
  const ciudades = unicosDe(filas, "ciudad");
  const tiposEquipo = unicosDe(filas, "tipoEquipo");
  const empresasEjecutoras = unicosDe(filas, "empresaEjecutora");

  const ciudadFiltro = filtros?.ciudad?.trim() ? clave(filtros.ciudad) : "";
  const tipoFiltro = filtros?.tipoEquipo?.trim() ? clave(filtros.tipoEquipo) : "";
  const ejecutoraFiltro = filtros?.empresaEjecutora?.trim()
    ? clave(filtros.empresaEjecutora)
    : "";
  const visibles = filas.filter((fila) => {
    if (ciudadFiltro && clave(fila.ciudad) !== ciudadFiltro) return false;
    if (tipoFiltro && clave(fila.tipoEquipo) !== tipoFiltro) return false;
    if (ejecutoraFiltro && clave(fila.empresaEjecutora) !== ejecutoraFiltro) {
      return false;
    }
    return true;
  });

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

  return { ciudades, tiposEquipo, empresasEjecutoras, grupos, total: todos.size };
}

export async function obtenerResumenCodigosClientes(filtros?: {
  ciudad?: string | null;
  tipoEquipo?: string | null;
  empresaEjecutora?: string | null;
}): Promise<ResumenCodigosClientes> {
  const todas = await prisma.informeRecepcionCarga.findMany();
  const vigentes = cargasVigentesPorPeriodo(todas);
  const ids = vigentes.map((carga) => carga.id);
  if (ids.length === 0) {
    return {
      ciudades: [],
      tiposEquipo: [],
      empresasEjecutoras: [],
      grupos: [],
      total: 0,
    };
  }

  const items = await prisma.informeRecepcionFila.findMany({
    where: { cargaId: { in: ids } },
    select: {
      datosCliente: { select: { codigoCliente: true } },
      datosRecepcion: {
        select: { ciudad: true, empresa: true, empresaEjecutora: true },
      },
      tipoEquipo: { select: { tipoEquipo: true } },
    },
  });

  return armarResumenCodigosClientes(
    items.map((item) => ({
      ciudad: item.datosRecepcion?.ciudad ?? "",
      empresa: item.datosRecepcion?.empresa ?? "",
      empresaEjecutora: item.datosRecepcion?.empresaEjecutora ?? "",
      codigoCliente: item.datosCliente?.codigoCliente ?? "",
      tipoEquipo: item.tipoEquipo?.tipoEquipo ?? "",
    })),
    filtros,
  );
}

function camposPendiente(
  item?: Partial<InformeEquipoPendienteCampos> | null,
): InformeEquipoPendienteCampos {
  return {
    cajaTvAnalogaP: item?.cajaTvAnalogaP ?? "",
    dttP: item?.dttP ?? "",
    dthP: item?.dthP ?? "",
    modemP: item?.modemP ?? "",
    ontP: item?.ontP ?? "",
    routerP: item?.routerP ?? "",
    otrosP: item?.otrosP ?? "",
    totalP: item?.totalP ?? "",
  };
}

export function armarResumenEquipoPendiente(
  filas: FilaResumenPendiente[],
  filtros?: {
    ciudad?: string | null;
    periodo?: string | null;
    tipoEquipo?: string | null;
    empresaEjecutora?: string | null;
  },
): ResumenEquipoPendiente {
  const ciudadesMap = new Map<string, string>();
  for (const fila of filas) {
    const k = clave(fila.ciudad);
    if (!k) continue;
    if (!ciudadesMap.has(k)) ciudadesMap.set(k, fila.ciudad.trim());
  }
  const ciudades = [...ciudadesMap.values()].sort((a, b) =>
    a.localeCompare(b, "es", { sensitivity: "base" }),
  );

  const ciudadFiltro = filtros?.ciudad?.trim() ? clave(filtros.ciudad) : "";
  const periodoFiltro = filtros?.periodo?.trim() || "";
  const tipoFiltro = filtros?.tipoEquipo?.trim() ? clave(filtros.tipoEquipo) : "";
  const ejecutoraFiltro = filtros?.empresaEjecutora?.trim()
    ? clave(filtros.empresaEjecutora)
    : "";
  const visibles = filas.filter((fila) => {
    if (ciudadFiltro && clave(fila.ciudad) !== ciudadFiltro) return false;
    if (periodoFiltro && fila.periodo !== periodoFiltro) return false;
    if (tipoFiltro && clave(fila.tipoEquipo) !== tipoFiltro) return false;
    if (ejecutoraFiltro && clave(fila.empresaEjecutora) !== ejecutoraFiltro) {
      return false;
    }
    return true;
  });

  const porPeriodo = new Map<string, FilaResumenPendiente[]>();
  for (const fila of visibles) {
    const lista = porPeriodo.get(fila.periodo) ?? [];
    lista.push(fila);
    porPeriodo.set(fila.periodo, lista);
  }

  const periodos = [...porPeriodo.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([periodo, items]) => ({
      periodo,
      pendiente: resumenPendienteDeItems(items),
    }));

  return {
    ciudades,
    pendiente: resumenPendienteDeItems(visibles),
    periodos,
  };
}

export async function obtenerResumenEquipoPendiente(filtros?: {
  ciudad?: string | null;
  periodo?: string | null;
  tipoEquipo?: string | null;
  empresaEjecutora?: string | null;
}): Promise<ResumenEquipoPendiente> {
  const todas = await prisma.informeRecepcionCarga.findMany();
  const vigentes = cargasVigentesPorPeriodo(todas);
  const ids = vigentes.map((carga) => carga.id);
  if (ids.length === 0) {
    return {
      ciudades: [],
      pendiente: resumenPendienteDeItems([]),
      periodos: [],
    };
  }

  const items = await prisma.informeRecepcionFila.findMany({
    where: { cargaId: { in: ids } },
    select: {
      datosRecepcion: { select: { ciudad: true, empresaEjecutora: true } },
      tipoEquipo: { select: { tipoEquipo: true } },
      equipoPendiente: {
        select: {
          cajaTvAnalogaP: true,
          dttP: true,
          dthP: true,
          modemP: true,
          ontP: true,
          routerP: true,
          otrosP: true,
          totalP: true,
        },
      },
      carga: { select: { periodo: true } },
    },
  });

  return armarResumenEquipoPendiente(
    items.map((item) => ({
      ciudad: item.datosRecepcion?.ciudad ?? "",
      periodo: item.carga.periodo,
      tipoEquipo: item.tipoEquipo?.tipoEquipo ?? "",
      empresaEjecutora: item.datosRecepcion?.empresaEjecutora ?? "",
      ...camposPendiente(item.equipoPendiente),
    })),
    filtros,
  );
}
