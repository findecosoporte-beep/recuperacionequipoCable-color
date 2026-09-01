-- CreateTable
CREATE TABLE "ordenes" (
    "id" TEXT NOT NULL,
    "orden" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "colonia" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "comentario" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ordenes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ordenes_orden_key" ON "ordenes"("orden");

-- CreateIndex
CREATE INDEX "ordenes_cliente_idx" ON "ordenes"("cliente");

-- CreateIndex
CREATE INDEX "ordenes_ciudad_idx" ON "ordenes"("ciudad");

-- CreateIndex
CREATE INDEX "ordenes_colonia_idx" ON "ordenes"("colonia");

-- CreateIndex
CREATE INDEX "ordenes_telefono_idx" ON "ordenes"("telefono");

-- CreateIndex
CREATE INDEX "ordenes_created_at_idx" ON "ordenes"("created_at");
