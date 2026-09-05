"use client";

import { useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { apiRequestWithMeta } from "@/lib/api-client";
import { formatTelefono } from "@/lib/format-orden";
import type { Orden } from "@/lib/types";
import {
  destinosWhatsApp,
  MENSAJE_POR_RECUPERAR,
  telefonoWhatsApp1,
  urlWhatsAppDifusion,
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
  const [aviso, setAviso] = useState<string | null>(null);
  const [sinTelefono, setSinTelefono] = useState(0);
  const [destinos, setDestinos] = useState<DestinoWhatsApp[]>([]);
  const [mensaje, setMensaje] = useState(MENSAJE_POR_RECUPERAR);

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setAviso(null);
    setDestinos([]);
    setMensaje(MENSAJE_POR_RECUPERAR);

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

  function enviarUnMensaje() {
    if (!mensaje.trim() || destinos.length === 0) return;
    window.open(urlWhatsAppDifusion(mensaje.trim()), "_blank", "noopener,noreferrer");
  }

  async function copiarTelefonos() {
    const texto = destinos.map((item) => `+${item.wa}`).join("\n");
    try {
      await navigator.clipboard.writeText(texto);
      setAviso(`Se copiaron ${destinos.length} teléfonos (Teléfono 1).`);
    } catch {
      setError("No se pudieron copiar los teléfonos");
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
          Un solo mensaje para todos. Se usa el <strong>Teléfono 1</strong> de cada
          cliente (no el 2). Al pulsar el botón se abre WhatsApp una vez: elige tu{" "}
          <strong>lista de difusión</strong> y envía. Así el mismo texto llega a todos
          de un solo envío.
          {search.trim()
            ? " Se usan las órdenes de la búsqueda actual."
            : " Se usan todas las órdenes por recuperar."}
        </p>

        {loading ? (
          <Message severity="info" text="Cargando clientes con Teléfono 1..." />
        ) : null}
        {error ? <Message severity="error" text={error} /> : null}
        {aviso ? <Message severity="success" text={aviso} /> : null}

        {!loading && !error ? (
          <p className="m-0 text-sm">
            {destinos.length === 0
              ? "No hay Teléfono 1 válido en por recuperar."
              : `${destinos.length} cliente${destinos.length === 1 ? "" : "s"} · un mensaje · Teléfono 1.`}
            {sinTelefono > 0
              ? ` ${sinTelefono} ${sinTelefono === 1 ? "orden sin Teléfono 1 usable." : "órdenes sin Teléfono 1 usable."}`
              : ""}
          </p>
        ) : null}

        <label className="grid gap-2 text-sm font-medium" htmlFor="mensaje-whatsapp">
          Mensaje (el mismo para todos)
          <InputTextarea
            id="mensaje-whatsapp"
            rows={5}
            className="w-full"
            value={mensaje}
            onChange={(event) => setMensaje(event.target.value)}
          />
        </label>

        {destinos.length > 0 ? (
          <div className="max-h-40 overflow-auto rounded-md border border-[var(--surface-200)] bg-[var(--surface-ground)] p-3 text-sm">
            {destinos.map((item) => (
              <p key={item.wa} className="m-0 py-1">
                {item.nombre} · {formatTelefono(item.wa)}
              </p>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" label="Cerrar" outlined onClick={onClose} />
          <Button
            type="button"
            label="Copiar Teléfono 1"
            icon="pi pi-copy"
            outlined
            disabled={destinos.length === 0}
            onClick={() => void copiarTelefonos()}
          />
          <Button
            type="button"
            label="Enviar un mensaje a todos"
            icon="pi pi-whatsapp"
            severity="success"
            disabled={destinos.length === 0 || !mensaje.trim()}
            onClick={enviarUnMensaje}
          />
        </div>
      </div>
    </Dialog>
  );
}
