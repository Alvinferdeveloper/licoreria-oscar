# Build del API NestJS dentro del monorepo (contexto = raíz del repo)
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Prisma necesita openssl para su motor de consultas
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
COPY packages/shared-types/package.json packages/shared-types/
COPY apps/api/package.json apps/api/
RUN npm ci --workspace apps/api --workspace packages/shared-types --include-workspace-root=false || npm install

COPY packages/shared-types packages/shared-types
COPY apps/api apps/api
RUN npm run build --workspace packages/shared-types \
  && npx prisma generate --schema apps/api/prisma/schema.prisma \
  && npm run build --workspace apps/api

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV TZ=UTC
ENV PATH=/app/node_modules/.bin:$PATH

# pg_dump/pg_restore para los respaldos + openssl para Prisma
RUN apt-get update \
  && apt-get install -y --no-install-recommends postgresql-client openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/node_modules node_modules
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/prisma apps/api/prisma
COPY --from=build /app/apps/api/package.json apps/api/package.json
COPY --from=build /app/apps/api/tsconfig.json apps/api/tsconfig.json
COPY --from=build /app/packages/shared-types/dist packages/shared-types/dist
COPY --from=build /app/packages/shared-types/package.json packages/shared-types/package.json

COPY apps/api/docker-entrypoint.sh apps/api/docker-entrypoint.sh
RUN chmod +x apps/api/docker-entrypoint.sh

WORKDIR /app/apps/api
EXPOSE 3000

ENTRYPOINT ["sh", "docker-entrypoint.sh"]
