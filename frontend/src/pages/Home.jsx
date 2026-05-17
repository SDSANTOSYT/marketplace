import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import ProductCard from '../components/ProductCard'

const CATEGORIES = ['Parte superior','Suéter','Parte inferior','Pantalón','Calzado','Accesorio','Vestido','Abrigo']
const CAT_ICONS = { 'Parte superior': '👕', 'Suéter': '🧥', 'Parte inferior': '👖', 'Pantalón': '👔', 'Calzado': '👟', 'Accesorio': '👜', 'Vestido': '👗', 'Abrigo': '🧣' }

export default function Home() {
  const [recommended, setRecommended] = useState([])
  const [byCategory, setByCategory] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [rec, ...catResults] = await Promise.all([
          api.get('/products/recommended'),
          ...CATEGORIES.slice(0, 4).map(cat => api.get(`/products?category=${encodeURIComponent(cat)}&limit=4`))
        ])
        setRecommended(rec.data)
        const obj = {}
        CATEGORIES.slice(0, 4).forEach((cat, i) => { obj[cat] = catResults[i].data.products })
        setByCategory(obj)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-primary to-purple-700 text-white p-8 md:p-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-3">Moda sin límites</h1>
        <p className="text-purple-200 text-lg mb-6">Compra y vende ropa nueva o usada. Encuentra tu estilo único.</p>
        <div className="flex flex-wrap gap-3">
          <Link to="/search" className="bg-white text-primary font-semibold px-6 py-2.5 rounded-full hover:bg-purple-50 transition-colors">Explorar productos</Link>
          <Link to="/sell" className="border-2 border-white text-white font-semibold px-6 py-2.5 rounded-full hover:bg-white/10 transition-colors">Vender ahora</Link>
        </div>
      </div>

      {/* Categories */}
      <section>
        <h2 className="text-xl font-bold mb-4">Explorar por categoría</h2>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {CATEGORIES.map(cat => (
            <Link key={cat} to={`/search?category=${encodeURIComponent(cat)}`}
              className="card p-3 text-center hover:border-primary hover:shadow-md transition-all group">
              <div className="text-2xl mb-1">{CAT_ICONS[cat]}</div>
              <p className="text-xs font-medium text-gray-600 group-hover:text-primary">{cat}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Recommended */}
      {recommended.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Recomendados para ti</h2>
            <Link to="/search" className="text-sm text-primary hover:underline">Ver todos</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {recommended.slice(0, 10).map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* By category sections */}
      {Object.entries(byCategory).map(([cat, products]) => products.length > 0 && (
        <section key={cat}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">{cat}</h2>
            <Link to={`/search?category=${encodeURIComponent(cat)}`} className="text-sm text-primary hover:underline">Ver más</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      ))}

      {recommended.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-5xl mb-4">🛍️</p>
          <h3 className="text-xl font-semibold mb-2">¡Sé el primero en vender!</h3>
          <p className="mb-6">Aún no hay productos. Publica el tuyo y empieza a vender.</p>
          <Link to="/sell" className="btn-primary">Publicar producto</Link>
        </div>
      )}
    </div>
  )
}
