"use client";

import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import {
  etiquetaSemana,
  fechaCorta,
  formatHora,
  nombreDia,
  sumarDiasYmd,
  ymdDeIso,
} from "@/lib/fecha";
import { tieneAcuse } from "@/lib/acuse";
import { formatOrdenNumero, titleCase } from "@/lib/format-orden";
import { parseNombreCliente } from "@/lib/nombre-cliente";
import type { Orden } from "@/lib/types";

interface Props {
  items: Orden[];
  semanaInicio: string;
  loading: boolean;
  onPrev: () => void;
  onNext: () => void;
  onHoy: () => void;
  onAcuse: (orden: Orden) => void;
}

export function RecuperadasPorSemana({
  items,
  semanaInicio,
  loading,
  onPrev,
  onNext,
  onHoy,
  onAcuse,
}: Props) {
  const dias = Array.from({ length: 7 }, (_, index) => {
    const ymd = sumarDiasYmd(semanaInicio, index);
    const delDia = items
      .filter((item) => ymdDeIso(item.recuperadaEn) === ymd)
      .sort((a, b) => (a.recuperadaEn ?? "").localeCompare(b.recuperadaEn ?? ""));
    return { ymd, delDia };
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" icon="pi pi-chevron-left" outlined onClick={onPrev} />
          <Button type="button" label="Esta semana" outlined onClick={onHoy} />
          <Button type="button" icon="pi pi-chevron-right" outlined onClick={onNext} />
        </div>
        <p className="m-0 text-sm font-semibold capitalize text-[var(--primary-color)]">
          Semana {etiquetaSemana(semanaInicio)} · {items.length} recuperada
          {items.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
        {dias.map((dia) => (
          <div
            key={dia.ymd}
            className="rounded-lg border border-[var(--surface-200)] bg-[var(--surface-0)] px-3 py-2"
          >
            <p className="m-0 text-xs font-bold uppercase tracking-wide text-[var(--primary-color)]">
              {nombreDia(dia.ymd)}
            </p>
            <p className="m-0 text-xs text-[var(--text-color-secondary)]">{fechaCorta(dia.ymd)}</p>
            <p className="m-0 mt-1 text-xl font-extrabold">{loading ? "—" : dia.delDia.length}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {dias.map((dia) => (
          <section
            key={`lista-${dia.ymd}`}
            className="overflow-hidden rounded-lg border border-[var(--surface-200)] bg-[var(--surface-0)]"
          >
            <header className="flex items-center justify-between bg-[var(--primary-50,#f3eaf9)] px-4 py-2">
              <strong className="capitalize">
                {nombreDia(dia.ymd)} · {fechaCorta(dia.ymd)}
              </strong>
              <Tag value={`${dia.delDia.length}`} />
            </header>
            {dia.delDia.length === 0 ? (
              <p className="m-0 px-4 py-3 text-sm text-[var(--text-color-secondary)]">
                Sin recuperadas este día
              </p>
            ) : (
              <ul className="m-0 list-none p-0">
                {dia.delDia.map((orden) => {
                  const { nombre } = parseNombreCliente(orden.cliente);
                  return (
                    <li
                      key={orden.id}
                      className="flex flex-wrap items-center gap-3 border-t border-[var(--surface-200)] px-4 py-2 text-sm"
                    >
                      <span className="w-24 font-bold text-[var(--primary-color)]">
                        {formatHora(orden.recuperadaEn)}
                      </span>
                      <Tag value={formatOrdenNumero(orden.orden)} severity="info" />
                      <span className="font-semibold">{titleCase(nombre || orden.cliente)}</span>
                      <span className="text-[var(--text-color-secondary)]">
                        {titleCase(orden.colonia)}, {titleCase(orden.ciudad)}
                      </span>
                      <Button
                        type="button"
                        label={tieneAcuse(orden) ? "Ver acuse" : "Generar acuse"}
                        icon="pi pi-file"
                        size="small"
                        text
                        severity={tieneAcuse(orden) ? "success" : undefined}
                        onClick={() => onAcuse(orden)}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
