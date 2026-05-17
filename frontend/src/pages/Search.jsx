import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../lib/api'
import ProductCard from '../components/ProductCard'

// Categorías canónicas — sin duplicados
const CATEGORIES = ['Parte superior', 'Suéter', 'Pantalón', 'Calzado', 'Accesorio', 'Vestido', 'Abrigo']

export default function Search() {
  const [params, setParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    q: params.get('q') || '',
    category: params.get('category') || '',
    condition: '',
    minPrice: '',
    maxPrice: '',
    page: 1
  })

  const setF = (k, v) => setFilters(f => ({ ...f, [k]: v, page: 1 }))

  useEffect(() => {
    setFilters(f => ({ ...f, q: params.get('q') || '', category: params.get('category') || '', page: 1 }))
  }, [params.get('q'), params.get('category')])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const p = new URLSearchParams()
        if (filters.q) p.set('q', filters.q)
        if (filters.category) p.set('category', filters.category)
        if (filters.condition) p.set('condition', filters.condition)
        if (filters.minPrice) p.set('minPrice', filters.minPrice)
        if (filters.maxPrice) p.set('maxPrice', filters.maxPrice)
        p.set('page', filters.page)
        p.set('limit', '20')
        const { data } = await api.get(`/products?${p}`)
        setProducts(data.products)
        setTotal(data.total)
        setPages(data.pages)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [filters])

  return (
    <div className="max-w-7xl mx-auto px-margin-desktop py-xl flex gap-xl">
      {/* Sidebar filters */}
      <aside className="hidden md:block w-64 shrink-0">
        <div className="bg-surface-container-lowest rounded-lg p-lg border border-outline-variant/20 space-y-lg sticky top-24">
          <h3 className="font-headline-sm text-headline-sm text-on-surface">Filtros</h3>

          <div>
            <label className="font-label-lg text-label-lg text-on-surface block mb-sm">Categoría</label>
            <div className="space-y-0.5">
              <button onClick={() => setF('category', '')} className={`block w-full text-left px-sm py-xs rounded-lg font-label-lg text-label-lg transition-colors ${!filters.category ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'}`}>Todas</button>
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setF('category', c)} className={`block w-full text-left px-sm py-xs rounded-lg font-label-lg text-label-lg transition-colors ${filters.category === c ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'}`}>{c}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-label-lg text-label-lg text-on-surface block mb-sm">Estado</label>
            {[['', 'Todos'], ['new', 'Nuevo'], ['used', 'Usado']].map(([val, label]) => (
              <label key={val} className="flex items-center gap-sm font-body-md text-on-surface-variant py-1 cursor-pointer">
                <input type="radio" name="condition" checked={filters.condition === val} onChange={() => setF('condition', val)} />
                {label}
              </label>
            ))}
          </div>

          <div>
            <label className="font-label-lg text-label-lg text-on-surface block mb-sm">Precio</label>
            <div className="flex gap-sm">
              <input placeholder="Mín" type="number" value={filters.minPrice} onChange={e => setF('minPrice', e.target.value)} className="input" />
              <input placeholder="Máx" type="number" value={filters.maxPrice} onChange={e => setF('maxPrice', e.target.value)} className="input" />
            </div>
          </div>
        </div>
      </aside>

      {/* Results */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-lg">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">
            {filters.q ? `"${filters.q}"` : filters.category || 'Todos los productos'}
            <span className="font-body-md text-on-surface-variant ml-sm">({total} resultados)</span>
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-on-surface-variant/30 text-7xl">search</span>
            <p className="font-headline-sm text-headline-sm text-on-surface mt-lg">No se encontraron productos</p>
            <p className="font-body-md text-on-surface-variant mt-sm">Prueba con otros filtros o términos</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-gutter">
              {products.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
            {pages > 1 && (
              <div className="flex justify-center gap-sm mt-xl">
                {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setFilters(f => ({ ...f, page: p }))}
                    className={`w-9 h-9 rounded-lg font-label-lg transition-colors ${filters.page === p ? 'bg-primary text-on-primary' : 'border border-outline-variant text-on-surface-variant hover:bg-surface-container'}`}>{p}</button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
