-- AlterTable
ALTER TABLE "ordenes" ADD COLUMN "tecnico_id" TEXT;

-- CreateIndex
CREATE INDEX "ordenes_tecnico_id_idx" ON "ordenes"("tecnico_id");

-- AddForeignKey
ALTER TABLE "ordenes" ADD CONSTRAINT "ordenes_tecnico_id_fkey" FOREIGN KEY ("tecnico_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
