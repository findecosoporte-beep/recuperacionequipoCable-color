-- CreateTable
CREATE TABLE "informes_recepcion_cargas" (
    "id" TEXT NOT NULL,
    "archivo" TEXT NOT NULL,
    "filas" INTEGER NOT NULL,
    "subido_por_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "informes_recepcion_cargas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "informes_recepcion_filas" (
    "id" TEXT NOT NULL,
    "carga_id" TEXT NOT NULL,
    "posicion" INTEGER NOT NULL,
    "datos" JSONB NOT NULL,

    CONSTRAINT "informes_recepcion_filas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "informes_recepcion_cargas_created_at_idx" ON "informes_recepcion_cargas"("created_at");

-- CreateIndex
CREATE INDEX "informes_recepcion_cargas_subido_por_id_idx" ON "informes_recepcion_cargas"("subido_por_id");

-- CreateIndex
CREATE INDEX "informes_recepcion_filas_carga_id_idx" ON "informes_recepcion_filas"("carga_id");

-- CreateIndex
CREATE INDEX "informes_recepcion_filas_carga_id_posicion_idx" ON "informes_recepcion_filas"("carga_id", "posicion");

-- AddForeignKey
ALTER TABLE "informes_recepcion_cargas" ADD CONSTRAINT "informes_recepcion_cargas_subido_por_id_fkey" FOREIGN KEY ("subido_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "informes_recepcion_filas" ADD CONSTRAINT "informes_recepcion_filas_carga_id_fkey" FOREIGN KEY ("carga_id") REFERENCES "informes_recepcion_cargas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
