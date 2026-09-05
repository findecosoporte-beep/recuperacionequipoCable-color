"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { apiRequest } from "@/lib/api-client";
import {
  etiquetaSemana,
  fechaCorta,
  formatHora,
  nombreDia,
  sumarDiasYmd,
  ymdDeIso,
} from "@/lib/fecha";
import { formatOrdenNumero, formatTelefono, titleCase } from "@/lib/format-orden";
import { parseNombreCliente } from "@/lib/nombre-cliente";
import type { AvisoWhatsApp } from "@/lib/types";

interface Props {
  semanaInicio: string;
  onPrev: () => void;
  onNext: () => void;
  onHoy: () => void;
}

export function WhatsAppPorSemana({ semanaInicio, onPrev, onNext, onHoy }: Props) {
  const [items, setItems] = useState<AvisoWhatsApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        desde: semanaInicio,
        hasta: sumarDiasYmd(semanaInicio, 6),
      });
      const data = await apiRequest<AvisoWhatsApp[]>(
        `/api/v1/avisos-whatsapp?${params.toString()}`,
      );
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el control de WhatsApp");
    } finally {
      setLoading(false);
    }
  }, [semanaInicio]);

  useEffect(() => {
    void load();
    function refresh() {
      void load();
    }
    window.addEventListener("aviso-whatsapp", refresh);
    return () => window.removeEventListener("aviso-whatsapp", refresh);
  }, [load]);

  const dias = Array.from({ length: 7 }, (_, index) => {
    const ymd = sumarDiasYmd(semanaInicio, index);
    const delDia = items
      .filter((item) => ymdDeIso(item.createdAt) === ymd)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
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
          Semana {etiquetaSemana(semanaInicio)} · {items.length} mensaje
          {items.length === 1 ? "" : "s"}
        </p>
      </div>

      {error ? <Message severity="error" text={error} /> : null}

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
            key={`avisos-${dia.ymd}`}
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
                Nadie recibió WhatsApp este día
              </p>
            ) : (
              <ul className="m-0 list-none p-0">
                {dia.delDia.map((aviso) => {
                  const { nombre } = parseNombreCliente(aviso.cliente);
                  return (
                    <li
                      key={aviso.id}
                      className="flex flex-wrap items-center gap-3 border-t border-[var(--surface-200)] px-4 py-2 text-sm"
                    >
                      <span className="w-24 font-bold text-[var(--primary-color)]">
                        {formatHora(aviso.createdAt)}
                      </span>
                      <Tag value={formatOrdenNumero(aviso.numeroOrden)} severity="info" />
                      <span className="font-semibold">{titleCase(nombre || aviso.cliente)}</span>
                      <span>{formatTelefono(aviso.telefono)}</span>
                      <Tag value={aviso.empresaLabel} />
                      <span className="text-[var(--text-color-secondary)]">
                        Envió {titleCase(aviso.enviadoPor)}
                      </span>
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
