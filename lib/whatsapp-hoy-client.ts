"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { ymdEnZona } from "@/lib/fecha";
import type { AvisoWhatsApp } from "@/lib/types";
import { avisoEnviadoHoy, type ClaveAvisoHoy } from "@/lib/whatsapp-hoy";

let cache: AvisoWhatsApp[] | null = null;
let inflight: Promise<AvisoWhatsApp[]> | null = null;
const listeners = new Set<(avisos: AvisoWhatsApp[]) => void>();

function publicar(avisos: AvisoWhatsApp[]) {
  cache = avisos;
  for (const listener of listeners) listener(avisos);
}

async function cargarAvisosHoy(force = false): Promise<AvisoWhatsApp[]> {
  if (!force && cache) return cache;
  if (inflight) return inflight;

  const hoy = ymdEnZona();
  inflight = apiRequest<AvisoWhatsApp[]>(
    `/api/v1/avisos-whatsapp?desde=${hoy}&hasta=${hoy}`,
  )
    .then((data) => {
      publicar(data);
      return data;
    })
    .catch(() => cache ?? [])
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function recordarAvisoHoy(input: {
  ordenId: string;
  telefono: string;
  numeroOrden?: string;
  cliente?: string;
}) {
  const actual = cache ?? [];
  if (avisoEnviadoHoy(actual, input)) {
    publicar(actual);
    return;
  }
  publicar([
    {
      id: `local-${input.ordenId}`,
      ordenId: input.ordenId,
      numeroOrden: input.numeroOrden ?? "",
      cliente: input.cliente ?? "",
      telefono: input.telefono,
      empresa: "isg",
      empresaLabel: "ISG",
      enviadoPor: "Panel",
      createdAt: new Date().toISOString(),
    },
    ...actual,
  ]);
}

export function useAvisosWhatsAppHoy() {
  const [avisos, setAvisos] = useState<AvisoWhatsApp[]>(cache ?? []);

  useEffect(() => {
    listeners.add(setAvisos);
    void cargarAvisosHoy();

    function recargar() {
      void cargarAvisosHoy(true);
    }

    window.addEventListener("aviso-whatsapp", recargar);
    return () => {
      listeners.delete(setAvisos);
      window.removeEventListener("aviso-whatsapp", recargar);
    };
  }, []);

  return {
    avisos,
    avisoDe: (clave: ClaveAvisoHoy) => avisoEnviadoHoy(avisos, clave),
  };
}
