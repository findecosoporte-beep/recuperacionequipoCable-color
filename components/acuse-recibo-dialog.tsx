"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import {
  ACCESORIOS,
  acuseDeOrden,
  acuseInicialDeOrden,
  htmlAcuse,
  validarAcuse,
  type AcuseRecibido,
} from "@/lib/acuse";
import { formatOrdenNumero } from "@/lib/format-orden";
import { imprimirHtml } from "@/lib/imprimir-html";
import type { Orden } from "@/lib/types";

interface Props {
  orden: Orden | null;
  firma: string;
  saving: boolean;
  onClose: () => void;
  onSave: (acuse: AcuseRecibido) => void;
}

export function AcuseReciboDialog({ orden, firma, saving, onClose, onSave }: Props) {
  const existente = orden ? acuseDeOrden(orden) : null;
  const [form, setForm] = useState<AcuseRecibido | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vista, setVista] = useState<"formulario" | "acuse">(existente ? "acuse" : "formulario");

  useEffect(() => {
    if (!orden) {
      setForm(null);
      setError(null);
      return;
    }
    const actual = acuseDeOrden(orden);
    setForm(acuseInicialDeOrden(orden, firma));
    setVista(actual ? "acuse" : "formulario");
    setError(null);
  }, [orden, firma]);

  const preview = useMemo(() => (form ? htmlAcuse(form) : ""), [form]);

  function setField<K extends keyof AcuseRecibido>(key: K, value: AcuseRecibido[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function setCantidad(nombre: string, delta: number) {
    setForm((prev) => {
      if (!prev) return prev;
      const actual = prev.accesorios[nombre] ?? 0;
      return {
        ...prev,
        accesorios: {
          ...prev.accesorios,
          [nombre]: Math.min(9, Math.max(0, actual + delta)),
        },
      };
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    const invalido = validarAcuse(form);
    if (invalido) {
      setError(invalido);
      return;
    }
    onSave(form);
  }

  return (
    <Dialog
      visible={Boolean(orden && form)}
      modal
      style={{ width: "94vw", maxWidth: "44rem" }}
      contentStyle={{ maxHeight: "80vh", overflow: "auto" }}
      header={
        orden
          ? `${existente ? "Acuse de recibo" : "Generar acuse"} · ${formatOrdenNumero(orden.orden)}`
          : "Acuse de recibo"
      }
      onHide={onClose}
    >
      {form ? (
        <div className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              label="Formulario"
              outlined={vista !== "formulario"}
              onClick={() => setVista("formulario")}
            />
            <Button
              type="button"
              label="Ver acuse"
              outlined={vista !== "acuse"}
              onClick={() => setVista("acuse")}
            />
            <Button
              type="button"
              label="Imprimir / PDF"
              icon="pi pi-print"
              severity="success"
              onClick={() => {
                if (!imprimirHtml(preview)) {
                  setError("No se pudo abrir la impresión. Prueba de nuevo.");
                }
              }}
            />
          </div>

          {vista === "acuse" ? (
            <iframe
              title="Acuse de recibo"
              srcDoc={preview}
              className="h-[32rem] w-full rounded-md border border-[var(--surface-200)] bg-white"
            />
          ) : (
            <form onSubmit={submit} className="grid gap-3">
              <p className="m-0 text-sm text-[var(--text-color-secondary)]">
                Mismo formato que la app del técnico (ISG Communications).
              </p>
              {(
                [
                  ["cliente", "Recibimos del cliente"],
                  ["contrato", "Contrato"],
                  ["fecha", "Fecha"],
                  ["modemOnu", "Modem/ONU"],
                  ["router", "Router"],
                  ["equipoDigital", "Equipo digital"],
                  ["nombreFirma", "Nombre y firma de quien recibe"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="grid gap-1 text-sm font-medium" htmlFor={`acuse-${key}`}>
                  {label}
                  <InputText
                    id={`acuse-${key}`}
                    className="w-full"
                    value={form[key]}
                    onChange={(event) => setField(key, event.target.value)}
                  />
                </label>
              ))}
              <div className="grid gap-2">
                <p className="m-0 text-sm font-medium">Accesorios</p>
                {ACCESORIOS.map((nombre) => (
                  <div key={nombre} className="flex items-center justify-between gap-3">
                    <span>{nombre}</span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        icon="pi pi-minus"
                        rounded
                        text
                        onClick={() => setCantidad(nombre, -1)}
                      />
                      <strong className="w-6 text-center">{form.accesorios[nombre] || 0}</strong>
                      <Button
                        type="button"
                        icon="pi pi-plus"
                        rounded
                        text
                        onClick={() => setCantidad(nombre, 1)}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {error ? <Message severity="error" text={error} /> : null}
              <div className="flex justify-end gap-2">
                <Button type="button" label="Cerrar" outlined onClick={onClose} disabled={saving} />
                <Button
                  type="submit"
                  label={existente ? "Guardar acuse" : "Generar acuse"}
                  icon="pi pi-check"
                  loading={saving}
                />
              </div>
            </form>
          )}
        </div>
      ) : null}
    </Dialog>
  );
}
