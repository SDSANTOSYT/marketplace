FROM node:22-bullseye

WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias (incluyendo herramientas de compilación para módulos nativos)
RUN npm ci --only=production

# Copiar el resto de la aplicación
COPY . .

# Crear directorio de uploads si no existe
RUN mkdir -p uploads

# Puerto del backend
EXPOSE 3001

# Comando para ejecutar la aplicación
CMD ["npm", "start"]
