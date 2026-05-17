import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { imgUrl } from '../lib/api'
import api from '../lib/api'

export default function ProductCard({ product, onWishlistChange }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [inWishlist, setInWishlist] = useState(product.inWishlist || false)
  const [addingCart, setAddingCart] = useState(false)

  const img = product.images?.[0]
  const hasSizesOrColors = product.sizes?.length > 0 || product.colors?.length > 0

  const toggleWishlist = async (e) => {
    e.preventDefault()
    if (!user) return navigate('/')
    try {
      if (inWishlist) {
        await api.delete(`/wishlist/${product.id}`)
        setInWishlist(false)
      } else {
        await api.post('/wishlist', { product_id: product.id })
        setInWishlist(true)
      }
      onWishlistChange?.()
    } catch {}
  }

  const addToCart = async (e) => {
    e.preventDefault()
    if (!user) return navigate('/')
    if (hasSizesOrColors) return navigate(`/products/${product.id}`)
    setAddingCart(true)
    try {
      await api.post('/cart', { product_id: product.id })
    } finally {
      setAddingCart(false)
    }
  }

  return (
    <Link to={`/products/${product.id}`} className="group block">
      <div className="card overflow-hidden hover:shadow-md transition-shadow">
        <div className="relative aspect-square bg-gray-100">
          {img ? (
            <img src={imgUrl(img)} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          <button onClick={toggleWishlist}
            className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full shadow hover:scale-110 transition-transform">
            <svg className={`w-4 h-4 ${inWishlist ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} fill={inWishlist ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
          <span className={product.condition === 'new' ? 'badge-new absolute top-2 left-2' : 'badge-used absolute top-2 left-2'}>
            {product.condition === 'new' ? 'Nuevo' : 'Usado'}
          </span>
        </div>
        <div className="p-3">
          <p className="text-xs text-gray-500 truncate">{product.category}</p>
          <h3 className="font-medium text-sm leading-tight mt-0.5 line-clamp-2">{product.title}</h3>
          <div className="flex items-center justify-between mt-2">
            <span className="font-bold text-primary">${Number(product.price).toLocaleString()}</span>
            <button onClick={addToCart} disabled={addingCart}
              className="text-xs btn-outline py-1 px-2">
              {addingCart ? '...' : '+ Carrito'}
            </button>
          </div>
          {product.seller && (
            <p className="text-xs text-gray-400 mt-1">@{product.seller.username}</p>
          )}
        </div>
      </div>
    </Link>
  )
}
