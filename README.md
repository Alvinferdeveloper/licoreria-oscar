# Licorería — Control de Inventario y Facturación

Aplicación web de control de inventario y facturación para una licorería. Monorepo con backend NestJS + Prisma/PostgreSQL y frontend React + Vite, que se comunican exclusivamente por API REST.

## Estructura

```
apps/
  api/                 # Backend NestJS
  web/                 # Frontend React (Vite)
packages/
  shared-types/        # Tipos, enums y constantes compartidas
docker-compose.yml     # Postgres para desarrollo local
```

## Requisitos

- Node.js >= 20
- Docker (para PostgreSQL local)

## Setup de desarrollo

```bash
# 1. Instalar dependencias
npm install

# 2. Crear archivo de entorno del API
cp apps/api/.env.example apps/api/.env

# 3. Levantar PostgreSQL
npm run db:up

# 4. Generar cliente Prisma, correr migraciones y seed (roles, permisos, admin)
cd apps/api && npx prisma generate && cd ../..
npm run db:migrate
npm run db:seed

# 5. Compilar tipos compartidos
npm run build:shared

# 6. Correr backend y frontend (en terminales separadas)
npm run dev:api    # http://localhost:3000/api/v1 — Swagger en /api/docs
npm run dev:web    # http://localhost:5173
```

Credenciales iniciales del seed (configurables en `apps/api/.env`):

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | `admin@licoreria.local` | `Admin123*` |
| Vendedor | `vendedor@licoreria.local` | `Vendedor123*` |
| Consulta | `consulta@licoreria.local` | `Consulta123*` |

El seed también carga datos de demo (categorías, productos, proveedores, clientes, compras, ventas y Kardex) con fechas recientes, y sincroniza la secuencia de numeración de facturas.

## Scripts útiles

| Comando | Descripción |
|---|---|
| `npm run db:up` / `db:down` | Levantar/detener Postgres |
| `npm run db:migrate` | Migraciones Prisma (dev) |
| `npm run db:seed` | Seed de roles/permisos/admin |
| `npm run db:studio` | Prisma Studio |
| `npm run build` | Build de todos los workspaces |

## Convenciones

- Prefijo de API: `/api/v1/` — respuestas `{ data, meta? }`
- Números monetarios siempre como `Decimal`, nunca `float`
- Zona horaria: UTC en base de datos y backend; `America/Managua` en presentación
- Constantes globales (`CURRENCY`, `IVA_DEFAULT`, `BRAND_NAME`, etc.) viven en `packages/shared-types`
