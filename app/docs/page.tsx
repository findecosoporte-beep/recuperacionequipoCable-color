"use client";

import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Tag } from "primereact/tag";
import { AppShell } from "@/components/app-shell";

const endpoints = [
  {
    method: "GET",
    path: "/api/health",
    description: "Salud del servicio y de PostgreSQL. Usado por Railway.",
  },
  {
    method: "POST",
    path: "/api/v1/auth/login",
    description: "Inicio de sesión. Devuelve JWT para el frontend React.",
  },
  {
    method: "GET",
    path: "/api/v1/auth/me",
    description: "Usuario de la sesión actual.",
  },
  {
    method: "GET",
    path: "/api/v1/ordenes",
    description:
      "Lista paginada. Filtros: q, ciudad, colonia, cliente, orden, estado (recuperada | por_recuperar | por_anular | anulada), page, limit, sort, order.",
  },
  {
    method: "POST",
    path: "/api/v1/ordenes",
    description: "Crea una orden. El número de orden debe ser único.",
  },
  {
    method: "GET",
    path: "/api/v1/ordenes/:id",
    description: "Obtiene una orden por id interno o por número de orden.",
  },
  {
    method: "PATCH",
    path: "/api/v1/ordenes/:id",
    description: "Actualiza parcialmente una orden.",
  },
  {
    method: "DELETE",
    path: "/api/v1/ordenes/:id",
    description: "Elimina una orden. Solo administrador.",
  },
  {
    method: "POST",
    path: "/api/v1/ordenes/bulk",
    description: "Importa hasta 500 órdenes (ideal para Excel). Omite duplicados.",
  },
  {
    method: "GET",
    path: "/api/v1/tecnicos",
    description:
      "Lista técnicos recuperadores. Filtros: q, zona, activo, page, limit.",
  },
  {
    method: "POST",
    path: "/api/v1/tecnicos",
    description: "Crea un técnico recuperador (email, contraseña, zona, teléfono). Solo administrador.",
  },
  {
    method: "GET",
    path: "/api/v1/tecnicos/:id",
    description: "Consulta un técnico por id.",
  },
  {
    method: "PATCH",
    path: "/api/v1/tecnicos/:id",
    description: "Actualiza datos, contraseña o activa/desactiva la cuenta. Solo administrador.",
  },
  {
    method: "DELETE",
    path: "/api/v1/tecnicos/:id",
    description: "Elimina un técnico recuperador. Solo administrador.",
  },
  {
    method: "GET",
    path: "/api/v1/asignaciones",
    description:
      "Resumen de órdenes por ciudad y barrio. Query: tecnicoId, q (ciudad o colonia).",
  },
  {
    method: "POST",
    path: "/api/v1/asignaciones",
    description:
      "Asigna órdenes de una ciudad o barrio a un técnico. modo: libres | todas. colonia opcional.",
  },
  {
    method: "POST",
    path: "/api/v1/asignaciones/liberar",
    description: "Quita las órdenes de una ciudad o barrio al técnico indicado.",
  },
  {
    method: "POST",
    path: "/api/v1/asignaciones/orden",
    description: "Asigna o quita una sola orden a un técnico. Body: ordenId, tecnicoId (null para liberar).",
  },
  {
    method: "GET",
    path: "/api/v1/avisos-whatsapp",
    description: "Control semanal de WhatsApp enviados. Query: desde, hasta (YYYY-MM-DD).",
  },
  {
    method: "POST",
    path: "/api/v1/avisos-whatsapp",
    description:
      "Registra avisos de WhatsApp. Body: ordenId, empresa (isg | cable_color), telefono opcional. Sin teléfono registra Teléfono 1 y Teléfono 2.",
  },
  {
    method: "POST",
    path: "/api/v1/acuses/enlace",
    description: "Crea el enlace público del acuse para enviarlo por WhatsApp. Body: ordenId.",
  },
  {
    method: "GET",
    path: "/api/v1/reportes",
    description:
      "Reporte de recuperadas o por anular. Query: tipo (recuperadas | por_anular), desde, hasta, ciudad, q.",
  },
];

const fields = [
  { name: "orden", required: true, detail: "Número o folio único de la orden" },
  { name: "cliente", required: true, detail: "Nombre del cliente" },
  { name: "ciudad", required: true, detail: "Ciudad de entrega" },
  { name: "colonia", required: true, detail: "Colonia o fraccionamiento" },
  { name: "direccion", required: true, detail: "Calle y número" },
  { name: "telefono", required: true, detail: "Teléfono de contacto" },
  { name: "comentario", required: false, detail: "Notas de entrega (opcional)" },
];

const exampleBody = `{
  "orden": "1001",
  "cliente": "Juan Pérez",
  "ciudad": "Guadalajara",
  "colonia": "Centro",
  "direccion": "Av. Juárez 100",
  "telefono": "3312345678",
  "comentario": "Entregar por la tarde"
}`;

function methodSeverity(method: string): "success" | "info" | "warning" | "danger" {
  if (method === "GET") return "success";
  if (method === "DELETE") return "danger";
  if (method === "PATCH") return "warning";
  return "info";
}

export default function DocsPage() {
  return (
    <AppShell title="API Órdenes" subtitle="Documentación">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
        <Card title="Campos del modelo" subTitle="Misma estructura que tu hoja de cálculo.">
          <DataTable value={fields} dataKey="name">
            <Column field="name" header="Campo" body={(field) => <code>{field.name}</code>} />
            <Column
              header="Requerido"
              body={(field) => (
                <Tag
                  value={field.required ? "Obligatorio" : "Opcional"}
                  severity={field.required ? "danger" : "secondary"}
                />
              )}
            />
            <Column field="detail" header="Detalle" />
          </DataTable>
        </Card>

        <Card
          title="Endpoints"
          subTitle="Autenticación con JWT (Authorization: Bearer) o cabecera X-API-Key."
        >
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {endpoints.map((endpoint) => (
              <li
                key={endpoint.path + endpoint.method}
                className="flex flex-col gap-2 sm:flex-row sm:items-start"
              >
                <Tag value={endpoint.method} severity={methodSeverity(endpoint.method)} />
                <code className="text-sm font-semibold">{endpoint.path}</code>
                <p className="m-0 text-sm text-[var(--text-color-secondary)] sm:flex-1">
                  {endpoint.description}
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Ejemplo de creación">
          <pre className="overflow-x-auto rounded-lg bg-[var(--surface-900)] p-4 text-sm text-[var(--surface-0)]">
            <code>{`curl -X POST "$API_URL/api/v1/ordenes" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $TOKEN" \\
  -d '${exampleBody.replaceAll("\n", "")}'`}</code>
          </pre>
          <pre className="mt-4 overflow-x-auto rounded-lg bg-[var(--surface-100)] p-4 text-sm">
            <code>{exampleBody}</code>
          </pre>
        </Card>
      </main>
    </AppShell>
  );
}
