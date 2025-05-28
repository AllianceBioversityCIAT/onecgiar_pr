#################### BASE STAGE ####################
FROM node:20.13.1-alpine AS base

WORKDIR /app
COPY package*.json ./

#################### DEVELOPMENT STAGE ####################
FROM base AS development

RUN npm install && npm install --save-dev @types/node

COPY . .

RUN echo "{\"compilerOptions\": {\
    \"module\": \"commonjs\",\
    \"declaration\": true,\
    \"removeComments\": true,\
    \"emitDecoratorMetadata\": true,\
    \"experimentalDecorators\": true,\
    \"allowSyntheticDefaultImports\": true,\
    \"target\": \"es2017\",\
    \"sourceMap\": true,\
    \"outDir\": \"./dist\",\
    \"baseUrl\": \"./\",\
    \"incremental\": true,\
    \"skipLibCheck\": true,\
    \"strictNullChecks\": false,\
    \"noImplicitAny\": false,\
    \"strictBindCallApply\": false,\
    \"forceConsistentCasingInFileNames\": false,\
    \"noFallthroughCasesInSwitch\": false,\
    \"esModuleInterop\": true,\
    \"types\": [\"node\", \"@nestjs/schedule\", \"jest\"]\
    }}" > tsconfig.json


# RUN npm run migration:run

RUN npm run build

CMD ["npm", "run", "start"]

#################### BUILD STAGE ####################
FROM base AS build
RUN npm ci --only=production
COPY . .
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
