/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MIDDLEWARE DE AUTENTICACIÓN JWT
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Este módulo proporciona middleware para validar JWT en rutas protegidas.
 * Soporta tanto autenticación obligatoria como opcional.
 * 
 * SEGURIDAD:
 * - JWT_SECRET debe ser una cadena fuerte (mín. 32 caracteres)
 * - En producción, NUNCA usar fallback a 'dev_secret'
 * - Los tokens expiran en 7 días (configurado en auth.js de rutas)
 * 
 * USO:
 * - app.post('/protected', auth, handler)        // Token obligatorio
 * - app.post('/semi-protected', optionalAuth, handler) // Token opcional
 */

const jwt = require('jsonwebtoken');

/**
 * Middleware de autenticación OBLIGATORIA
 * 
 * Valida que el request incluya un JWT válido en el header Authorization.
 * Formato esperado: "Bearer <token>"
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * Flujo:
 * 1. Busca header "Authorization" (Bearer token)
 * 2. Extrae el token (segundo elemento después de "Bearer ")
 * 3. Valida el token con JWT_SECRET
 * 4. Agrega usuario decodificado a req.user
 * 5. Si falla, retorna 401 Unauthorized
 * 
 * @throws {401} Si no hay token, es inválido o expiró
 */
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Token requerido' });
  
  const token = header.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token inválido' });
  
  try {
    // ⚠️ IMPORTANTE: En producción, SIEMPRE proporcionar JWT_SECRET
    // El fallback a 'dev_secret' es solo para desarrollo local
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    next();
  } catch {
    res.status(401).json({ error: 'Token expirado o inválido' });
  }
}

/**
 * Middleware de autenticación OPCIONAL
 * 
 * Intenta validar un JWT si está presente, pero permite continuar
 * sin él si no existe. Útil para endpoints que funcionan con o sin login.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * Flujo:
 * 1. Busca header "Authorization"
 * 2. Si existe, extrae y valida el token
 * 3. Si el token es válido, agrega usuario a req.user
 * 4. SIEMPRE continúa (no retorna errores, incluso si falla)
 * 5. req.user será undefined si no hay token válido
 * 
 * @example
 * // En handler:
 * if (req.user) {
 *   // Usuario autenticado
 * } else {
 *   // Usuario anónimo
 * }
 */
function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header) {
    const token = header.split(' ')[1];
    try {
      // Silenciosamente ignora errores si el token es inválido
      req.user = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    } catch {
      // Token inválido pero continuamos de todas formas
    }
  }
  // Continúa sin importar si hay token o no
  next();
}

module.exports = { auth, optionalAuth };
