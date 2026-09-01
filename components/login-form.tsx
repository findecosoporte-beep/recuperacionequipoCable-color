"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "primereact/button";
import { FloatLabel } from "primereact/floatlabel";
import { InputText } from "primereact/inputtext";
import { Message } from "primereact/message";
import { Password } from "primereact/password";
import { useAuth } from "@/components/auth-provider";

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@ordenes.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <FloatLabel>
        <InputText
          id="email"
          type="email"
          autoComplete="email"
          required
          className="w-full"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <label htmlFor="email">Email</label>
      </FloatLabel>
      <FloatLabel>
        <Password
          inputId="password"
          autoComplete="current-password"
          required
          feedback={false}
          toggleMask
          className="w-full"
          inputClassName="w-full"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <label htmlFor="password">Contraseña</label>
      </FloatLabel>
      {error ? <Message severity="error" text={error} /> : null}
      <Button
        type="submit"
        label={loading ? "Entrando..." : "Entrar"}
        icon="pi pi-sign-in"
        loading={loading}
      />
    </form>
  );
}
