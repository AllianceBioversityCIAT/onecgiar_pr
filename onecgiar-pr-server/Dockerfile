#################### BASE STAGE ####################
FROM node:20.13.1-alpine AS base

WORKDIR /app
COPY package*.json ./

#################### DEVELOPMENT STAGE ####################
FROM base AS development

RUN npm install --ignore-scripts && npm install --ignore-scripts --save-dev @types/node

COPY src ./src
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY eslint.config.mjs ./
COPY scripts ./scripts

# Migrations are NOT run from this image, on purpose: the Jenkins deployment pipeline runs
# `npm run migration:run` as its own step and the migrations stay applied in the database
# (confirmed by Cristian Gamboa, 2 Sep 2026). This line is kept commented as a pointer, NOT as a
# pending task — uncommenting it would apply migrations at BUILD time, against whatever database
# the build can reach, which is not where they belong.
# RUN npm run migration:run

RUN npm run build

CMD ["npm", "run", "start"]

#################### BUILD STAGE ####################
FROM base AS build
RUN npm ci --ignore-scripts --only=production

COPY src ./src
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY package*.json ./
COPY eslint.config.mjs ./
COPY scripts ./scripts

RUN npm run build

#################### PRODUCTION STAGE ####################
FROM --platform=linux/amd64 node:20.13.1-alpine AS production

WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./

USER appuser
EXPOSE 3000
CMD ["node", "dist/main.js"]