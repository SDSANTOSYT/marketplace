/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SERVIDOR PRINCIPAL - STELLA MARKETPLACE BACKEND
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Servidor Express + Socket.IO para la API del marketplace.
 * 
 * RESPONSABILIDADES:
 * 1. Configurar Express middleware (CORS, JSON, static files)
 * 2. Registrar todas las rutas API
 * 3. Configurar Socket.IO para comunicación en tiempo real
 * 4. Iniciar el servidor en el puerto especificado
 * 
 * PUERTO: 3001 (o el especificado en PORT env)
 * FRONTEND: http://localhost:5173 (o el especificado en FRONTEND_URL env)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { getDb } = require('./database');

// ─── Inicialización de servidor ─────────────────────────────────────────────
const app = express();
const server = http.createServer(app);
const ORIGIN = process.env.FRONTEND_URL || 'http://localhost:5173';

// ─── Socket.IO: Comunicación en tiempo real ─────────────────────────────────
// 
// Socket.IO permite bidirectional communication entre servidor y clientes.
// Se usa para:
// - Chat de negociación (real-time)
// - Notificaciones en vivo
// - Sincronización de estado
// 
const io = new Server(server, {
  cors: {
    origin: ORIGIN,           // Permitir solo frontend autorizado
    methods: ['GET', 'POST']
  }
});

// ─── Middleware de Express ──────────────────────────────────────────────────

// CORS: Permite requests desde el frontend
app.use(cors({ origin: ORIGIN, credentials: true }));

// Parser JSON para request body
app.use(express.json());

// Servir archivos estáticos (imágenes subidas)
app.use('/uploads', express.static(path.join(__dirname, 'storage', 'uploads')));

// Inyectar Socket.IO en cada request (disponible como req.io)
// Esto permite que las rutas envíen eventos en tiempo real a clientes
app.use((req, _res, next) => {
  req.io = io;
  next();
});

// ─── Rutas API (11 módulos) ─────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));          // Login/Register
app.use('/api/users',         require('./routes/users'));         // Perfiles
app.use('/api/products',      require('./routes/products'));      // Catálogo
app.use('/api/cart',          require('./routes/cart'));          // Carrito
app.use('/api/orders',        require('./routes/orders'));        // Pedidos
app.use('/api/wishlist',      require('./routes/wishlist'));      // Lista deseos
app.use('/api/outfits',       require('./routes/outfits'));       // Combinaciones
app.use('/api/negotiations',  require('./routes/negotiations'));  // Negociación precios
app.use('/api/comments',      require('./routes/comments'));      // Preguntas/comentarios
app.use('/api/ai',            require('./routes/ai'));            // IA asistente
app.use('/api/notifications', require('./routes/notifications').router); // Notificaciones

// ─── Socket.IO: Manejo de conexiones ────────────────────────────────────────
//
// Los sockets se organizan en "rooms" para broadcast selectivo.
// Nomenclatura:
// - "neg-{id}" para negociaciones (ambas partes reciben updates)
// - "user-{userId}" para notificaciones personales
//
io.on('connection', (socket) => {
  // Negociación: Buyer/Seller se unen a room de negociación
  socket.on('join-negotiation',  (id)     => socket.join(`neg-${id}`));
  socket.on('leave-negotiation', (id)     => socket.leave(`neg-${id}`));
  
  // Notificaciones: Usuario se une a su room personal
  socket.on('join-user',         (userId) => socket.join(`user-${userId}`));
  socket.on('leave-user',        (userId) => socket.leave(`user-${userId}`));
});

// ─── Inicializar BD ─────────────────────────────────────────────────────────
// Crea tablas y ejecuta migraciones en la primera conexión
getDb();

// ─── Iniciar servidor ───────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () =>
  console.log(`Backend corriendo en http://localhost:${PORT}`)
);
