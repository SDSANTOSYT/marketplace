require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { getDb } = require('./database');

const app = express();
const server = http.createServer(app);
const ORIGIN = process.env.FRONTEND_URL || 'http://localhost:5173';

const io = new Server(server, { cors: { origin: ORIGIN, methods: ['GET', 'POST'] } });

app.use(cors({ origin: ORIGIN, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use((req, _res, next) => { req.io = io; next(); });

app.use('/api/auth',         require('./routes/auth'));
app.use('/api/users',        require('./routes/users'));
app.use('/api/products',     require('./routes/products'));
app.use('/api/cart',         require('./routes/cart'));
app.use('/api/orders',       require('./routes/orders'));
app.use('/api/wishlist',     require('./routes/wishlist'));
app.use('/api/outfits',      require('./routes/outfits'));
app.use('/api/negotiations', require('./routes/negotiations'));
app.use('/api/comments',     require('./routes/comments'));
app.use('/api/ai',           require('./routes/ai'));

io.on('connection', (socket) => {
  socket.on('join-negotiation',  (id) => socket.join(`neg-${id}`));
  socket.on('leave-negotiation', (id) => socket.leave(`neg-${id}`));
});

getDb();

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Backend corriendo en http://localhost:${PORT}`));
