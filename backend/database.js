/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONFIGURACIÓN DE BASE DE DATOS SQLITE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Este módulo gestiona la base de datos SQLite para Stella Marketplace.
 * 
 * CARACTERÍSTICAS:
 * - Singleton lazy-loaded (conexión única reutilizable)
 * - WAL mode (Write-Ahead Logging) para mejor concurrencia
 * - Foreign keys habilitadas
 * - Transacciones automáticas
 * - Migraciones silenciosas (ALTER TABLE sin errores)
 * 
 * ALMACENAMIENTO:
 * - BD: backend/storage/data/marketplace.db
 * - Imágenes: backend/storage/uploads/
 * 
 * TABLAS PRINCIPALES (14 total):
 * 1. users - Usuarios registrados
 * 2. addresses - Direcciones de envío
 * 3. payment_methods - Métodos de pago
 * 4. products - Catálogo de productos
 * 5. cart_items - Carrito de compras
 * 6. wishlist_items - Lista de deseos
 * 7. orders - Pedidos completados
 * 8. order_items - Detalles de pedidos
 * 9. outfits - Combinaciones personalizadas
 * 10. outfit_items - Productos en outfits
 * 11. negotiations - Negociaciones precio
 * 12. negotiation_messages - Chat de negociación
 * 13. comments - Preguntas/comentarios en productos
 * 14. reviews - Reseñas de vendedores
 * 15. notifications - Notificaciones del sistema
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

// ─── Rutas de almacenamiento ────────────────────────────────────────────────
const STORAGE_DIR = path.join(__dirname, 'storage');
const DATA_DIR = path.join(STORAGE_DIR, 'data');
const DB_PATH = path.join(DATA_DIR, 'marketplace.db');
const UPLOADS_DIR = path.join(STORAGE_DIR, 'uploads');

// Crear directorios si no existen
if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

/** Instancia global de BD (singleton) */
let db;

/**
 * Obtiene la conexión a la base de datos
 * 
 * Implementa patrón singleton: la primera llamada inicializa, las siguientes
 * retornan la conexión existente.
 * 
 * Configuración de SQLite:
 * - PRAGMA journal_mode = WAL: Mejora concurrencia y velocidad
 * - PRAGMA foreign_keys = ON: Valida integridad referencial
 * 
 * @returns {DatabaseSync} Conexión a la base de datos
 */
function getDb() {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    
    // Optimizaciones de SQLite
    db.exec("PRAGMA journal_mode = WAL");           // Modo de registro anticipado
    db.exec("PRAGMA foreign_keys = ON");             // Integridad referencial
    
    // Inicializar schema (tablas)
    initSchema();
    
    // Agregar helper de transacciones
    db.transaction = function(fn) {
      return function() {
        try {
          db.exec("BEGIN TRANSACTION");
          const result = fn();
          db.exec("COMMIT");
          return result;
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      };
    };
  }
  return db;
}

/**
 * Inicializa el schema de BD y ejecuta migraciones
 * 
 * Crea todas las tablas con sus relaciones y restricciones.
 * Las migraciones (ALTER TABLE) se ejecutan con try/catch para que
 * funcionen incluso si las columnas ya existen.
 * 
 * SCHEMA DE DATOS (simplificado):
 * 
 * users (1) ────────── (N) products
 *  │                          │
 *  ├─ addresses              ├─ cart_items
 *  ├─ payment_methods        ├─ wishlist_items
 *  ├─ outfits               ├─ comments
 *  └─ notifications         └─ order_items
 *
 * negotiations (1) ───────── (N) negotiation_messages
 * orders (1) ────────────── (N) order_items
 * outfits (1) ───────────── (N) outfit_items
 */
function initSchema() {
  db.exec(`
    -- ───────────────────────────────────────────────────────────────────────
    -- TABLA: users - Usuarios de la plataforma
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,                 -- Nombre único (@usuario)
      email TEXT UNIQUE NOT NULL,                    -- Email único
      recovery_email TEXT,                           -- Email de recuperación
      password_hash TEXT NOT NULL,                   -- Hash bcrypt contraseña
      avatar TEXT,                                   -- URL imagen perfil
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP  -- Fecha registro
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- TABLA: addresses - Direcciones de envío
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,                      -- FK: Usuario propietario
      name TEXT NOT NULL,                            -- Nombre destinatario
      phone TEXT NOT NULL,                           -- Teléfono
      address TEXT NOT NULL,                         -- Dirección completa
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- TABLA: payment_methods - Métodos de pago
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS payment_methods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,                      -- FK: Usuario propietario
      type TEXT NOT NULL,                            -- Tipo: 'card', 'bank', etc
      label TEXT NOT NULL,                           -- Nombre: "Mi tarjeta Visa"
      data TEXT NOT NULL,                            -- Datos encriptados
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- TABLA: products - Catálogo de productos
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seller_id INTEGER NOT NULL,                    -- FK: Vendedor
      title TEXT NOT NULL,                           -- Nombre prenda
      description TEXT DEFAULT '',                   -- Descripción detallada
      price REAL NOT NULL,                           -- Precio base
      quantity INTEGER NOT NULL DEFAULT 1,           -- Stock disponible
      category TEXT NOT NULL,                        -- Categoría: Top, Pantalón, etc
      condition TEXT NOT NULL CHECK (condition IN ('new','used')), -- Condición
      sizes TEXT DEFAULT '[]',                       -- JSON array: ["XS", "S", "M"]
      colors TEXT DEFAULT '[]',                      -- JSON array: ["Azul", "Negro"]
      images TEXT DEFAULT '[]',                      -- JSON array: URLs imágenes
      views INTEGER DEFAULT 0,                       -- Contador de visualizaciones
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- Fecha publicación
      FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- TABLA: cart_items - Carrito de compras
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,                      -- FK: Comprador
      product_id INTEGER NOT NULL,                   -- FK: Producto
      quantity INTEGER NOT NULL DEFAULT 1,           -- Cantidad
      size TEXT,                                     -- Talla seleccionada
      color TEXT,                                    -- Color seleccionado
      negotiated_price REAL,                         -- Precio negociado (si aplica)
      negotiation_expires_at DATETIME,               -- Expiración de precio negociado
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- TABLA: wishlist_items - Lista de deseos
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS wishlist_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,                      -- FK: Usuario
      product_id INTEGER NOT NULL,                   -- FK: Producto deseado
      UNIQUE(user_id, product_id),                   -- No duplicados
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- TABLA: orders - Pedidos completados
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      buyer_id INTEGER NOT NULL,                     -- FK: Comprador
      address_snapshot TEXT,                         -- JSON snapshot dirección
      payment_label TEXT,                            -- Método pago usado
      status TEXT NOT NULL DEFAULT 'pending',        -- Estado: pending, shipped, delivered
      total REAL NOT NULL,                           -- Monto total
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- Fecha pedido
      FOREIGN KEY (buyer_id) REFERENCES users(id)
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- TABLA: order_items - Detalles de pedidos
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,                     -- FK: Pedido
      product_id INTEGER NOT NULL,                   -- FK: Producto comprado
      seller_id INTEGER NOT NULL,                    -- FK: Vendedor (snapshot)
      title TEXT NOT NULL,                           -- Nombre prenda (snapshot)
      image TEXT,                                    -- Imagen principal
      quantity INTEGER NOT NULL,                     -- Cantidad comprada
      price REAL NOT NULL,                           -- Precio unitario en venta
      size TEXT,                                     -- Talla comprada
      color TEXT,                                    -- Color comprado
      tracking_number TEXT,                          -- Número de seguimiento
      carrier TEXT,                                  -- Transportista
      status TEXT DEFAULT 'pending',                 -- Estado envío
      received_at DATETIME,                          -- Fecha entrega
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- TABLA: outfits - Combinaciones de prendas personalizadas
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS outfits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,                      -- FK: Usuario
      name TEXT NOT NULL,                            -- Nombre: "Casual viernes"
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- Fecha creación
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- TABLA: outfit_items - Productos en cada outfit
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS outfit_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      outfit_id INTEGER NOT NULL,                    -- FK: Outfit
      product_id INTEGER NOT NULL,                   -- FK: Prenda
      UNIQUE(outfit_id, product_id),                 -- No duplicados por outfit
      FOREIGN KEY (outfit_id) REFERENCES outfits(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- TABLA: negotiations - Negociaciones de precio
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS negotiations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      buyer_id INTEGER NOT NULL,                     -- FK: Comprador que negocia
      seller_id INTEGER NOT NULL,                    -- FK: Vendedor
      product_id INTEGER NOT NULL,                   -- FK: Producto
      status TEXT NOT NULL DEFAULT 'open',           -- Estado: open, accepted, rejected
      agreed_price REAL,                             -- Precio final acordado
      buyer_accepted_at DATETIME,                    -- Cuándo comprador aceptó
      seller_accepted_at DATETIME,                   -- Cuándo vendedor aceptó
      buyer_proposed_price REAL,                     -- Última propuesta comprador
      seller_proposed_price REAL,                    -- Última propuesta vendedor
      expires_at DATETIME,                           -- Expiración negociación
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- Fecha inicio
      FOREIGN KEY (buyer_id) REFERENCES users(id),
      FOREIGN KEY (seller_id) REFERENCES users(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- TABLA: negotiation_messages - Mensajes de negociación
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS negotiation_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      negotiation_id INTEGER NOT NULL,               -- FK: Negociación
      sender_id INTEGER NOT NULL,                    -- FK: Quien envía (buyer o seller)
      message TEXT,                                  -- Mensaje o comentario
      proposed_price REAL,                           -- Si es propuesta de precio
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- Timestamp mensaje
      FOREIGN KEY (negotiation_id) REFERENCES negotiations(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id)
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- TABLA: comments - Preguntas/comentarios en productos
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,                   -- FK: Producto
      user_id INTEGER NOT NULL,                      -- FK: Usuario autor
      content TEXT NOT NULL,                         -- Texto comentario
      parent_id INTEGER,                             -- FK: Comentario padre (para respuestas)
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- Fecha
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- TABLA: reviews - Reseñas y calificaciones
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_item_id INTEGER NOT NULL UNIQUE,         -- FK: Item del pedido (1:1)
      buyer_id INTEGER NOT NULL,                     -- FK: Comprador que reseña
      seller_id INTEGER NOT NULL,                    -- FK: Vendedor reseñado
      rating INTEGER NOT NULL CHECK (rating >= 0 AND rating <= 5), -- Calificación 0-5
      content TEXT,                                  -- Comentario opcional
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- Fecha
      FOREIGN KEY (buyer_id) REFERENCES users(id),
      FOREIGN KEY (seller_id) REFERENCES users(id)
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- TABLA: notifications - Notificaciones del sistema
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,                      -- FK: Usuario destino
      type TEXT NOT NULL,                            -- Tipo: order, negotiation, review, etc
      title TEXT NOT NULL,                           -- Título notificación
      body TEXT NOT NULL,                            -- Contenido
      related_id INTEGER,                            -- ID del recurso relacionado
      is_read INTEGER NOT NULL DEFAULT 0,            -- 0=no leído, 1=leído
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- Timestamp
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // ───────────────────────────────────────────────────────────────────────────
  // MIGRACIONES: ALTER TABLE para nuevas columnas
  // 
  // Ejecutadas con try/catch para que no fallen si las columnas ya existen
  // ───────────────────────────────────────────────────────────────────────────
  
  try {
    db.prepare("ALTER TABLE negotiations ADD COLUMN buyer_proposed_price REAL").run();
  } catch (e) {
    // Columna ya existe (versión anterior de BD)
  }
  
  try {
    db.prepare("ALTER TABLE negotiations ADD COLUMN seller_proposed_price REAL").run();
  } catch (e) {
    // Columna ya existe
  }
  
  try {
    db.prepare("ALTER TABLE negotiations ADD COLUMN buyer_accepted_at DATETIME").run();
  } catch (e) {
    // Columna ya existe
  }
  
  try {
    db.prepare("ALTER TABLE negotiations ADD COLUMN seller_accepted_at DATETIME").run();
  } catch (e) {
    // Columna ya existe
  }
}

module.exports = { getDb };
