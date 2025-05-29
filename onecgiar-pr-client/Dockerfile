#################### BUILD STAGE ####################
FROM node:20-alpine AS build

# Set working directory
WORKDIR /usr/src/app

# Copy dependencies
COPY package*.json ./
RUN npm ci

# Copy the application code
COPY . .

# Build Angular app in dev mode (as solicitado)
RUN npm run build:dev

#################### PRODUCTION STAGE ####################
FROM nginx:alpine

# Remove default Nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built Angular files
COPY --from=build /usr/src/app/dist/onecgiar-pr-client /usr/share/nginx/html

# Set permissions
RUN chmod -R 755 /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
