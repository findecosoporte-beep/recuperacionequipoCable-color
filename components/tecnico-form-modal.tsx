"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { FloatLabel } from "primereact/floatlabel";
import { InputSwitch } from "primereact/inputswitch";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { Password } from "primereact/password";
import type { Tecnico, TecnicoPayload } from "@/lib/types";

interface FormState {
  nombre: string;
  email: string;
  telefono: string;
  zona: string;
  password: string;
  activo: boolean;
}

const emptyForm: FormState = {
  nombre: "",
  email: "",
  telefono: "",
  zona: "",
  password: "",
  activo: true,
};

interface TecnicoFormModalProps {
  open: boolean;
  tecnico: Tecnico | null;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: TecnicoPayload) => Promise<void>;
}

export function TecnicoFormModal({
  open,
  tecnico,
  saving,
  error,
  onClose,
  onSubmit,
}: TecnicoFormModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (!open) return;
    if (tecnico) {
      setForm({
        nombre: tecnico.nombre,
        email: tecnico.email,
        telefono: tecnico.telefono ?? "",
        zona: tecnico.zona ?? "",
        password: "",
        activo: tecnico.activo,
      });
      return;
    }
    setForm(emptyForm);
  }, [open, tecnico]);

  function update<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({
      nombre: form.nombre,
      email: form.email,
      telefono: form.telefono,
      zona: form.zona,
      activo: form.activo,
      ...(form.password.trim() ? { password: form.password } : {}),
    });
  }

  return (
    <Dialog
      visible={open}
      modal
      style={{ width: "90vw", maxWidth: "36rem" }}
      header={tecnico ? "Editar técnico" : "Nuevo técnico recuperador"}
      onHide={onClose}
    >
      <p className="mb-4 mt-0 text-sm text-[var(--text-color-secondary)]">
        Estas cuentas sirven para entrar a la app de campo. El panel web queda
        para operadores y administradores.
      </p>
      <form id="tecnico-form" onSubmit={handleSubmit} className="grid gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FloatLabel>
            <InputText
              id="tecnico-nombre"
              required
              className="w-full"
              value={form.nombre}
              onChange={(event) => update("nombre", event.target.value)}
            />
            <label htmlFor="tecnico-nombre">Nombre</label>
          </FloatLabel>
        </div>
        <div className="sm:col-span-2">
          <FloatLabel>
            <InputText
              id="tecnico-email"
              type="email"
              required
              className="w-full"
              autoComplete="off"
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
            />
            <label htmlFor="tecnico-email">Email</label>
          </FloatLabel>
        </div>
        <FloatLabel>
          <InputText
            id="tecnico-telefono"
            className="w-full"
            value={form.telefono}
            onChange={(event) => update("telefono", event.target.value)}
          />
          <label htmlFor="tecnico-telefono">Teléfono</label>
        </FloatLabel>
        <FloatLabel>
          <InputText
            id="tecnico-zona"
            className="w-full"
            value={form.zona}
            onChange={(event) => update("zona", event.target.value)}
          />
          <label htmlFor="tecnico-zona">Zona</label>
        </FloatLabel>
        <div className="sm:col-span-2">
          <FloatLabel>
            <Password
              inputId="tecnico-password"
              feedback={false}
              toggleMask
              className="w-full"
              inputClassName="w-full"
              autoComplete="new-password"
              required={!tecnico}
              value={form.password}
              onChange={(event) => update("password", event.target.value)}
            />
            <label htmlFor="tecnico-password">
              {tecnico ? "Nueva contraseña (opcional)" : "Contraseña"}
            </label>
          </FloatLabel>
        </div>
        <label className="flex items-center gap-3 text-sm font-medium sm:col-span-2">
          <InputSwitch
            inputId="tecnico-activo"
            checked={form.activo}
            onChange={(event) => update("activo", Boolean(event.value))}
          />
          Cuenta activa
        </label>
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
          form="tecnico-form"
          label={saving ? "Guardando..." : "Guardar"}
          loading={saving}
        />
      </div>
    </Dialog>
  );
}
