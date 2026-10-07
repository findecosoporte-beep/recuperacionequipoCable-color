import { empresaPorCiudad, MARCA_ORDEN } from "@/lib/whatsapp";

export function MarcaOrden({ ciudad }: { ciudad: string | null | undefined }) {
  const marca = MARCA_ORDEN[empresaPorCiudad(ciudad)];
  return (
    <span
      className="inline-flex w-fit items-center rounded px-2 py-0.5 text-xs font-bold"
      style={{ background: marca.fondo, color: marca.texto }}
    >
      {marca.label}
    </span>
  );
}
