"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import {
  COLUMNAS,
  FIJAS,
  GRUPOS,
  type FilaInforme,
} from "@/lib/informes-tabla";
import { visiblePages } from "@/lib/format-orden";

const PAGE_SIZE = 10;

interface Props {
  filas: FilaInforme[];
  page?: number;
  total?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export function InformeTabla({
  filas,
  page,
  total,
  totalPages,
  onPageChange,
}: Props) {
  const server = Boolean(onPageChange);
  const [pageLocal, setPageLocal] = useState(1);

  useEffect(() => {
    if (!server) setPageLocal(1);
  }, [filas, server]);

  const totalSafe = server ? (total ?? filas.length) : filas.length;
  const pages = Math.max(
    1,
    server
      ? (totalPages ?? (Math.ceil(totalSafe / PAGE_SIZE) || 1))
      : (Math.ceil(totalSafe / PAGE_SIZE) || 1),
  );
  const pageSafe = Math.min(Math.max(server ? (page ?? 1) : pageLocal, 1), pages);

  const filasTabla = useMemo(() => {
    if (totalSafe === 0) {
      return Array.from({ length: PAGE_SIZE }, (): FilaInforme => ({}));
    }
    if (server) return filas;
    const start = (pageSafe - 1) * PAGE_SIZE;
    return filas.slice(start, start + PAGE_SIZE);
  }, [filas, pageSafe, server, totalSafe]);

  function cambiarPagina(next: number) {
    if (onPageChange) {
      onPageChange(next);
      return;
    }
    setPageLocal(next);
  }

  return (
    <div>
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
      {totalSafe > 0 ? (
        <div className="mt-3 flex flex-col gap-3 rounded-md border border-[var(--surface-200)] bg-[var(--surface-0)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm">
            Mostrando {Math.min((pageSafe - 1) * PAGE_SIZE + 1, totalSafe)}-
            {Math.min(pageSafe * PAGE_SIZE, totalSafe)} de {totalSafe}
          </span>
          <div className="flex flex-wrap items-center gap-1">
            <Button
              type="button"
              label="Anterior"
              size="small"
              outlined
              disabled={pageSafe <= 1}
              onClick={() => cambiarPagina(pageSafe - 1)}
            />
            {visiblePages(pageSafe, pages).map((item, index) =>
              item === "…" ? (
                <span key={`ellipsis-${index}`} className="px-2">
                  …
                </span>
              ) : (
                <Button
                  key={item}
                  type="button"
                  label={String(item)}
                  size="small"
                  outlined={item !== pageSafe}
                  onClick={() => cambiarPagina(item)}
                />
              ),
            )}
            <Button
              type="button"
              label="Siguiente"
              size="small"
              outlined
              disabled={pageSafe >= pages}
              onClick={() => cambiarPagina(pageSafe + 1)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
