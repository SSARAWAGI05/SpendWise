# ---- Frontend Dockerfile ----
FROM node:20-alpine AS frontend

WORKDIR /app

# Copy package.json + lock first (for caching)
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Build Vite frontend
RUN npm run build

# Serve with nginx
FROM nginx:alpine AS production
COPY --from=frontend /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
