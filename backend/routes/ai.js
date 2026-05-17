const router = require('express').Router();
const { getDb } = require('../database');
const { optionalAuth } = require('../middleware/auth');

router.post('/chat', optionalAuth, async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message) return res.status(400).json({ error: 'Mensaje requerido' });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.json({ reply: 'El asistente de modas no está configurado. Agrega tu ANTHROPIC_API_KEY en el archivo .env del backend.' });
  }

  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic.default();
    const db = getDb();

    // Get sample products for context
    const products = db.prepare('SELECT id, title, category, condition, price, sizes, colors FROM products ORDER BY views DESC LIMIT 30').all()
      .map(p => ({ ...p, sizes: JSON.parse(p.sizes || '[]'), colors: JSON.parse(p.colors || '[]') }));

    const productContext = products.map(p =>
      `ID:${p.id} | ${p.title} | ${p.category} | ${p.condition === 'used' ? 'Usado' : 'Nuevo'} | $${p.price} | Tallas: ${p.sizes.join(',')||'N/A'} | Colores: ${p.colors.join(',')||'N/A'}`
    ).join('\n');

    const messages = [
      ...history.slice(-10).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ];

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: `Eres un asistente de modas para StyleSwap, un marketplace de ropa.
Tu trabajo es ayudar a los usuarios a encontrar prendas y crear outfits con los productos disponibles en la plataforma.
Cuando sugieras productos, menciona el ID para que el usuario pueda verlos.
Sé amable, conciso y útil. Responde siempre en español.

Productos disponibles en la plataforma:
${productContext || 'Aún no hay productos disponibles.'}`,
      messages
    });

    res.json({ reply: response.content[0].text });
  } catch (e) {
    console.error('AI error:', e.message);
    res.status(500).json({ error: 'Error al contactar el asistente', detail: e.message });
  }
});

module.exports = router;
