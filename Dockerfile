# Stage 1: Build the frontend
FROM node:18 AS build

# Set working directory
WORKDIR /app

# Copy package files first (for caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the project
COPY . .

# Build the project
RUN npm run build

# Stage 2: Serve with nginx (production)
FROM nginx:stable-alpine

# Copy build output to nginx html folder
COPY --from=build /app/dist /usr/share/nginx/html

# Copy a basic nginx config (optional)
# EXPOSE 80 automatically from nginx
