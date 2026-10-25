#!/bin/sh
set -e

echo "[entrypoint] Aplicando migraciones de Prisma..."
prisma migrate deploy

if [ "${SEED_DEMO_DATA:-true}" = "true" ]; then
  echo "[entrypoint] Cargando roles, admin y datos de demo (idempotente)..."
  prisma db seed
fi

echo "[entrypoint] Iniciando API NestJS..."
exec node dist/main.js
