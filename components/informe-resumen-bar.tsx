"use client";

import {
  COLUMNAS_RESUMEN_PENDIENTE,
  type InformeResumenPendiente,
} from "@/lib/informes-tabla";

interface Props {
  pendiente: InformeResumenPendiente;
}

export function InformeResumenBar({ pendiente }: Props) {
  return (
    <div className="informe-resumen-wrap">
      <table className="informe-resumen">
        <tbody>
          <tr>
            {COLUMNAS_RESUMEN_PENDIENTE.map((col) => (
              <td key={col.key} className="informe-resumen-valor">
                {pendiente[col.key] || ""}
              </td>
            ))}
          </tr>
          <tr>
            {COLUMNAS_RESUMEN_PENDIENTE.map((col) => (
              <th key={col.key} className="informe-resumen-label" scope="col">
                <span>{col.label}</span>
              </th>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
