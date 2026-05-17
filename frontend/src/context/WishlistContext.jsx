import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../lib/api'
import { useAuth } from './AuthContext'

const WishlistContext = createContext(null)

export function WishlistProvider({ children }) {
  const { user } = useAuth()
  // Set de IDs (Number) de productos en la lista de deseos
  const [wishlistIds, setWishlistIds] = useState(new Set())
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!user) {
      setWishlistIds(new Set())
      return
    }
    setLoading(true)
    try {
      const { data } = await api.get('/wishlist')
      setWishlistIds(new Set(data.map(p => Number(p.id))))
    } catch {
      setWishlistIds(new Set())
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  /** Devuelve true si el productId está en la lista de deseos */
  const isWishlisted = (productId) => wishlistIds.has(Number(productId))

  /**
   * Alterna el estado de favorito de un producto.
   * Actualiza el estado local inmediatamente (optimistic update).
   * Requiere que el usuario esté autenticado.
   */
  const toggle = async (productId) => {
    if (!user) return false
    const numId = Number(productId)
    const wasWishlisted = wishlistIds.has(numId)

    // Actualización optimista
    setWishlistIds(prev => {
      const next = new Set(prev)
      wasWishlisted ? next.delete(numId) : next.add(numId)
      return next
    })

    try {
      if (wasWishlisted) {
        await api.delete(`/wishlist/${numId}`)
      } else {
        await api.post('/wishlist', { product_id: numId })
      }
      return !wasWishlisted
    } catch {
      // Revertir si hay error
      setWishlistIds(prev => {
        const next = new Set(prev)
        wasWishlisted ? next.add(numId) : next.delete(numId)
        return next
      })
      return wasWishlisted
    }
  }

  return (
    <WishlistContext.Provider value={{ wishlistIds, isWishlisted, toggle, loading, reload: load }}>
      {children}
    </WishlistContext.Provider>
  )
}

export const useWishlist = () => useContext(WishlistContext)
