# Imagen más ligera para Railway
FROM node:18-alpine

# Instalar dependencias mínimas para Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Variables de entorno optimizadas
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV CHROME_BIN=/usr/bin/chromium-browser
ENV CHROME_PATH=/usr/bin/chromium-browser

# Establecer directorio de trabajo
WORKDIR /app

# Copiar y instalar dependencias
COPY package*.json ./
RUN npm ci --only=production --no-audit --no-fund

# Copiar código fuente
COPY . .

# Usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001
USER nextjs

# Comando optimizado para Railway
CMD ["node", "index.js"]
