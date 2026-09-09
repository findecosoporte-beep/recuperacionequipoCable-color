"use client";

import {
  COLUMNAS,
  FIJAS,
  GRUPOS,
  type FilaInforme,
} from "@/lib/informes-tabla";

const FILAS_VACIAS = 12;

interface Props {
  filas: FilaInforme[];
}

export function InformeTabla({ filas }: Props) {
  const filasTabla: FilaInforme[] =
    filas.length > 0
      ? filas
      : Array.from({ length: FILAS_VACIAS }, (): FilaInforme => ({}));

  return (
    <div className="informes-tabla-wrap" style={{ marginTop: 0 }}>
      <table className="informes-tabla">
        <colgroup>
          {COLUMNAS.map((col) => (
            <col key={col.key} style={{ width: col.width }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {FIJAS.map((col) => (
              <th key={col.key} rowSpan={2}>
                {col.label}
              </th>
            ))}
            {GRUPOS.map((grupo) => (
              <th key={grupo.label} colSpan={grupo.cols.length}>
                {grupo.label}
              </th>
            ))}
          </tr>
          <tr>
            {GRUPOS.flatMap((grupo) =>
              grupo.cols.map((col) => (
                <th key={col.key}>{col.label}</th>
              )),
            )}
          </tr>
        </thead>
        <tbody>
          {filasTabla.map((fila, index) => (
            <tr key={index}>
              {COLUMNAS.map((col) => (
                <td key={col.key}>{fila[col.key] ?? ""}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
