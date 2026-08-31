# Build del API NestJS dentro del monorepo (contexto = raíz del repo)
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
COPY packages/shared-types/package.json packages/shared-types/
COPY apps/api/package.json apps/api/
RUN npm ci --workspace apps/api --workspace packages/shared-types --include-workspace-root=false || npm install

COPY packages/shared-types packages/shared-types
COPY apps/api apps/api
RUN npm run build --workspace packages/shared-types \
  && npx prisma generate --schema apps/api/prisma/schema.prisma \
  && npm run build --workspace apps/api

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV TZ=UTC

COPY --from=build /app/node_modules node_modules
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/prisma apps/api/prisma
COPY --from=build /app/apps/api/package.json apps/api/package.json
COPY --from=build /app/packages/shared-types/dist packages/shared-types/dist
COPY --from=build /app/packages/shared-types/package.json packages/shared-types/package.json

EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
