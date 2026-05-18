import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api, { imgUrl, formatPrice } from '../lib/api'
import { useAuth } from '../context/AuthContext'

export default function Cart() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [stockErrors, setStockErrors] = useState({}) // id → error string

  useEffect(() => {
    if (!user) { navigate('/'); return }
    api.get('/cart').then(r => setItems(r.data)).finally(() => setLoading(false))
  }, [user])

  const update = async (id, qty) => {
    if (qty <= 0) {
      await remove(id)
      return
    }
    try {
      await api.put(`/cart/${id}`, { quantity: qty })
      setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i))
      setStockErrors(prev => { const n = { ...prev }; delete n[id]; return n })
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al actualizar cantidad'
      setStockErrors(prev => ({ ...prev, [id]: msg }))
    }
  }

  const remove = async (id) => {
    await api.delete(`/cart/${id}`)
    setItems(prev => prev.filter(i => i.id !== id))
    setStockErrors(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  const total = items.reduce((sum, i) => sum + i.effectivePrice * i.quantity, 0)

  // Detectar items con cantidad mayor al stock (por cambios externos de inventario)
  const hasStockIssue = items.some(i => i.quantity > i.stock)

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!items.length) return (
    <div className="text-center py-20">
      <span className="material-symbols-outlined text-on-surface-variant/30 text-8xl">shopping_bag</span>
      <h2 className="font-headline-md text-headline-md text-on-surface mt-lg mb-sm">Tu carrito está vacío</h2>
      <p className="font-body-md text-on-surface-variant mb-xl">Agrega productos para comprarlos</p>
      <Link to="/" className="bg-primary text-on-primary px-lg py-md rounded-lg font-label-lg hover:opacity-90 active:scale-95 transition-all inline-block">Explorar productos</Link>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto px-margin-desktop py-xl">
      <h1 className="font-headline-md text-headline-md text-on-surface mb-lg">Carrito de compras</h1>

      {hasStockIssue && (
        <div className="bg-error-container text-on-error-container px-md py-sm rounded-lg flex items-start gap-sm mb-lg">
          <span className="material-symbols-outlined text-[18px] mt-0.5">warning</span>
          <p className="font-body-md">Algunos productos en tu carrito superan el stock disponible. Ajusta las cantidades antes de comprar.</p>
        </div>
      )}

      <div className="space-y-md">
        {items.map(item => {
          const hasNegotiated = item.negotiated_price && new Date(item.negotiation_expires_at) > new Date()
          const overStock = item.quantity > item.stock
          const stockErr = stockErrors[item.id]

          return (
            <div key={item.id} className={`bg-surface-container-lowest rounded-lg border p-md flex gap-md ${overStock ? 'border-error/40' : 'border-outline-variant/20'}`}>
              <Link to={`/products/${item.product_id}`} className="w-20 h-20 rounded-lg overflow-hidden bg-surface-container shrink-0">
                {item.images?.[0]
                  ? <img src={imgUrl(item.images[0])} alt={item.title} className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-surface-container flex items-center justify-center">
                      <span className="material-symbols-outlined text-on-surface-variant/30 text-3xl">checkroom</span>
                    </div>
                }
              </Link>
              <div className="flex-1 min-w-0">
                <Link to={`/products/${item.product_id}`} className="font-label-lg text-label-lg text-on-surface hover:text-primary line-clamp-2 transition-colors">{item.title}</Link>
                {item.size && <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">Talla: {item.size}</p>}
                {item.color && <p className="font-label-sm text-label-sm text-on-surface-variant">Color: {item.color}</p>}

                {/* Stock info */}
                <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                  Stock disponible: <span className={overStock ? 'text-error font-bold' : 'text-on-surface'}>{item.stock}</span>
                </p>

                {overStock && (
                  <div className="mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-error text-[14px]">error</span>
                    <p className="font-label-sm text-label-sm text-error">Cantidad supera el stock disponible</p>
                  </div>
                )}
                {stockErr && !overStock && (
                  <p className="font-label-sm text-label-sm text-error mt-1">{stockErr}</p>
                )}

                {hasNegotiated && (
                  <div className="mt-1">
                    <span className="font-label-sm text-label-sm bg-primary-fixed text-on-primary-fixed px-sm py-0.5 rounded-full">
                      Precio negociado · expira {new Date(item.negotiation_expires_at).toLocaleDateString('es')}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between mt-sm">
                  <div className="flex items-center gap-sm">
                    <button
                      onClick={() => update(item.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-full border border-outline-variant flex items-center justify-center font-label-lg text-on-surface hover:bg-surface-container transition-colors">
                      -
                    </button>
                    <span className="w-6 text-center font-label-lg text-on-surface">{item.quantity}</span>
                    <button
                      onClick={() => update(item.id, item.quantity + 1)}
                      disabled={item.quantity >= item.stock}
                      className="w-7 h-7 rounded-full border border-outline-variant flex items-center justify-center font-label-lg text-on-surface hover:bg-surface-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                      +
                    </button>
                  </div>
                  <div className="flex items-center gap-md">
                    <div className="text-right">
                      {hasNegotiated && <p className="font-label-sm text-label-sm text-on-surface-variant line-through">${formatPrice(item.price)}</p>}
                      <p className="font-headline-sm text-headline-sm text-primary">${formatPrice(item.effectivePrice * item.quantity)}</p>
                    </div>
                    <button onClick={() => remove(item.id)} className="text-on-surface-variant hover:text-error transition-colors p-1">
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-surface-container-lowest rounded-lg p-lg mt-lg border border-outline-variant/20">
        <div className="flex justify-between items-center font-headline-sm text-headline-sm mb-lg">
          <span className="text-on-surface">Total</span>
          <span className="text-primary">${formatPrice(total)}</span>
        </div>
        {hasStockIssue ? (
          <div className="w-full py-md rounded-lg bg-surface-container text-on-surface-variant text-center font-label-lg cursor-not-allowed">
            Ajusta las cantidades para continuar
          </div>
        ) : (
          <Link to="/checkout" className="bg-primary text-on-primary w-full py-md rounded-lg font-label-lg hover:opacity-90 active:scale-95 transition-all block text-center">
            Finalizar compra
          </Link>
        )}
      </div>
    </div>
  )
}
