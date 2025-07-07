#################### BUILD STAGE ####################
FROM node:20-alpine AS build

# Set timezone to Europe/Berlin (CET)
ENV TZ=Europe/Berlin
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/$TZ /etc/localtime && \
    echo $TZ > /etc/timezone

WORKDIR /usr/src/app

COPY package*.json ./
# RUN npm ci
RUN npm i

COPY . .

# Build in dev mode as per team requirement
RUN npm run build:dev

#################### TESTING STAGE ####################
FROM node:20-alpine AS test

# Set timezone to Europe/Berlin (CET)
ENV TZ=Europe/Berlin
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/$TZ /etc/localtime && \
    echo $TZ > /etc/timezone

WORKDIR /usr/src/app

COPY package*.json ./
# RUN npm ci
RUN npm i

COPY . .

# Run tests (adjust the script if needed)
CMD ["npm", "run", "test:coverage"]

#################### PRODUCTION STAGE ####################
FROM nginx:alpine

# Clean default Nginx html
RUN rm -rf /usr/share/nginx/html/*

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built Angular app from build stage
COPY --from=build /usr/src/app/dist/onecgiar-pr-client /usr/share/nginx/html

# Permissions
RUN chmod -R 755 /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
