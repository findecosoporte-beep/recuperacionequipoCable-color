import { equiposRecuperadosDe, esOrdenRecuperada } from "@/lib/estado-orden";
import { titleCase } from "@/lib/format-orden";

export interface FilaDashboard {
  ciudad: string;
  estadoAnulacion: string | null;
  motivoAnulacion: string | null;
  comentario: string | null;
  recuperadoPorId: string | null;
  acuse: {
    modemOnu: string;
    router: string;
    equipoDigital: string;
  } | null;
}

export interface ConteoCiudad {
  ciudad: string;
  recuperados: number;
  porAnular: number;
  anulados: number;
}

export interface ConteoNombre {
  nombre: string;
  total: number;
}

export interface ResumenDashboard {
  recuperados: number;
  porAnular: number;
  anulados: number;
  total: number;
  porCiudad: ConteoCiudad[];
  porMotivo: ConteoNombre[];
  porEquipo: ConteoNombre[];
}

const TOP_CIUDADES = 8;
const TOP_MOTIVOS = 6;

function clave(value: string): string {
  return value.trim().toLowerCase();
}

function esRecuperada(fila: FilaDashboard): boolean {
  if (fila.estadoAnulacion === "anulada" || fila.estadoAnulacion === "por_anular") {
    return false;
  }
  if (fila.recuperadoPorId) return true;
  return esOrdenRecuperada(fila.comentario, fila.acuse);
}

function tiposEquipo(fila: FilaDashboard): string[] {
  const tipos: string[] = [];
  if (fila.acuse?.modemOnu.trim()) tipos.push("Modem/ONU");
  if (fila.acuse?.router.trim()) tipos.push("Router");
  if (fila.acuse?.equipoDigital.trim()) tipos.push("Equipo digital");
  if (tipos.length > 0) return tipos;

  const texto = equiposRecuperadosDe(fila.comentario);
  if (!texto) return ["Sin detalle"];

  const partes = texto
    .split(/[,;/|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (partes.length === 0) return ["Sin detalle"];

  return partes.map((parte) => {
    const normal = parte
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    if (normal.includes("modem") || normal.includes("onu") || normal.includes("ont")) {
      return "Modem/ONU";
    }
    if (normal.includes("router")) return "Router";
    if (normal.includes("digital") || normal.includes("decod") || normal.includes("dtt")) {
      return "Equipo digital";
    }
    return titleCase(parte);
  });
}

function topConResto(
  entradas: Array<[string, number]>,
  limite: number,
  resto: string,
): ConteoNombre[] {
  const ordenadas = entradas
    .filter(([, total]) => total > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"));
  const principales = ordenadas.slice(0, limite);
  const otras = ordenadas.slice(limite).reduce((sum, [, total]) => sum + total, 0);
  const lista = principales.map(([nombre, total]) => ({ nombre, total }));
  if (otras > 0) lista.push({ nombre: resto, total: otras });
  return lista;
}

export function armarDashboard(filas: FilaDashboard[]): ResumenDashboard {
  let recuperados = 0;
  let porAnular = 0;
  let anulados = 0;
  const ciudades = new Map<string, ConteoCiudad>();
  const equipos = new Map<string, number>();

  for (const fila of filas) {
    const ciudadClave = clave(fila.ciudad) || "sin ciudad";
    const ciudadNombre = fila.ciudad.trim() ? titleCase(fila.ciudad) : "Sin ciudad";
    const ciudad = ciudades.get(ciudadClave) ?? {
      ciudad: ciudadNombre,
      recuperados: 0,
      porAnular: 0,
      anulados: 0,
    };

    if (fila.estadoAnulacion === "anulada") {
      anulados += 1;
      ciudad.anulados += 1;
    } else if (fila.estadoAnulacion === "por_anular") {
      porAnular += 1;
      ciudad.porAnular += 1;
    } else if (esRecuperada(fila)) {
      recuperados += 1;
      ciudad.recuperados += 1;
      for (const tipo of new Set(tiposEquipo(fila))) {
        equipos.set(tipo, (equipos.get(tipo) ?? 0) + 1);
      }
    } else {
      continue;
    }

    ciudades.set(ciudadClave, ciudad);
  }

  const motivosConNombre = new Map<string, { nombre: string; total: number }>();
  for (const fila of filas) {
    if (fila.estadoAnulacion !== "anulada" && fila.estadoAnulacion !== "por_anular") {
      continue;
    }
    const nombre = fila.motivoAnulacion?.trim()
      ? titleCase(fila.motivoAnulacion.trim())
      : "Sin motivo";
    const key = clave(nombre) || "sin motivo";
    const actual = motivosConNombre.get(key) ?? { nombre, total: 0 };
    actual.total += 1;
    motivosConNombre.set(key, actual);
  }

  const porCiudad = [...ciudades.values()]
    .map((item) => ({
      ...item,
      total: item.recuperados + item.porAnular + item.anulados,
    }))
    .sort((a, b) => b.total - a.total || a.ciudad.localeCompare(b.ciudad, "es"));

  const principales = porCiudad.slice(0, TOP_CIUDADES);
  const resto = porCiudad.slice(TOP_CIUDADES);
  if (resto.length > 0) {
    principales.push(
      resto.reduce(
        (acc, item) => ({
          ciudad: "Otras",
          recuperados: acc.recuperados + item.recuperados,
          porAnular: acc.porAnular + item.porAnular,
          anulados: acc.anulados + item.anulados,
          total: acc.total + item.total,
        }),
        { ciudad: "Otras", recuperados: 0, porAnular: 0, anulados: 0, total: 0 },
      ),
    );
  }

  return {
    recuperados,
    porAnular,
    anulados,
    total: recuperados + porAnular + anulados,
    porCiudad: principales.map(({ ciudad, recuperados: rec, porAnular: anular, anulados: anu }) => ({
      ciudad,
      recuperados: rec,
      porAnular: anular,
      anulados: anu,
    })),
    porMotivo: topConResto(
      [...motivosConNombre.values()].map((item) => [item.nombre, item.total]),
      TOP_MOTIVOS,
      "Otros motivos",
    ),
    porEquipo: topConResto([...equipos.entries()], 8, "Otros"),
  };
}
