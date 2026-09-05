"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { WhatsAppEmpresaSelector } from "@/components/whatsapp-empresa-selector";
import { apiRequestWithMeta } from "@/lib/api-client";
import { formatOrdenNumero, formatTelefono } from "@/lib/format-orden";
import type { Orden } from "@/lib/types";
import { useEmpresaWhatsApp } from "@/lib/whatsapp-empresa";
import { registrarEnvioWhatsApp } from "@/lib/whatsapp-envio";
import {
  destinosWhatsApp,
  mensajeWhatsApp,
  plantillaPorEmpresa,
  telefonoWhatsApp1,
  urlWhatsApp,
  type DestinoWhatsApp,
} from "@/lib/whatsapp";

interface Props {
  visible: boolean;
  search: string;
  onClose: () => void;
}

export function WhatsAppPorRecuperarDialog({ visible, search, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sinTelefono, setSinTelefono] = useState(0);
  const { empresa } = useEmpresaWhatsApp();
  const [destinos, setDestinos] = useState<DestinoWhatsApp[]>([]);
  const [plantilla, setPlantilla] = useState(() => plantillaPorEmpresa(empresa));
  const [indice, setIndice] = useState(0);
  const [enviados, setEnviados] = useState<string[]>([]);

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setDestinos([]);
    setIndice(0);
    setEnviados([]);

    void (async () => {
      try {
        const ordenes: Orden[] = [];
        let page = 1;
        let totalPages = 1;
        do {
          const params = new URLSearchParams({
            page: String(page),
            limit: "100",
            estado: "por_recuperar",
          });
          if (search.trim()) params.set("q", search.trim());
          const result = await apiRequestWithMeta<Orden[]>(
            `/api/v1/ordenes?${params.toString()}`,
          );
          ordenes.push(...result.data);
          totalPages = result.meta?.totalPages ?? 1;
          page += 1;
        } while (page <= totalPages);

        if (cancelled) return;
        setDestinos(destinosWhatsApp(ordenes));
        setSinTelefono(ordenes.filter((item) => !telefonoWhatsApp1(item.telefono)).length);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudieron cargar los teléfonos");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, search]);

  useEffect(() => {
    setPlantilla(plantillaPorEmpresa(empresa));
  }, [empresa]);

  const actual = destinos[indice] ?? null;
  const preview = useMemo(
    () => (actual ? mensajeWhatsApp(plantilla, actual) : plantilla),
    [actual, plantilla],
  );

  function abrirWhatsApp() {
    if (!actual) return;
    window.open(urlWhatsApp(actual.wa, preview), "_blank", "noopener,noreferrer");
    setEnviados((prev) => (prev.includes(actual.wa) ? prev : [...prev, actual.wa]));
    void registrarEnvioWhatsApp(actual.ordenId, empresa);
  }

  function abrirYSeguir() {
    abrirWhatsApp();
    if (indice < destinos.length - 1) {
      setIndice(indice + 1);
    }
  }

  return (
    <Dialog
      visible={visible}
      modal
      style={{ width: "92vw", maxWidth: "40rem" }}
      contentStyle={{ maxHeight: "75vh", overflow: "auto" }}
      header="WhatsApp a por recuperar"
      onHide={onClose}
    >
      <div className="grid gap-4">
        <p className="m-0 text-sm text-[var(--text-color-secondary)]">
          Se abre el chat del <strong>Teléfono 1</strong> de cada cliente, con su nombre
          y su orden ya puestos. Revisa, envía en WhatsApp y pasa al siguiente.
          {search.trim()
            ? " Se usan las órdenes de la búsqueda actual."
            : " Se usan todas las órdenes por recuperar."}
        </p>

        {loading ? (
          <Message severity="info" text="Cargando clientes con Teléfono 1..." />
        ) : null}
        {error ? <Message severity="error" text={error} /> : null}

        <WhatsAppEmpresaSelector compact />

        {!loading && !error ? (
          <p className="m-0 text-sm">
            {destinos.length === 0
              ? "No hay Teléfono 1 válido en por recuperar."
              : `${destinos.length} cliente${destinos.length === 1 ? "" : "s"} con Teléfono 1.`}
            {sinTelefono > 0
              ? ` ${sinTelefono} ${sinTelefono === 1 ? "orden sin Teléfono 1 usable." : "órdenes sin Teléfono 1 usable."}`
              : ""}
          </p>
        ) : null}

        <label className="grid gap-2 text-sm font-medium" htmlFor="mensaje-whatsapp">
          Mensaje
          <InputTextarea
            id="mensaje-whatsapp"
            rows={5}
            className="w-full"
            value={plantilla}
            onChange={(event) => setPlantilla(event.target.value)}
          />
        </label>
        <p className="m-0 text-xs text-[var(--text-color-secondary)]">
          Puedes usar {"{nombre}"}, {"{orden}"}, {"{colonia}"} y {"{ciudad}"}. El
          nombre de la empresa lo eliges arriba.
        </p>

        {actual ? (
          <div className="rounded-md border border-[var(--surface-200)] bg-[var(--surface-ground)] p-3">
            <p className="m-0 text-xs uppercase tracking-wide text-[var(--text-color-secondary)]">
              {indice + 1} de {destinos.length}
              {enviados.includes(actual.wa) ? " · abierto" : ""}
            </p>
            <p className="mt-2 mb-0 font-semibold">{actual.nombre}</p>
            <p className="mt-1 mb-0 text-sm">
              {formatTelefono(actual.wa)} ·{" "}
              {actual.ordenes.map((item) => formatOrdenNumero(item)).join(", ")}
            </p>
            <p className="mt-2 mb-0 text-sm text-[var(--text-color-secondary)]">{preview}</p>
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" label="Cerrar" outlined onClick={onClose} />
          <Button
            type="button"
            label="Anterior"
            icon="pi pi-chevron-left"
            outlined
            disabled={!actual || indice === 0}
            onClick={() => setIndice((value) => Math.max(0, value - 1))}
          />
          <Button
            type="button"
            label="Abrir WhatsApp"
            icon="pi pi-whatsapp"
            severity="success"
            disabled={!actual || !plantilla.trim()}
            onClick={abrirWhatsApp}
          />
          <Button
            type="button"
            label={indice >= destinos.length - 1 ? "Abrir este" : "Abrir y siguiente"}
            icon="pi pi-send"
            disabled={!actual || !plantilla.trim()}
            onClick={abrirYSeguir}
          />
        </div>
      </div>
    </Dialog>
  );
}
