# ============================================================
# Dockerfile del frontend SISVAC (React + Vite)
# Multi-stage: compila el proyecto y luego lo sirve con Nginx,
# más liviano que dejar corriendo el servidor de desarrollo de Vite.
# ============================================================

# --- Etapa 1: build ---
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# URL del backend que usará el frontend compilado (se puede
# sobreescribir al construir con --build-arg VITE_API_URL=...)
ARG VITE_API_URL=http://localhost:4000/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# --- Etapa 2: servir con Nginx ---
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
