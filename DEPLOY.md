# 🚀 Guía de Deployment - Stella Marketplace

## Configuración para Producción

Este documento describe cómo desplegar Stella Marketplace en **Vercel** (frontend) y **Railway** (backend).

---

## Backend: Railway

### 1️⃣ Preparación del Repositorio

Antes de deployar, asegúrate de que tu `.gitignore` incluya:

```
node_modules/
.env
.env.local
storage/data/marketplace.db
```

### 2️⃣ Crear Proyecto en Railway

1. Accede a [railway.app](https://railway.app)
2. Click en **"+ New Project"**
3. Selecciona **"Deploy from GitHub Repo"**
4. Autoriza Railway a acceder a tu GitHub
5. Selecciona el repositorio `marketplace`

### 3️⃣ Configurar Railway

**Durante la creación:**

- **Root Directory:** `backend/`
- **Node.js Version:** 22 (o superior)

**Environment Variables:**

Ve a **"Variables"** y agrega estas 5 variables:

```env
# Autenticación
JWT_SECRET=una-clave-muy-larga-segura-minimo-32-caracteres-CAMBIA-ESTO-EN-PRODUCCION

# URLs
FRONTEND_URL=https://tu-app.vercel.app
PORT=3001

# IA (opcional - elige uno)
GROQ_API_KEY=tu-clave-api-groq          # https://console.groq.com
# O
GEMINI_API_KEY=tu-clave-api-gemini      # https://aistudio.google.com/app/apikey
```

### 4️⃣ Configurar Persistencia de Datos

**Importante:** Sin esto, la BD SQLite se reinicia en cada deploy.

**Opción A: Volumen de Railway (Recomendado)**

1. En Railway, ve a **"Variables"** → **"Raw Editor"**
2. Agrega esta línea:

```
RAILWAY_VOLUME_MOUNT_PATH=/app/backend/storage
```

3. Ve a **"Settings"** → **"Volumes"**
4. Click en **"Add Volume"**
5. Mount Path: `/app/backend/storage`
6. Esto persiste los datos entre deploys

**Opción B: Base de Datos PostgreSQL**

Si tu aplicación crece, migra a PostgreSQL:

1. En Railway: **"+ New"** → **"Database"** → **"PostgreSQL"**
2. Railway inyectará automáticamente `DATABASE_URL`
3. Modifica `backend/database.js` para usar PostgreSQL en lugar de SQLite

### 5️⃣ Configurar Start Command

En Railway, asegúrate de que el comando de inicio sea:

```bash
npm start
```

O crea un `Procfile` en la raíz de `backend/`:

```
web: node server.js
```

### 6️⃣ Deploy

Railway deploy automáticamente cuando haces push a `main`:

```bash
git push origin main
```

**Tu backend estará disponible en:** `https://[proyecto-railway].up.railway.app`

### 7️⃣ Verificar Deployment

Prueba que el backend está funcionando:

```bash
curl https://[proyecto-railway].up.railway.app/api/products
```

---

## Frontend: Vercel

### 1️⃣ Conectar con GitHub

1. Ve a [vercel.com](https://vercel.com)
2. Click **"Add New"** → **"Project"**
3. Importa desde GitHub el repositorio `marketplace`

### 2️⃣ Configurar Vercel

**Import Settings:**

- **Project Name:** (tu elección)
- **Framework Preset:** React
- **Root Directory:** `frontend/`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

### 3️⃣ Environment Variables

Antes de confirmar el deploy, agrega:

```
VITE_API_URL = https://[proyecto-railway].up.railway.app
```

### 4️⃣ Deploy

Click **"Deploy"**

Vercel automáticamente construye y deploya cada push a `main`:

```bash
git push origin main
```

**Tu frontend estará disponible en:** `https://[proyecto-vercel].vercel.app`

---

## Actualizar API_URL en Frontend

Después de tener la URL de Railway, actualiza el frontend:

**`frontend/.env.production`** (crear si no existe):

```env
VITE_API_URL=https://[proyecto-railway].up.railway.app
```

Luego:

```bash
cd frontend
npm run build
git add .
git commit -m "Update API URL for production"
git push origin main
```

---

## Configuración de CORS

Verifica que `FRONTEND_URL` en Railway coincida con tu URL de Vercel.

Si tienes problemas de CORS, asegúrate de:

1. **Backend (`backend/server.js`):** CORS permite la URL de Vercel
2. **Frontend (`.env`):** `VITE_API_URL` apunta a Railway

---

## Monitoreo y Logs

### Ver Logs en Railway

```bash
# Railway CLI (si está instalado)
railway logs

# O desde el dashboard:
# Proyecto → View Logs
```

### Ver Logs en Vercel

```bash
# Vercel CLI
vercel logs [url-tu-proyecto]

# O desde el dashboard:
# Project → Deployments → Logs
```

---

## Troubleshooting

### Error: "CORS policy blocked"

**Solución:** Verifica que `FRONTEND_URL` en Railway coincida exactamente con tu URL de Vercel.

```bash
# Backend
FRONTEND_URL=https://stella-marketplace.vercel.app
```

### Error: "Database locked"

SQLite tiene limitaciones con concurrencia alta. Opciones:

1. **Aumentar timeouts:** (en `database.js`)
```javascript
db.exec("PRAGMA busy_timeout = 5000"); // 5 segundos
```

2. **Migrar a PostgreSQL:** (mejor solución)

### Error: "Cannot upload files"

Verifica que el volumen de Railway está configurado:

```bash
# En el dashboard de Railway:
Settings → Volumes → /app/backend/storage
```

### La BD se reinicia cada deploy (sin volumen)

**Solución:** Configura un volumen en Railway como se describe en "Persistencia de Datos".

---

## Secrets y Variables Sensibles

**NUNCA** comitearse `.env` archivos. Railway maneja variables automáticamente:

✅ Correcto: Usar Railway dashboard para variables
❌ Incorrecto: Guardar `.env` en Git

---

## Dominio Personalizado

### Agregar dominio a Vercel

1. Vercel dashboard → Project → Settings → Domains
2. Agrega tu dominio
3. Sigue las instrucciones de DNS

### Agregar dominio a Railway

Railway ofrece subdominio gratuito `*.up.railway.app`, pero también puedes usar uno personalizado:

1. Railway dashboard → Project → Settings → Domains
2. Agrega tu dominio
3. Configura DNS records

---

## Rollback de Deployments

### Revertir a un deployment anterior

**Vercel:**
```bash
vercel rollback
```

**Railway:**
1. Proyecto → Deployments
2. Selecciona un deploy anterior
3. Click "Redeploy"

---

## Performance y Optimización

### Frontend (Vercel)

Vercel automáticamente:
- ✅ Minifica y comprime
- ✅ Optimiza imágenes
- ✅ CDN global
- ✅ Caching inteligente

### Backend (Railway)

Para mejorar performance:

1. **Agregar índices a BD:**

```sql
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_seller ON products(seller_id);
CREATE INDEX idx_orders_buyer ON orders(buyer_id);
```

2. **Caché en memoria:** Usar Redis (Railway lo ofrece)

3. **Compresión:** Agregar middleware de compresión:

```javascript
const compression = require('compression');
app.use(compression());
```

---

## Seguridad en Producción

### Checklist Seguridad

- [ ] `JWT_SECRET` es fuerte (32+ caracteres)
- [ ] CORS solo permite tu dominio
- [ ] HTTPS habilitado (automático en Vercel/Railway)
- [ ] No hay secretos en código fuente
- [ ] Rate limiting en endpoints de login (TODO)
- [ ] HTTPS obligatorio en redirects

### Mejorar Seguridad

```javascript
// backend/server.js
const helmet = require('helmet');
app.use(helmet()); // Headers de seguridad

const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // máximo 100 requests
});
app.use('/api/auth', limiter); // Proteger login
```

---

## Próximos Pasos

1. ✅ Verificar que ambos deploys funcionan
2. ✅ Probar compra/venta end-to-end
3. ✅ Probar negociación en tiempo real
4. ✅ Probar IA asistente
5. ✅ Monitorear logs las primeras 24h
6. ⏳ Configurar backups automáticos de BD
7. ⏳ Implementar analytics

---

## Contacto y Soporte

- **Railway Docs:** https://docs.railway.app
- **Vercel Docs:** https://vercel.com/docs
- **Stella Issues:** GitHub Issues de este proyecto
