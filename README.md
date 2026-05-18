# Stella — Marketplace C2C de Ropa

Plataforma completa de compra y venta de ropa nueva y usada con negociación en tiempo real, asistente de modas con IA y sistema de outfits.

**Proyecto académico para la materia de Desarrollo Web**

## 🚀 Stack Tecnológico

### Frontend
- **React** 18 - UI library
- **Vite** 5 - Build tool (ultra-rápido)
- **Tailwind CSS** 3 - Utilidades CSS
- **React Router** 6 - Enrutamiento
- **Axios** - Cliente HTTP
- **Socket.IO Client** - Comunicación en tiempo real

### Backend
- **Node.js** 22 - Runtime
- **Express** 4 - Framework web
- **SQLite** (better-sqlite3) - BD de desarrollo
- **JWT** - Autenticación
- **bcryptjs** - Hash de contraseñas
- **Socket.IO** - WebSockets en tiempo real
- **Multer** - Upload de archivos
- **Groq / Google Gemini** - IA (asistente de modas)

### Deployment
- **Vercel** - Frontend (React + Vite)
- **Replit** - Backend (Node.js)

---

## 📋 Funcionalidades Principales

- ✅ **Autenticación segura** con JWT + bcrypt
- ✅ **Perfiles de usuario** con historial de compras/ventas
- ✅ **Gestión de direcciones** y métodos de pago
- ✅ **Publicación de productos** con imágenes, tallas, colores
- ✅ **Búsqueda avanzada** con filtros (categoría, condición, precio)
- ✅ **Carrito de compras** persistente
- ✅ **Checkout completo** con dirección y pago
- ✅ **Sistema de negociación** en tiempo real (Socket.IO)
- ✅ **Outfits**: combinar prendas y agregar al carrito
- ✅ **Lista de deseos** (wishlist)
- ✅ **Historial de pedidos** con seguimiento
- ✅ **Calificaciones de vendedores** (0-5 estrellas)
- ✅ **Comentarios y preguntas** en productos
- ✅ **Asistente de modas con IA** (Groq/Gemini)
- ✅ **Perfiles públicos** de vendedores
- ✅ **Notificaciones** en tiempo real

---

## 🏃 Inicio Rápido

### Requisitos previos
- **Node.js** 18+ (recomendado 22)
- **npm** o **yarn**
- Git

### 1️⃣ Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/marketplace.git
cd marketplace
```

### 2️⃣ Backend (Node.js + Express)

```bash
cd backend

# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env

# Editar .env y configurar:
# - JWT_SECRET: clave segura cualquiera (local)
# - FRONTEND_URL: http://localhost:5173 (local)
# - GROQ_API_KEY o GEMINI_API_KEY: opcional para IA

# Ejecutar servidor
npm run dev
```

El backend estará disponible en: **http://localhost:3001**

### 3️⃣ Frontend (React + Vite)

En otra terminal:

```bash
cd frontend

# Instalar dependencias
npm install

# Ejecutar servidor de desarrollo
npm run dev
```

El frontend estará disponible en: **http://localhost:5173**

---

## 🌍 Deployment (Vercel + Replit)

### Backend en Replit

1. Ve a https://replit.com
2. Click en **"+ Create"** → **"Import from GitHub"**
3. Selecciona este repositorio
4. Replit detectará que es Node.js automáticamente
5. Crea un archivo `.env` en `backend/` con:

```env
JWT_SECRET=tu-secreto-aqui
FRONTEND_URL=https://tu-frontend.vercel.app
PORT=3001
GROQ_API_KEY=tu-api-key-opcional
GEMINI_API_KEY=tu-api-key-opcional
```

6. Click en **"Run"**

**Tu backend URL será:** `https://tu-proyecto.replit.dev`

### Frontend en Vercel

1. Ve a https://vercel.com
2. Click en **"Add New"** → **"Project"**
3. Importa este repositorio desde GitHub
4. En **"Configure Project"**:
   - **Root Directory:** `frontend/`
   - **Framework:** React
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

5. En **"Environment Variables"**, agrega:

```
VITE_API_URL = https://tu-backend.replit.dev
```

6. Click en **"Deploy"**

**Tu frontend URL será:** `https://tu-proyecto.vercel.app`

---

## 📚 Variables de Entorno

### Backend (`.env`)

```env
# Autenticación
JWT_SECRET=tu_clave_secreta_muy_larga_y_segura_aqui

# URLs
FRONTEND_URL=http://localhost:5173
PORT=3001

# IA (opcional - elige uno)
GROQ_API_KEY=        # Recomendado: https://console.groq.com
GEMINI_API_KEY=      # Alternativa: https://aistudio.google.com/app/apikey
```

### Frontend (`.env`)

```env
# URL del backend
VITE_API_URL=http://localhost:3001
```

---

## 📂 Estructura del Proyecto

```
marketplace/
├── backend/                    # Node.js + Express
│   ├── database.js            # Configuración SQLite
│   ├── server.js              # Servidor principal
│   ├── routes/                # Rutas API (11 módulos)
│   │   ├── auth.js            # Autenticación
│   │   ├── products.js        # Productos
│   │   ├── cart.js            # Carrito
│   │   ├── orders.js          # Pedidos
│   │   ├── negotiations.js    # Negociación (Socket.IO)
│   │   ├── outfits.js         # Combinaciones de ropa
│   │   ├── ai.js              # Asistente IA
│   │   └── ...más rutas
│   ├── middleware/            # Autenticación JWT
│   ├── uploads/               # Almacenamiento de imágenes
│   ├── package.json
│   ├── .env.example
│   └── Dockerfile
│
├── frontend/                   # React + Vite
│   ├── src/
│   │   ├── components/        # Componentes reutilizables
│   │   ├── pages/             # Páginas principales
│   │   ├── context/           # Estado global (Context API)
│   │   ├── lib/               # Utilidades (api.js, etc)
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/                # Assets estáticos
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── package.json
│   ├── .env.example
│   ├── Dockerfile
│   ├── nginx.conf
│   └── postcss.config.js
│
├── docker-compose.yml         # Para desarrollo local con Docker
├── .env.example               # Variables globales
└── README.md
```

---

## 🔌 API Endpoints Principales

### Autenticación
- `POST /api/auth/register` - Registrarse
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Perfil actual

### Productos
- `GET /api/products` - Listar productos
- `GET /api/products/:id` - Detalles de producto
- `POST /api/products` - Publicar producto (requiere JWT)
- `PUT /api/products/:id` - Editar producto
- `DELETE /api/products/:id` - Eliminar producto

### Negociación (Tiempo Real)
- `POST /api/negotiations` - Crear negociación
- `GET /api/negotiations/:id` - Detalles de negociación
- Socket.IO para chat en tiempo real

### Carrito y Pedidos
- `POST /api/cart` - Agregar al carrito
- `DELETE /api/cart/:id` - Eliminar del carrito
- `POST /api/orders` - Crear pedido
- `GET /api/orders` - Historial de pedidos

### IA
- `POST /api/ai/suggest` - Sugerencias de outfits
- `POST /api/ai/recommend` - Recomendaciones personalizadas

Ver documentación completa de la API en los comentarios de cada ruta.

---

## 🛠 Desarrollo Local

### Comandos útiles

**Backend:**
```bash
cd backend
npm run dev    # Desarrollo con nodemon
npm run build  # Build para producción
npm start      # Ejecutar en producción
npm test       # Ejecutar tests
```

**Frontend:**
```bash
cd frontend
npm run dev        # Desarrollo con Vite
npm run build      # Build optimizado
npm run preview    # Vista previa del build
npm run lint       # Verificar código
```

### Con Docker Compose (para desarrollo)

```bash
docker-compose up
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

---

## 🔐 Seguridad

- ✅ JWT con expiración de 7 días
- ✅ Contraseñas hasheadas con bcryptjs
- ✅ CORS configurado para dominios específicos
- ✅ Validación de entrada en endpoints críticos
- ✅ Tokens almacenados en localStorage (frontend)

**Notas para producción:**
- Cambiar `JWT_SECRET` a una clave fuerte (32+ caracteres)
- Implementar rate limiting para login
- Usar HTTPS obligatoriamente
- Implementar backup automático de BD

---

## 🐛 Troubleshooting

### Error: "Cannot find module 'express'"

```bash
cd backend && npm install
```

### Error: "CORS policy blocked"

Verifica que `FRONTEND_URL` sea correcto en `.env` del backend.

### Puerto 3001 / 5173 ya en uso

```bash
# Cambiar puerto en backend
PORT=3002 npm run dev

# Cambiar puerto en frontend
npm run dev -- --port 3000
```

### La BD se reinicia en cada deploy (Replit)

SQLite en Replit persiste datos. Si necesitas una BD más escalable, migra a PostgreSQL.

---

## 📝 Notas Académicas

Este proyecto fue desarrollado como trabajo práctico de la materia de Desarrollo Web, incluyendo:

- ✅ Full-stack JavaScript (Node.js + React)
- ✅ Arquitectura REST API
- ✅ Comunicación en tiempo real (WebSockets)
- ✅ Autenticación y autorización
- ✅ Gestión de estado
- ✅ Deployment en cloud (Vercel + Replit)

**Conceptos cubiertos:**
- Bases de datos relacionales
- Autenticación con JWT
- WebSockets con Socket.IO
- Integración con APIs externas (IA)
- Responsive design con Tailwind CSS
- DevOps básico (Docker, deployment)

---

## 📄 Licencia

Proyecto académico - Libre para usar con propósitos educativos.

---

## 👨‍💻 Autor

Desarrollado como trabajo de clase.

---

## 🙋 Soporte

Para problemas, preguntas o sugerencias, abre un issue en GitHub.
