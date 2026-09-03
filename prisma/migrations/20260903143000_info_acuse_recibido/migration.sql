-- CreateTable
CREATE TABLE "info_acuse_recibido" (
    "id" TEXT NOT NULL,
    "orden_id" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "contrato" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "modem_onu" TEXT NOT NULL DEFAULT '',
    "router" TEXT NOT NULL DEFAULT '',
    "equipo_digital" TEXT NOT NULL DEFAULT '',
    "accesorios" JSONB NOT NULL DEFAULT '{}',
    "nombre_firma" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "info_acuse_recibido_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "info_acuse_recibido_orden_id_key" ON "info_acuse_recibido"("orden_id");

-- AddForeignKey
ALTER TABLE "info_acuse_recibido" ADD CONSTRAINT "info_acuse_recibido_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "ordenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
