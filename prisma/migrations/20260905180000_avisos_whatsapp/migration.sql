-- CreateTable
CREATE TABLE "avisos_whatsapp" (
    "id" TEXT NOT NULL,
    "orden_id" TEXT,
    "numero_orden" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "empresa" TEXT NOT NULL,
    "enviado_por_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avisos_whatsapp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "avisos_whatsapp_created_at_idx" ON "avisos_whatsapp"("created_at");

-- CreateIndex
CREATE INDEX "avisos_whatsapp_orden_id_idx" ON "avisos_whatsapp"("orden_id");

-- CreateIndex
CREATE INDEX "avisos_whatsapp_enviado_por_id_idx" ON "avisos_whatsapp"("enviado_por_id");

-- AddForeignKey
ALTER TABLE "avisos_whatsapp" ADD CONSTRAINT "avisos_whatsapp_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "ordenes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avisos_whatsapp" ADD CONSTRAINT "avisos_whatsapp_enviado_por_id_fkey" FOREIGN KEY ("enviado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
