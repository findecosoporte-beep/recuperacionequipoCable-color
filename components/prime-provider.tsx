"use client";

import { PrimeReactProvider, addLocale, locale } from "primereact/api";

addLocale("es", {
  firstDayOfWeek: 1,
  dayNames: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"],
  dayNamesShort: ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"],
  dayNamesMin: ["D", "L", "M", "X", "J", "V", "S"],
  monthNames: [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ],
  monthNamesShort: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
  today: "Hoy",
  clear: "Limpiar",
  emptyMessage: "No hay resultados",
  emptyFilterMessage: "Sin coincidencias",
});
locale("es");

export function PrimeProvider({ children }: { children: React.ReactNode }) {
  return (
    <PrimeReactProvider value={{ ripple: true, locale: "es" }}>
      {children}
    </PrimeReactProvider>
  );
}
