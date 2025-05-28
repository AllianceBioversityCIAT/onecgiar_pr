#########################
# BASE STAGE
#########################
FROM node:20.13.1-alpine AS base
WORKDIR /app

# Copiamos package.json / package-lock.json
COPY package*.json ./

#########################
# BUILD STAGE#
#########################
FROM base AS build

RUN npm ci

COPY . .

RUN npx ts-node -r tsconfig-paths/register \
    ./node_modules/typeorm/cli.js migration:run \
    -d ./src/config/orm.config.ts

RUN npm run build

#########################
# PRODUCTION STAGE
#########################
FROM --platform=linux/amd64 node:20.13.1-alpine AS production
WORKDIR /app

# Crea usuario no-root por seguridad
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copia artefactos compilados y dependencias de producción
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./

USER appuser
EXPOSE 3000

# Ejecuta la aplicación ya compilada
CMD ["node", "dist/main.js"]
