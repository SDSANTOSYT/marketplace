import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useWishlist } from '../context/WishlistContext'
import api, { imgUrl, formatPrice } from '../lib/api'

export default function ProductCard({ product }) {
  const { user } = useAuth()
  const { isWishlisted, toggle } = useWishlist()
  const navigate = useNavigate()
  const [addingCart, setAddingCart] = useState(false)
  const [addedCart, setAddedCart] = useState(false)
  const [cartError, setCartError] = useState('')

  const img = product.images?.[0]
  const hasSizesOrColors = product.sizes?.length > 0 || product.colors?.length > 0
  const inWishlist = isWishlisted(product.id)

  const toggleWishlist = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) return navigate('/')
    await toggle(product.id)
  }

  const addToCart = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) return navigate('/')
    if (hasSizesOrColors) return navigate(`/products/${product.id}`)
    setAddingCart(true)
    setCartError('')
    try {
      await api.post('/cart', { product_id: product.id })
      setAddedCart(true)
      setTimeout(() => setAddedCart(false), 2000)
    } catch (err) {
      const msg = err.response?.data?.error || 'Error'
      setCartError(msg)
      setTimeout(() => setCartError(''), 3000)
    } finally {
      setAddingCart(false)
    }
  }

  return (
    <Link to={`/products/${product.id}`} className="group block">
      <div className="bg-surface-container-lowest rounded-lg overflow-hidden border border-outline-variant/10 hover:shadow-md transition-all">
        {/* Image */}
        <div className="relative h-80 overflow-hidden bg-surface-container-low">
          {img ? (
            <img
              src={imgUrl(img)} alt={product.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={e => { e.target.style.display = 'none' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="material-symbols-outlined text-on-surface-variant/30 text-6xl">checkroom</span>
            </div>
          )}

          {/* Wishlist button */}
          <button
            onClick={toggleWishlist}
            className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-md rounded-full hover:bg-white active:scale-90 transition-all shadow-sm"
            aria-label={inWishlist ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          >
            <span
              className={`material-symbols-outlined text-[20px] transition-colors ${inWishlist ? 'text-primary' : 'text-on-surface-variant'}`}
              style={{ fontVariationSettings: inWishlist ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
            >
              favorite
            </span>
          </button>

          {/* Condition badge */}
          <div className="absolute bottom-3 left-3">
            <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-sm ${
              product.condition === 'new' ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface-variant'
            }`}>
              {product.condition === 'new' ? 'Nuevo' : 'Usado'}
            </span>
          </div>

          {/* Out of stock overlay */}
          {product.quantity === 0 && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="bg-surface-container-lowest text-on-surface px-md py-xs rounded-full font-label-lg text-label-lg">Sin stock</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-md flex flex-col gap-xs">
          {product.seller?.username && (
            <p className="font-label-sm text-label-sm text-on-surface-variant/70 uppercase tracking-wider">@{product.seller.username}</p>
          )}
          <h3 className="font-label-lg text-label-lg text-on-surface truncate">{product.title}</h3>
          <div className="flex items-center justify-between mt-base">
            <span className="font-headline-sm text-headline-sm text-primary">${formatPrice(product.price)}</span>
            {product.quantity > 0 ? (
              <button
                onClick={addToCart}
                disabled={addingCart}
                className={`text-xs border px-sm py-1 rounded-full font-label-sm transition-all active:scale-95 ${
                  cartError
                    ? 'border-error text-error'
                    : addedCart
                    ? 'border-primary bg-primary text-on-primary'
                    : 'border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary'
                }`}
              >
                {cartError ? '!' : addedCart ? '✓' : addingCart ? '...' : '+ Carrito'}
              </button>
            ) : (
              <span className="text-xs text-on-surface-variant/50 font-label-sm">Sin stock</span>
            )}
          </div>
          {cartError && <p className="font-label-sm text-label-sm text-error text-[10px] leading-tight">{cartError}</p>}
        </div>
      </div>
    </Link>
  )
}
