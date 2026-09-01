export interface NombreCliente {
  nombre: string;
  codigo: string;
}

const CON_CODIGO = /^(.*?)\s*\(([^)]+)\)\s*$/;
const SOLO_CODIGO = /^[A-Z0-9-]{3,20}$/i;

export function parseNombreCliente(raw: string | null | undefined): NombreCliente {
  const text = (raw ?? "").trim();
  if (!text) return { nombre: "", codigo: "" };

  const match = text.match(CON_CODIGO);
  if (match) {
    return {
      nombre: (match[1] ?? "").trim(),
      codigo: (match[2] ?? "").trim(),
    };
  }

  if (SOLO_CODIGO.test(text) && !text.includes(" ")) {
    return { nombre: "", codigo: text };
  }

  return { nombre: text, codigo: "" };
}

export function clienteParaGuardar(nombre: string, codigo: string): string {
  const name = nombre.trim();
  const code = codigo.trim();
  if (name && code) return `${name} (${code})`;
  return name || code;
}
