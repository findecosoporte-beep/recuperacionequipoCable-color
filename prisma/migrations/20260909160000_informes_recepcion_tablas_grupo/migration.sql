-- AlterTable
ALTER TABLE "informes_recepcion_filas" ADD COLUMN "n" TEXT NOT NULL DEFAULT '';
ALTER TABLE "informes_recepcion_filas" ADD COLUMN "fecha_cliente" TEXT NOT NULL DEFAULT '';

UPDATE "informes_recepcion_filas"
SET
  "n" = COALESCE("datos"->>'n', ''),
  "fecha_cliente" = COALESCE("datos"->>'fechaCliente', '');

-- CreateTable
CREATE TABLE "informes_recepcion_tipo_equipo" (
    "id" TEXT NOT NULL,
    "fila_id" TEXT NOT NULL,
    "caja_tv_analoga" TEXT NOT NULL DEFAULT '',
    "dtt" TEXT NOT NULL DEFAULT '',
    "dth" TEXT NOT NULL DEFAULT '',
    "modem" TEXT NOT NULL DEFAULT '',
    "ont" TEXT NOT NULL DEFAULT '',
    "router" TEXT NOT NULL DEFAULT '',
    "otros" TEXT NOT NULL DEFAULT '',
    "tipo_equipo" TEXT NOT NULL DEFAULT '',
    "identificador" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "informes_recepcion_tipo_equipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "informes_recepcion_datos_cliente" (
    "id" TEXT NOT NULL,
    "fila_id" TEXT NOT NULL,
    "modelo" TEXT NOT NULL DEFAULT '',
    "codigo_cliente" TEXT NOT NULL DEFAULT '',
    "contrato_anulado" TEXT NOT NULL DEFAULT '',
    "numero_orden" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "informes_recepcion_datos_cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "informes_recepcion_datos_equipo" (
    "id" TEXT NOT NULL,
    "fila_id" TEXT NOT NULL,
    "serie" TEXT NOT NULL DEFAULT '',
    "codigo_barra" TEXT NOT NULL DEFAULT '',
    "tarjeta" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "informes_recepcion_datos_equipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "informes_recepcion_datos_recepcion" (
    "id" TEXT NOT NULL,
    "fila_id" TEXT NOT NULL,
    "tecnico" TEXT NOT NULL DEFAULT '',
    "empresa_ejecutora" TEXT NOT NULL DEFAULT '',
    "procedencia" TEXT NOT NULL DEFAULT '',
    "ciudad" TEXT NOT NULL DEFAULT '',
    "region" TEXT NOT NULL DEFAULT '',
    "empresa" TEXT NOT NULL DEFAULT '',
    "supervisor" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "informes_recepcion_datos_recepcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "informes_recepcion_equipo_pendiente" (
    "id" TEXT NOT NULL,
    "fila_id" TEXT NOT NULL,
    "caja_tv_analoga_p" TEXT NOT NULL DEFAULT '',
    "dtt_p" TEXT NOT NULL DEFAULT '',
    "dth_p" TEXT NOT NULL DEFAULT '',
    "modem_p" TEXT NOT NULL DEFAULT '',
    "ont_p" TEXT NOT NULL DEFAULT '',
    "router_p" TEXT NOT NULL DEFAULT '',
    "otros_p" TEXT NOT NULL DEFAULT '',
    "total_p" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "informes_recepcion_equipo_pendiente_pkey" PRIMARY KEY ("id")
);

INSERT INTO "informes_recepcion_tipo_equipo" (
  "id", "fila_id", "caja_tv_analoga", "dtt", "dth", "modem", "ont", "router", "otros", "tipo_equipo", "identificador"
)
SELECT
  f."id",
  f."id",
  COALESCE(f."datos"->>'cajaTvAnaloga', ''),
  COALESCE(f."datos"->>'dtt', ''),
  COALESCE(f."datos"->>'dth', ''),
  COALESCE(f."datos"->>'modem', ''),
  COALESCE(f."datos"->>'ont', ''),
  COALESCE(f."datos"->>'router', ''),
  COALESCE(f."datos"->>'otros', ''),
  COALESCE(f."datos"->>'tipoEquipo', ''),
  COALESCE(f."datos"->>'identificador', '')
FROM "informes_recepcion_filas" f;

INSERT INTO "informes_recepcion_datos_cliente" (
  "id", "fila_id", "modelo", "codigo_cliente", "contrato_anulado", "numero_orden"
)
SELECT
  f."id",
  f."id",
  COALESCE(f."datos"->>'modelo', ''),
  COALESCE(f."datos"->>'codigoCliente', ''),
  COALESCE(f."datos"->>'contratoAnulado', ''),
  COALESCE(f."datos"->>'numeroOrden', '')
FROM "informes_recepcion_filas" f;

INSERT INTO "informes_recepcion_datos_equipo" (
  "id", "fila_id", "serie", "codigo_barra", "tarjeta"
)
SELECT
  f."id",
  f."id",
  COALESCE(f."datos"->>'serie', ''),
  COALESCE(f."datos"->>'codigoBarra', ''),
  COALESCE(f."datos"->>'tarjeta', '')
FROM "informes_recepcion_filas" f;

INSERT INTO "informes_recepcion_datos_recepcion" (
  "id", "fila_id", "tecnico", "empresa_ejecutora", "procedencia", "ciudad", "region", "empresa", "supervisor"
)
SELECT
  f."id",
  f."id",
  COALESCE(f."datos"->>'tecnico', ''),
  COALESCE(f."datos"->>'empresaEjecutora', ''),
  COALESCE(f."datos"->>'procedencia', ''),
  COALESCE(f."datos"->>'ciudad', ''),
  COALESCE(f."datos"->>'region', ''),
  COALESCE(f."datos"->>'empresa', ''),
  COALESCE(f."datos"->>'supervisor', '')
FROM "informes_recepcion_filas" f;

INSERT INTO "informes_recepcion_equipo_pendiente" (
  "id", "fila_id", "caja_tv_analoga_p", "dtt_p", "dth_p", "modem_p", "ont_p", "router_p", "otros_p", "total_p"
)
SELECT
  f."id",
  f."id",
  COALESCE(f."datos"->>'cajaTvAnalogaP', ''),
  COALESCE(f."datos"->>'dttP', ''),
  COALESCE(f."datos"->>'dthP', ''),
  COALESCE(f."datos"->>'modemP', ''),
  COALESCE(f."datos"->>'ontP', ''),
  COALESCE(f."datos"->>'routerP', ''),
  COALESCE(f."datos"->>'otrosP', ''),
  COALESCE(f."datos"->>'totalP', '')
FROM "informes_recepcion_filas" f;

CREATE UNIQUE INDEX "informes_recepcion_tipo_equipo_fila_id_key" ON "informes_recepcion_tipo_equipo"("fila_id");
CREATE UNIQUE INDEX "informes_recepcion_datos_cliente_fila_id_key" ON "informes_recepcion_datos_cliente"("fila_id");
CREATE UNIQUE INDEX "informes_recepcion_datos_equipo_fila_id_key" ON "informes_recepcion_datos_equipo"("fila_id");
CREATE UNIQUE INDEX "informes_recepcion_datos_recepcion_fila_id_key" ON "informes_recepcion_datos_recepcion"("fila_id");
CREATE UNIQUE INDEX "informes_recepcion_equipo_pendiente_fila_id_key" ON "informes_recepcion_equipo_pendiente"("fila_id");

ALTER TABLE "informes_recepcion_tipo_equipo"
  ADD CONSTRAINT "informes_recepcion_tipo_equipo_fila_id_fkey"
  FOREIGN KEY ("fila_id") REFERENCES "informes_recepcion_filas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "informes_recepcion_datos_cliente"
  ADD CONSTRAINT "informes_recepcion_datos_cliente_fila_id_fkey"
  FOREIGN KEY ("fila_id") REFERENCES "informes_recepcion_filas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "informes_recepcion_datos_equipo"
  ADD CONSTRAINT "informes_recepcion_datos_equipo_fila_id_fkey"
  FOREIGN KEY ("fila_id") REFERENCES "informes_recepcion_filas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "informes_recepcion_datos_recepcion"
  ADD CONSTRAINT "informes_recepcion_datos_recepcion_fila_id_fkey"
  FOREIGN KEY ("fila_id") REFERENCES "informes_recepcion_filas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "informes_recepcion_equipo_pendiente"
  ADD CONSTRAINT "informes_recepcion_equipo_pendiente_fila_id_fkey"
  FOREIGN KEY ("fila_id") REFERENCES "informes_recepcion_filas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "informes_recepcion_filas" DROP COLUMN "datos";
