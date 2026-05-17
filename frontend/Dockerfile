FROM node:22-bullseye as build

WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar la aplicación
COPY . .

# Build de la aplicación
RUN npm run build

# Stage final - nginx para servir los archivos estáticos
FROM nginx:alpine

# Copiar configuración de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los archivos built desde el stage anterior
COPY --from=build /app/dist /usr/share/nginx/html

# Puerto del frontend
EXPOSE 80

# Comando para ejecutar nginx
CMD ["nginx", "-g", "daemon off;"]
