const router = require('express').Router();
const { getDb } = require('../database');
const { optionalAuth } = require('../middleware/auth');

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Obtiene los productos más relevantes de la BD para dar contexto a la IA */
function getProductContext(db) {
  const products = db.prepare(`
    SELECT p.id, p.title, p.category, p.condition, p.price, p.sizes, p.colors, p.quantity
    FROM products p
    WHERE p.quantity > 0
    ORDER BY p.views DESC, p.created_at DESC
    LIMIT 50
  `).all().map(p => ({
    ...p,
    sizes: JSON.parse(p.sizes || '[]'),
    colors: JSON.parse(p.colors || '[]'),
  }));

  return {
    products,
    text: products.map(p =>
      `ID:${p.id} | "${p.title}" | ${p.category} | ${p.condition === 'used' ? 'Usado' : 'Nuevo'} | $${p.price} | Tallas: ${p.sizes.join(',') || 'N/A'} | Colores: ${p.colors.join(',') || 'N/A'}`
    ).join('\n'),
  };
}

/** System prompt para el asistente de modas */
function buildSystemPrompt(productText) {
  return `Eres Stella AI, un asistente experto en moda para Stella, un marketplace de ropa de segunda mano y nueva.
Tu misión: ayudar a los usuarios a encontrar prendas perfectas y armar outfits con los productos disponibles en la plataforma.

INSTRUCCIONES:
- Recomienda siempre productos reales del catálogo, mencionando su ID en formato ID:123 para que sean clicables
- Sugiere outfits completos (top + pantalón/falda + calzado + accesorio) cuando te lo pidan
- Si no hay productos que coincidan exactamente, sugiere los más cercanos o pide más detalles
- Sé conciso, cálido y experto. Usa emojis con moderación
- Responde SIEMPRE en español
- Cuando el usuario pregunte por outfits, combina prendas de distintas categorías
- Incluye el precio al mencionar productos

CATÁLOGO ACTUAL (productos disponibles en Stella):
${productText || 'Aún no hay productos disponibles en la plataforma.'}`;
}

// ─── Proveedor: Groq (gratis) ────────────────────────────────────────────────
async function callGroq(apiKey, systemPrompt, messages) {
  const body = {
    model: 'llama-3.1-8b-instant',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    max_tokens: 800,
    temperature: 0.7,
  };

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

// ─── Proveedor: Google Gemini (gratis) ───────────────────────────────────────
async function callGemini(apiKey, systemPrompt, messages) {
  // Construir el historial en formato Gemini
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: { maxOutputTokens: 800, temperature: 0.7 },
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}

// ─── Fallback inteligente (sin API key) ──────────────────────────────────────
const CATEGORY_KEYWORDS = {
  'Parte superior': ['top', 'blusa', 'camisa', 'camiseta', 'playera', 'remera', 'polo', 'parte superior'],
  'Suéter': ['suéter', 'sweater', 'jersey', 'sueter', 'tejido', 'lana', 'chompa'],
  'Pantalón': ['pantalón', 'pantalon', 'jeans', 'jean', 'vaquero', 'legging', 'shorts', 'bermuda'],
  'Calzado': ['zapato', 'calzado', 'bota', 'botín', 'tenis', 'zapatilla', 'sandalia', 'tacón', 'stiletto'],
  'Accesorio': ['accesorio', 'bolso', 'cartera', 'cinturón', 'sombrero', 'bufanda', 'gorra', 'lentes'],
  'Vestido': ['vestido', 'dress', 'falda', 'minifalda', 'maxifalda'],
  'Abrigo': ['abrigo', 'chaqueta', 'saco', 'blazer', 'gabardina', 'impermeable', 'chamarra'],
};

const COLOR_KEYWORDS = ['negro', 'blanco', 'gris', 'azul', 'rojo', 'verde', 'amarillo', 'rosa', 'morado', 'naranja', 'beige', 'café', 'marrón'];

function smartFallback(message, products) {
  const msg = message.toLowerCase();

  // Detectar intención de outfit
  const wantsOutfit = /outfit|look completo|combinar|combinación|qué me pongo|cómo me visto/.test(msg);
  // Detectar intención de búsqueda de precio
  const priceMatch = msg.match(/menos de \$?(\d+)|máximo \$?(\d+)|\$?(\d+) o menos|hasta \$?(\d+)|presupuesto.*?(\d+)/);
  const maxPrice = priceMatch ? Number(priceMatch[1] || priceMatch[2] || priceMatch[3] || priceMatch[4] || priceMatch[5]) : null;
  // Detectar categoría
  let targetCategory = null;
  for (const [cat, terms] of Object.entries(CATEGORY_KEYWORDS)) {
    if (terms.some(t => msg.includes(t))) { targetCategory = cat; break; }
  }
  // Detectar color
  const matchedColor = COLOR_KEYWORDS.find(c => msg.includes(c));
  // Detectar condición
  const wantsNew = /nuevo|sin uso/.test(msg);
  const wantsUsed = /usado|segunda mano|vintage/.test(msg);

  // Filtrar productos
  let filtered = [...products];
  if (targetCategory) filtered = filtered.filter(p => p.category === targetCategory);
  if (matchedColor) filtered = filtered.filter(p => p.colors.some(c => c.toLowerCase().includes(matchedColor)));
  if (maxPrice) filtered = filtered.filter(p => p.price <= maxPrice);
  if (wantsNew) filtered = filtered.filter(p => p.condition === 'new');
  if (wantsUsed) filtered = filtered.filter(p => p.condition === 'used');

  if (wantsOutfit) {
    const top = products.find(p => p.category === 'Parte superior');
    const bottom = products.find(p => p.category === 'Pantalón') || products.find(p => p.category === 'Vestido');
    const shoes = products.find(p => p.category === 'Calzado');
    const accessory = products.find(p => p.category === 'Accesorio');
    const suggestions = [top, bottom, shoes, accessory].filter(Boolean);

    if (suggestions.length >= 2) {
      const lines = suggestions.map(p => `• **${p.title}** — $${Number(p.price).toLocaleString()} (ID:${p.id})`).join('\n');
      return `✨ Aquí te propongo un outfit completo:\n\n${lines}\n\nCada prenda es clicable para ver más detalles. ¿Quieres que te sugiera otras combinaciones o ajuste el estilo?`;
    }
    return 'Me encantaría armarte un outfit completo, pero aún hay pocos productos disponibles en la plataforma. Explora el catálogo y vuelve cuando haya más opciones. 👗';
  }

  if (filtered.length > 0) {
    const shown = filtered.slice(0, 5);
    const catLabel = targetCategory ? targetCategory.toLowerCase() + 's' : 'productos';
    const colorLabel = matchedColor ? ` en tono ${matchedColor}` : '';
    const priceLabel = maxPrice ? ` hasta $${maxPrice.toLocaleString()}` : '';
    const lines = shown.map(p => `• **${p.title}** — $${Number(p.price).toLocaleString()} | ${p.condition === 'new' ? 'Nuevo' : 'Usado'} (ID:${p.id})`).join('\n');
    return `Encontré ${catLabel}${colorLabel}${priceLabel} que pueden gustarte:\n\n${lines}\n\n¿Quieres filtrar por talla, otro color o rango de precio?`;
  }

  // Respuestas de moda generales
  const fashionTips = [
    '¡Cuéntame más sobre tu estilo! ¿Prefieres looks casuales, formales o un mix? Puedo recomendarte prendas específicas del catálogo. 👗',
    'Para armar un outfit perfecto necesito saber: ¿qué ocasión es? ¿tienes preferencia de colores o estilos? ¡Dime y te ayudo! ✨',
    'Como regla general en moda: combina piezas neutras (negro, blanco, gris, beige) con un accesorio de color que sea el protagonista. ¿Quieres que busque algo en el catálogo?',
    'En Stella tenemos prendas nuevas y usadas. ¿Tienes alguna categoría en mente? Puedo buscarte tops, pantalones, vestidos, calzado o accesorios.',
  ];
  return fashionTips[Math.floor(Math.random() * fashionTips.length)];
}

// ─── Ruta principal ──────────────────────────────────────────────────────────
router.post('/chat', optionalAuth, async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Mensaje requerido' });

  const db = getDb();
  const { products, text: productText } = getProductContext(db);
  const systemPrompt = buildSystemPrompt(productText);

  // Historial de conversación (últimas 10 interacciones)
  const conversationHistory = history.slice(-10).map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content,
  }));
  conversationHistory.push({ role: 'user', content: message });

  // 1. Intentar con Groq (gratis — llama-3.1-8b-instant)
  if (process.env.GROQ_API_KEY) {
    try {
      const reply = await callGroq(process.env.GROQ_API_KEY, systemPrompt, conversationHistory);
      return res.json({ reply, provider: 'groq' });
    } catch (e) {
      console.error('[AI] Groq falló:', e.message, '— probando Gemini…');
    }
  }

  // 2. Intentar con Google Gemini (gratis — gemini-1.5-flash)
  if (process.env.GEMINI_API_KEY) {
    try {
      const reply = await callGemini(process.env.GEMINI_API_KEY, systemPrompt, conversationHistory);
      return res.json({ reply, provider: 'gemini' });
    } catch (e) {
      console.error('[AI] Gemini falló:', e.message, '— usando fallback…');
    }
  }

  // 3. Fallback inteligente (sin API key — siempre funciona)
  const reply = smartFallback(message, products);
  return res.json({ reply, provider: 'fallback' });
});

// ─── Endpoint para obtener sugerencias de inicio de conversación ─────────────
router.get('/suggestions', optionalAuth, (req, res) => {
  const db = getDb();
  const { products } = getProductContext(db);
  const hasProducts = products.length > 0;

  const suggestions = hasProducts ? [
    '¿Qué hay disponible hoy?',
    'Arma un outfit casual para mí',
    'Busco algo menos de $500',
    'Muéstrame los vestidos disponibles',
  ] : [
    '¿Qué puedes hacer?',
    'Consejos para combinar colores',
    'Tendencias de moda actuales',
    '¿Cómo armo un outfit?',
  ];

  res.json(suggestions);
});

module.exports = router;
