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
  if (digits.length === 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  if (digits.length === 8) {
    return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  }
  return telefono.trim() || "—";
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
