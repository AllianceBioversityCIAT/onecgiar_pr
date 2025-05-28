#################### BASE STAGE ####################
FROM node:20.13.1-alpine AS base

# Set working directory
WORKDIR /app

# Copy only package manifests
COPY package*.json ./

#################### DEVELOPMENT STAGE ####################
FROM base AS development

# Install all dependencies including devDependencies
RUN npm install && npm install --save-dev @types/node

# Copy full source including config and tsconfig
COPY . .

# Expose port for dev
EXPOSE 3000

# Build the application
RUN npm run build

# Default command for dev
CMD ["npm", "run", "start"]

#################### BUILD STAGE ####################
FROM base AS build

# Install only production dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Build application
RUN npm run build

#################### PRODUCTION STAGE ####################
FROM --platform=linux/amd64 node:20.13.1-alpine AS production

# Set working directory
WORKDIR /app

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy build artifacts and runtime files
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./

# Switch to non-root user
USER appuser

# Expose runtime port
EXPOSE 3000

# Start the app
CMD ["node", "dist/main.js"]
