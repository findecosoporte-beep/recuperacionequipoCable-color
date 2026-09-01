-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN "telefono" TEXT;
ALTER TABLE "usuarios" ADD COLUMN "zona" TEXT;

-- CreateIndex
CREATE INDEX "usuarios_rol_idx" ON "usuarios"("rol");
