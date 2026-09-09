-- AlterTable
ALTER TABLE "informes_recepcion_cargas" ADD COLUMN "periodo" TEXT NOT NULL DEFAULT '2026-09';

UPDATE "informes_recepcion_cargas"
SET "periodo" = to_char("created_at" AT TIME ZONE 'America/Tegucigalpa', 'YYYY-MM');

ALTER TABLE "informes_recepcion_cargas" ALTER COLUMN "periodo" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "informes_recepcion_cargas_periodo_idx" ON "informes_recepcion_cargas"("periodo");
