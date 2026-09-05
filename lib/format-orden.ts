function isAllSameCase(value: string): boolean {
  const letters = value.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, "");
  if (!letters) return false;
  return letters === letters.toUpperCase() || letters === letters.toLowerCase();
}

export function titleCase(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "—";
  if (!isAllSameCase(trimmed)) return trimmed;

  return trimmed
    .toLowerCase()
    .split(/\s+/)
    .map((word) => {
      if (word.length <= 2 && ["de", "del", "la", "el", "y", "en"].includes(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export function formatOrdenNumero(orden: string): string {
  const value = orden.trim();
  if (!value) return "Sin número";
  if (/^F\d+$/i.test(value)) return `Folio ${value.slice(1)}`;
  if (/^\d+$/.test(value)) return `N.° ${value}`;
  return value;
}

const SEPARADOR_TELEFONOS = /(?:\s*[/,;|]\s*|\s+y\s+)/i;

export function formatTelefono(telefono: string): string {
  const numeros = telefonosFormateados(telefono).filter((item) => item !== "—");
  if (numeros.length === 0) return telefono.trim() || "—";
  return numeros.join("  /  ");
}

export function telefonosFormateados(telefono: string | null | undefined): [string, string] {
  const numeros = telefono ? telefonosDigitos(telefono).map(prettyPhone) : [];
  return [numeros[0] ?? "—", numeros[1] ?? "—"];
}

export function telefonosDigitos(telefono: string): string[] {
  const partes = telefono
    .split(SEPARADOR_TELEFONOS)
    .map((parte) => parte.replace(/\D/g, ""))
    .filter(Boolean);

  if (partes.length > 1) {
    return partes.flatMap((parte) => splitPhones(parte));
  }

  const digits = telefono.replace(/\D/g, "");
  if (!digits) return [];
  return splitPhones(digits);
}

function splitPhones(digits: string): string[] {
  if (digits.length <= 12) return [digits];
  for (const code of ["504", "503", "502", "505", "506", "507"]) {
    if (!digits.startsWith(code)) continue;
    const rest = digits.slice(code.length);
    const index = rest.indexOf(code);
    if (index >= 6) {
      return [
        digits.slice(0, code.length + index),
        ...splitPhones(rest.slice(index)),
      ];
    }
  }
  if (digits.length === 16) return [digits.slice(0, 8), digits.slice(8)];
  if (digits.startsWith("504") && digits.length >= 19) {
    return [digits.slice(0, 11), digits.slice(11)].filter(Boolean);
  }
  return [digits];
}

function prettyLocal(local: string): string {
  if (local.length <= 4) return local;
  return `${local.slice(0, 4)}-${local.slice(4)}`;
}

function prettyPhone(digits: string): string {
  if (digits.startsWith("504") && digits.length >= 7) {
    return `+504 ${prettyLocal(digits.slice(3))}`;
  }
  if (digits.length === 8) {
    return `+504 ${prettyLocal(digits)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return digits;
}

export function visiblePages(current: number, total: number): Array<number | "…"> {
  if (total <= 7) {
    return Array.from({ length: Math.max(total, 1) }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
  const result: Array<number | "…"> = [];

  for (const page of sorted) {
    const previous = result[result.length - 1];
    if (typeof previous === "number" && page - previous > 1) {
      result.push("…");
    }
    result.push(page);
  }

  return result;
}
