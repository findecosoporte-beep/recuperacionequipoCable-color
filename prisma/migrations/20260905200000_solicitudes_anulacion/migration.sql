-- CreateTable
CREATE TABLE "solicitudes_anulacion" (
    "id" TEXT NOT NULL,
    "orden_id" TEXT,
    "numero_orden" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "colonia" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "solicitado_por_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solicitudes_anulacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "solicitudes_anulacion_created_at_idx" ON "solicitudes_anulacion"("created_at");

-- CreateIndex
CREATE INDEX "solicitudes_anulacion_orden_id_idx" ON "solicitudes_anulacion"("orden_id");

-- CreateIndex
CREATE INDEX "solicitudes_anulacion_solicitado_por_id_idx" ON "solicitudes_anulacion"("solicitado_por_id");

-- AddForeignKey
ALTER TABLE "solicitudes_anulacion" ADD CONSTRAINT "solicitudes_anulacion_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "ordenes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_anulacion" ADD CONSTRAINT "solicitudes_anulacion_solicitado_por_id_fkey" FOREIGN KEY ("solicitado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
