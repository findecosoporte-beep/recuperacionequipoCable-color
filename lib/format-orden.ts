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

export function formatTelefono(telefono: string): string {
  const digits = telefono.replace(/\D/g, "");
  if (!digits) return telefono.trim() || "—";

  const numeros = splitPhones(digits);
  return numeros.map(prettyPhone).join("  /  ");
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
    return [digits.slice(0, 11), digits.slice(11)].filter((item) => item.length >= 8);
  }
  return [digits];
}

function prettyPhone(digits: string): string {
  if (digits.startsWith("504") && digits.length >= 11) {
    return `+504 ${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
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
