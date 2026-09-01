"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { FloatLabel } from "primereact/floatlabel";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { clienteParaGuardar, parseNombreCliente } from "@/lib/nombre-cliente";
import type { Orden, OrdenPayload } from "@/lib/types";

interface FormState {
  orden: string;
  nombre: string;
  codigoCliente: string;
  ciudad: string;
  colonia: string;
  direccion: string;
  telefono: string;
  comentario: string;
}

const emptyForm: FormState = {
  orden: "",
  nombre: "",
  codigoCliente: "",
  ciudad: "",
  colonia: "",
  direccion: "",
  telefono: "",
  comentario: "",
};

interface OrdenFormModalProps {
  open: boolean;
  orden: Orden | null;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: OrdenPayload) => Promise<void>;
}

export function OrdenFormModal({
  open,
  orden,
  saving,
  error,
  onClose,
  onSubmit,
}: OrdenFormModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (!open) return;
    if (orden) {
      const parsed = parseNombreCliente(orden.cliente);
      setForm({
        orden: orden.orden,
        nombre: parsed.nombre,
        codigoCliente: parsed.codigo,
        ciudad: orden.ciudad,
        colonia: orden.colonia,
        direccion: orden.direccion,
        telefono: orden.telefono,
        comentario: orden.comentario ?? "",
      });
      return;
    }
    setForm(emptyForm);
  }, [open, orden]);

  function update(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({
      orden: form.orden,
      cliente: clienteParaGuardar(form.nombre, form.codigoCliente),
      ciudad: form.ciudad,
      colonia: form.colonia,
      direccion: form.direccion,
      telefono: form.telefono,
      comentario: form.comentario,
    });
  }

  return (
    <Dialog
      visible={open}
      modal
      style={{ width: "90vw", maxWidth: "42rem" }}
      header={orden ? "Editar orden" : "Nueva orden"}
      onHide={onClose}
    >
      <p className="mb-4 mt-0 text-sm text-[var(--text-color-secondary)]">
        El número entre paréntesis del Excel se guarda como código de cliente.
      </p>
      <form id="orden-form" onSubmit={handleSubmit} className="grid gap-6 sm:grid-cols-2">
        <FloatLabel>
          <InputText
            id="orden"
            required
            className="w-full"
            value={form.orden}
            onChange={(event) => update("orden", event.target.value)}
          />
          <label htmlFor="orden">Orden</label>
        </FloatLabel>
        <FloatLabel>
          <InputText
            id="codigoCliente"
            className="w-full"
            value={form.codigoCliente}
            onChange={(event) => update("codigoCliente", event.target.value)}
          />
          <label htmlFor="codigoCliente">Código cliente</label>
        </FloatLabel>
        <div className="sm:col-span-2">
          <FloatLabel>
            <InputText
              id="nombre"
              required
              className="w-full"
              value={form.nombre}
              onChange={(event) => update("nombre", event.target.value)}
            />
            <label htmlFor="nombre">Cliente</label>
          </FloatLabel>
        </div>
        {(
          [
            ["ciudad", "Ciudad"],
            ["colonia", "Colonia"],
            ["direccion", "Dirección"],
            ["telefono", "Teléfono"],
          ] as const
        ).map(([field, label]) => (
          <FloatLabel key={field}>
            <InputText
              id={field}
              required
              className="w-full"
              value={form[field]}
              onChange={(event) => update(field, event.target.value)}
            />
            <label htmlFor={field}>{label}</label>
          </FloatLabel>
        ))}
        <div className="sm:col-span-2">
          <FloatLabel>
            <InputTextarea
              id="comentario"
              rows={3}
              className="w-full"
              value={form.comentario}
              onChange={(event) => update("comentario", event.target.value)}
            />
            <label htmlFor="comentario">Comentario</label>
          </FloatLabel>
        </div>
        {error ? (
          <div className="sm:col-span-2">
            <Message severity="error" text={error} />
          </div>
        ) : null}
      </form>
      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" label="Cancelar" outlined onClick={onClose} />
        <Button
          type="submit"
          form="orden-form"
          label={saving ? "Guardando..." : "Guardar"}
          loading={saving}
        />
      </div>
    </Dialog>
  );
}
