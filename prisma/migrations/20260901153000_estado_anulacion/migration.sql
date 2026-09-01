-- AlterTable
ALTER TABLE "ordenes" ADD COLUMN "estado_anulacion" TEXT;

-- CreateIndex
CREATE INDEX "ordenes_estado_anulacion_idx" ON "ordenes"("estado_anulacion");
