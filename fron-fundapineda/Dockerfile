# Etapa 1: Construcción
# Vite 8 requiere Node >= 20.19, node:18 no arranca el build.
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Etapa 2: Servidor de producción
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# nginx.conf aporta el try_files que evita el 404 al recargar rutas de React
# Router, ademas de cacheado, gzip y cabeceras de seguridad.
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
