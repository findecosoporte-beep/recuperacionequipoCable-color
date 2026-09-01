-- AlterTable
ALTER TABLE "ordenes" ADD COLUMN "recuperado_por_id" TEXT;

-- CreateIndex
CREATE INDEX "ordenes_recuperado_por_id_idx" ON "ordenes"("recuperado_por_id");

-- AddForeignKey
ALTER TABLE "ordenes" ADD CONSTRAINT "ordenes_recuperado_por_id_fkey" FOREIGN KEY ("recuperado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
