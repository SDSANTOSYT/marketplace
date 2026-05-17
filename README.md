# StyleSwap — Marketplace C2C de Ropa

Plataforma completa de compra y venta de ropa nueva y usada.

## Stack

- **Frontend**: React 18 + Vite + Tailwind CSS + React Router v6
- **Backend**: Node.js + Express + SQLite (better-sqlite3)
- **Auth**: JWT + bcrypt
- **Tiempo real**: Socket.IO (chat de negociación)
- **AI**: Anthropic Claude (asistente de modas)

## Instalación

### 1. Backend

```bash
cd backend
npm install
copy .env.example .env
# Edita .env y agrega tu ANTHROPIC_API_KEY si quieres el asistente AI
npm run dev
```

El backend corre en http://localhost:3001

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

El frontend corre en http://localhost:5173

## Funcionalidades

- ✅ Registro e inicio de sesión con JWT
- ✅ Perfil de usuario con historial de compras, ventas, deseos
- ✅ Gestión de direcciones y métodos de pago
- ✅ Publicación de productos con imágenes, tallas, colores
- ✅ Búsqueda y filtros por categoría, condición, precio
- ✅ Carrito de compras
- ✅ Checkout con dirección y método de pago
- ✅ Sistema de negociación en tiempo real (Socket.IO) para productos usados
- ✅ Precio negociado agregado automáticamente al carrito (expira en 1 mes)
- ✅ Outfits: combinar prendas y agregar todo al carrito
- ✅ Lista de deseos
- ✅ Historial de pedidos con seguimiento
- ✅ Sistema de calificaciones de vendedores (0–5 estrellas)
- ✅ Comentarios y preguntas en productos
- ✅ Asistente de modas con IA (requiere ANTHROPIC_API_KEY)
- ✅ Perfiles públicos de vendedores

## Variables de entorno (.env)

```
PORT=3001
JWT_SECRET=tu_secreto_seguro
FRONTEND_URL=http://localhost:5173
ANTHROPIC_API_KEY=sk-ant-...   # opcional
```
