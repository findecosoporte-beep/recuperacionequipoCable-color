-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN "empresa" TEXT NOT NULL DEFAULT 'isg';

UPDATE "usuarios"
SET "empresa" = 'cable_color'
WHERE "rol" = 'tecnico'
  AND lower("nombre") LIKE '%erick%';
