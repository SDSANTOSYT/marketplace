import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../lib/api'
import ProductCard from '../components/ProductCard'

const CATEGORIES = ['Parte superior','Suéter','Parte inferior','Pantalón','Calzado','Accesorio','Vestido','Abrigo']

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
    <div className="flex gap-6">
      {/* Sidebar filters */}
      <aside className="hidden md:block w-56 shrink-0 space-y-6">
        <div className="card p-4 space-y-4">
          <h3 className="font-semibold">Filtros</h3>

          <div>
            <label className="text-sm font-medium block mb-2">Categoría</label>
            <div className="space-y-1">
              <button onClick={() => setF('category', '')} className={`block w-full text-left text-sm px-2 py-1 rounded ${!filters.category ? 'text-primary font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>Todas</button>
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setF('category', c)} className={`block w-full text-left text-sm px-2 py-1 rounded ${filters.category === c ? 'text-primary font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>{c}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">Estado</label>
            {[['', 'Todos'], ['new', 'Nuevo'], ['used', 'Usado']].map(([val, label]) => (
              <label key={val} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                <input type="radio" name="condition" checked={filters.condition === val} onChange={() => setF('condition', val)} />
                {label}
              </label>
            ))}
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">Precio</label>
            <div className="flex gap-2">
              <input placeholder="Mín" type="number" value={filters.minPrice} onChange={e => setF('minPrice', e.target.value)} className="input text-xs" />
              <input placeholder="Máx" type="number" value={filters.maxPrice} onChange={e => setF('maxPrice', e.target.value)} className="input text-xs" />
            </div>
          </div>
        </div>
      </aside>

      {/* Results */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">
            {filters.q ? `"${filters.q}"` : filters.category || 'Todos los productos'}
            <span className="text-gray-500 font-normal ml-2 text-sm">({total} resultados)</span>
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-lg font-medium">No se encontraron productos</p>
            <p className="text-sm mt-1">Prueba con otros filtros o términos</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
            {pages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setFilters(f => ({ ...f, page: p }))}
                    className={`w-9 h-9 rounded-lg text-sm font-medium ${filters.page === p ? 'bg-primary text-white' : 'border hover:bg-gray-50'}`}>{p}</button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
