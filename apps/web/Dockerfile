# Build del frontend React (Vite) servido con nginx
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
COPY packages/shared-types/package.json packages/shared-types/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace apps/web --workspace packages/shared-types --include-workspace-root=false || npm install

COPY packages/shared-types packages/shared-types
COPY apps/web apps/web
RUN npm run build --workspace packages/shared-types \
  && npm run build --workspace apps/web

FROM nginx:alpine AS runtime
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
