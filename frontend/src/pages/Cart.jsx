import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api, { imgUrl } from '../lib/api'
import { useAuth } from '../context/AuthContext'

export default function Cart() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { navigate('/'); return }
    api.get('/cart').then(r => setItems(r.data)).finally(() => setLoading(false))
  }, [user])

  const update = async (id, qty) => {
    await api.put(`/cart/${id}`, { quantity: qty })
    if (qty <= 0) setItems(prev => prev.filter(i => i.id !== id))
    else setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i))
  }

  const remove = async (id) => {
    await api.delete(`/cart/${id}`)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const total = items.reduce((sum, i) => sum + i.effectivePrice * i.quantity, 0)

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>

  if (!items.length) return (
    <div className="text-center py-20 text-gray-500">
      <p className="text-5xl mb-4">🛒</p>
      <h2 className="text-xl font-semibold mb-2">Tu carrito está vacío</h2>
      <p className="mb-6 text-sm">Agrega productos para comprarlos</p>
      <Link to="/" className="btn-primary">Explorar productos</Link>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Carrito de compras</h1>
      <div className="space-y-4">
        {items.map(item => {
          const hasNegotiated = item.negotiated_price && new Date(item.negotiation_expires_at) > new Date()
          return (
            <div key={item.id} className="card p-4 flex gap-4">
              <Link to={`/products/${item.product_id}`} className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                {item.images?.[0] ? <img src={imgUrl(item.images[0])} alt={item.title} className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-gray-200" />}
              </Link>
              <div className="flex-1 min-w-0">
                <Link to={`/products/${item.product_id}`} className="font-medium text-sm hover:text-primary line-clamp-2">{item.title}</Link>
                {item.size && <p className="text-xs text-gray-500 mt-0.5">Talla: {item.size}</p>}
                {item.color && <p className="text-xs text-gray-500">Color: {item.color}</p>}
                {hasNegotiated && (
                  <div className="mt-1">
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      Precio negociado · expira {new Date(item.negotiation_expires_at).toLocaleDateString('es')}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <button onClick={() => update(item.id, item.quantity - 1)} className="w-7 h-7 rounded-full border flex items-center justify-center text-lg hover:bg-gray-50">-</button>
                    <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                    <button onClick={() => update(item.id, item.quantity + 1)} className="w-7 h-7 rounded-full border flex items-center justify-center text-lg hover:bg-gray-50">+</button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      {hasNegotiated && <p className="text-xs text-gray-400 line-through">${Number(item.price).toLocaleString()}</p>}
                      <p className="font-bold text-primary">${(item.effectivePrice * item.quantity).toLocaleString()}</p>
                    </div>
                    <button onClick={() => remove(item.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="card p-6 mt-6">
        <div className="flex justify-between items-center text-lg font-bold mb-4">
          <span>Total</span>
          <span className="text-primary">${total.toLocaleString()}</span>
        </div>
        <Link to="/checkout" className="btn-primary w-full py-3 text-base text-center">Finalizar compra</Link>
      </div>
    </div>
  )
}
