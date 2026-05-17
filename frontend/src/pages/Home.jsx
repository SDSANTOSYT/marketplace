import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import ProductCard from '../components/ProductCard'

// Categorías canónicas — sin duplicados, sin "Nuevos"/"Ofertas"
const CATEGORIES = ['Parte superior', 'Suéter', 'Pantalón', 'Calzado', 'Accesorio', 'Vestido', 'Abrigo']

const CATS = [
  { label: 'Tops',       icon: 'checkroom',    path: 'Parte superior' },
  { label: 'Suéteres',   icon: 'ac_unit',      path: 'Suéter' },
  { label: 'Pantalones', icon: 'straighten',   path: 'Pantalón' },
  { label: 'Calzado',    icon: 'steps',        path: 'Calzado' },
  { label: 'Accesorios', icon: 'shopping_bag', path: 'Accesorio' },
  { label: 'Vestidos',   icon: 'female',       path: 'Vestido' },
  { label: 'Abrigos',    icon: 'wb_cloudy',    path: 'Abrigo' },
]

export default function Home() {
  const [recommended, setRecommended] = useState([])
  const [byCategory, setByCategory] = useState({})
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

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
    <div className="space-y-0">
      {/* Hero Section */}
      <section className="px-margin-desktop py-lg">
        <div className="relative w-full h-[480px] rounded-lg overflow-hidden bg-secondary-container">
          <div className="absolute inset-0 bg-gradient-to-r from-secondary/80 to-transparent flex flex-col justify-center px-xl">
            <div className="max-w-xl">
              <span className="inline-block bg-primary-fixed text-on-primary-fixed px-3 py-1 rounded-full font-label-lg mb-4">Moda Sustentable</span>
              <h1 className="font-display-lg text-display-lg text-on-primary-container mb-md leading-tight">
                Descubre tu estilo<br />con Stella AI.
              </h1>
              <p className="font-body-lg text-on-secondary-container mb-xl opacity-90">
                Encuentra prendas únicas con nuestra IA. Stella analiza miles de publicaciones para conectar tu estilo al instante.
              </p>
              <button
                onClick={() => navigate('/search')}
                className="bg-primary text-on-primary px-lg py-md rounded-lg font-label-lg shadow-lg hover:opacity-90 active:scale-95 transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                Explorar Ahora
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="px-margin-desktop py-lg">
        <div className="flex items-center justify-between mb-lg">
          <h2 className="font-headline-md text-headline-md text-on-surface">Explorar categorías</h2>
          <Link to="/search" className="font-label-lg text-label-lg text-primary hover:opacity-80 transition-opacity">Ver todas</Link>
        </div>
        <div className="flex gap-lg overflow-x-auto hide-scrollbar pb-2">
          {CATS.map(cat => (
            <Link key={cat.path} to={`/search?category=${encodeURIComponent(cat.path)}`}
              className="flex-none w-28 flex flex-col items-center gap-xs cursor-pointer group">
              <div className="w-20 h-20 rounded-full bg-surface-container overflow-hidden border-2 border-transparent group-hover:border-primary transition-all shadow-sm flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-3xl">{cat.icon}</span>
              </div>
              <span className="font-label-lg text-label-lg text-on-surface text-center">{cat.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Recommended for You */}
      {recommended.length > 0 && (
        <section className="px-margin-desktop py-lg">
          <div className="flex items-center justify-between mb-lg">
            <h2 className="font-headline-md text-headline-md text-on-surface">Recomendados para ti</h2>
            <Link to="/search" className="font-label-lg text-label-lg text-primary hover:opacity-80 transition-opacity">Ver todos</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
            {recommended.slice(0, 8).map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* By category sections */}
      {Object.entries(byCategory).map(([cat, products]) => products.length > 0 && (
        <section key={cat} className="px-margin-desktop py-lg">
          <div className="flex items-center justify-between mb-lg">
            <h2 className="font-headline-md text-headline-md text-on-surface">{cat}</h2>
            <Link to={`/search?category=${encodeURIComponent(cat)}`} className="font-label-lg text-label-lg text-primary hover:opacity-80 transition-opacity">Ver más</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      ))}

      {/* Community CTA */}
      <section className="px-margin-desktop py-xl bg-surface-container">
        <div className="bg-surface-container-lowest rounded-lg p-xl flex flex-col md:flex-row items-center gap-xl">
          <div className="flex-1">
            <h2 className="font-display-lg text-display-lg text-on-surface mb-md">Vende tu estilo, únete a la comunidad.</h2>
            <p className="font-body-lg text-on-surface-variant mb-xl">Limpia tu clóset y llega a miles de amantes de la moda. Pagos seguros y envíos rápidos.</p>
            <div className="flex gap-md flex-wrap">
              <Link to="/sell" className="bg-primary text-on-primary px-lg py-md rounded-lg font-label-lg shadow hover:opacity-90 active:scale-95 transition-all">Empezar a Vender</Link>
              <Link to="/search" className="border-2 border-secondary text-secondary px-lg py-md rounded-lg font-label-lg hover:bg-secondary-fixed active:scale-95 transition-all">Explorar Más</Link>
            </div>
          </div>
        </div>
      </section>

      {recommended.length === 0 && (
        <section className="px-margin-desktop py-xl text-center">
          <div className="py-16">
            <span className="material-symbols-outlined text-on-surface-variant/30 text-8xl">shopping_bag</span>
            <h3 className="font-headline-md text-headline-md text-on-surface mt-lg mb-sm">¡Sé el primero en vender!</h3>
            <p className="font-body-lg text-on-surface-variant mb-xl">Aún no hay productos. Publica el tuyo y empieza a vender.</p>
            <Link to="/sell" className="bg-primary text-on-primary px-lg py-md rounded-lg font-label-lg shadow hover:opacity-90 active:scale-95 transition-all inline-block">Publicar producto</Link>
          </div>
        </section>
      )}

      {/* Footer — sin Soporte, Ayuda & FAQ, Privacidad ni Términos */}
      <footer className="grid grid-cols-1 md:grid-cols-3 gap-xl px-margin-desktop py-xl bg-surface-container-lowest border-t border-outline-variant">
        <div className="flex flex-col gap-md">
          <span className="font-headline-sm text-headline-sm font-bold text-primary">Stella</span>
          <p className="font-body-md text-on-surface-variant">El marketplace premium para la comunidad fashionista. Sustentable, tendencia y editorial.</p>
        </div>
        <div className="flex flex-col gap-sm">
          <span className="font-label-lg text-label-lg text-on-surface">Explorar</span>
          <Link to="/search" className="font-body-md text-on-surface-variant hover:text-primary transition-colors">Todos los productos</Link>
          <Link to="/search?category=Vestido" className="font-body-md text-on-surface-variant hover:text-primary transition-colors">Vestidos</Link>
          <Link to="/search?category=Calzado" className="font-body-md text-on-surface-variant hover:text-primary transition-colors">Calzado</Link>
          <Link to="/search?category=Accesorio" className="font-body-md text-on-surface-variant hover:text-primary transition-colors">Accesorios</Link>
        </div>
        <div className="flex flex-col gap-sm">
          <span className="font-label-lg text-label-lg text-on-surface">Vender</span>
          <Link to="/sell" className="font-body-md text-on-surface-variant hover:text-primary transition-colors">Publicar producto</Link>
          <Link to="/profile" className="font-body-md text-on-surface-variant hover:text-primary transition-colors">Mi tienda</Link>
          <Link to="/outfits" className="font-body-md text-on-surface-variant hover:text-primary transition-colors">Mis outfits</Link>
        </div>
      </footer>
    </div>
  )
}
