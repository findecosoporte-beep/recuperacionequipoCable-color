import { telefonosDigitos, titleCase } from "@/lib/format-orden";
import { parseNombreCliente } from "@/lib/nombre-cliente";
import type { Orden } from "@/lib/types";

export const MENSAJE_POR_RECUPERAR =
  "Hola {nombre}, le escribimos de Cable Color. Tenemos pendiente la recuperación de equipo de su servicio (orden {orden}) en {colonia}, {ciudad}. Un técnico pasará a recogerlo. Si ya lo entregó o tiene dudas, responda este mensaje. Gracias.";

export interface DestinoWhatsApp {
  wa: string;
  nombre: string;
  ordenes: string[];
  ciudad: string;
  colonia: string;
}

export function numeroWhatsApp(digits: string): string | null {
  const value = digits.replace(/\D/g, "");
  if (value.length < 8) return null;
  if (value.startsWith("504") && value.length >= 11) return value.slice(0, 11);
  if (value.startsWith("503") && value.length >= 11) return value.slice(0, 11);
  if (value.startsWith("502") && value.length >= 11) return value.slice(0, 11);
  if (value.startsWith("505") && value.length >= 11) return value.slice(0, 11);
  if (value.startsWith("506") && value.length >= 11) return value.slice(0, 11);
  if (value.startsWith("507") && value.length >= 11) return value.slice(0, 11);
  if (value.startsWith("52") && value.length >= 12) return value.slice(0, 12);
  if (value.length === 8) return `504${value}`;
  if (value.length === 10) return `52${value}`;
  if (value.length >= 11 && value.length <= 15) return value;
  return null;
}

export function numerosWhatsAppDe(telefono: string): string[] {
  const unicos = new Set<string>();
  for (const digits of telefonosDigitos(telefono)) {
    const wa = numeroWhatsApp(digits);
    if (wa) unicos.add(wa);
  }
  return [...unicos];
}

export function destinosWhatsApp(ordenes: Orden[]): DestinoWhatsApp[] {
  const porNumero = new Map<string, DestinoWhatsApp>();

  for (const orden of ordenes) {
    const { nombre } = parseNombreCliente(orden.cliente);
    const display = titleCase(nombre || orden.cliente);
    for (const wa of numerosWhatsAppDe(orden.telefono)) {
      const actual = porNumero.get(wa);
      if (actual) {
        if (!actual.ordenes.includes(orden.orden)) {
          actual.ordenes.push(orden.orden);
        }
        continue;
      }
      porNumero.set(wa, {
        wa,
        nombre: display,
        ordenes: [orden.orden],
        ciudad: titleCase(orden.ciudad),
        colonia: titleCase(orden.colonia),
      });
    }
  }

  return [...porNumero.values()];
}

export function mensajeWhatsApp(plantilla: string, destino: DestinoWhatsApp): string {
  return plantilla
    .replaceAll("{nombre}", destino.nombre || "cliente")
    .replaceAll("{orden}", destino.ordenes.join(", "))
    .replaceAll("{ciudad}", destino.ciudad)
    .replaceAll("{colonia}", destino.colonia);
}

export function urlWhatsApp(wa: string, texto: string): string {
  return `https://wa.me/${wa}?text=${encodeURIComponent(texto)}`;
}
