import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api, { imgUrl } from '../lib/api'
import StarRating from '../components/StarRating'
import ProductCard from '../components/ProductCard'

export default function UserProfile() {
  const { id } = useParams()
  const [profile, setProfile] = useState(null)
  const [products, setProducts] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get(`/users/${id}`),
      api.get(`/products?seller=${id}&limit=50`),
    ]).then(([u, p]) => {
      setProfile(u.data)
      setProducts(p.data.products)
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
  if (!profile) return <div className="text-center py-20 font-body-lg text-on-surface-variant">Usuario no encontrado</div>

  return (
    <div className="max-w-4xl mx-auto px-margin-desktop py-xl">
      {/* Profile header */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-xl mb-xl flex flex-col sm:flex-row items-center sm:items-start gap-lg">
        {profile.avatar ? (
          <img src={imgUrl(profile.avatar)} alt={profile.username} className="w-20 h-20 rounded-full object-cover border-4 border-primary-fixed shrink-0" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-primary-fixed text-primary flex items-center justify-center text-3xl font-bold border-4 border-primary-fixed shrink-0">
            {profile.username[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1 text-center sm:text-left">
          <h1 className="font-display-lg text-display-lg text-on-surface">@{profile.username}</h1>
          <StarRating rating={profile.avgRating} />
          <div className="flex gap-lg mt-md justify-center sm:justify-start">
            <div className="text-center">
              <p className="font-headline-sm text-headline-sm text-on-surface">{products.length}</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Productos</p>
            </div>
            <div className="text-center">
              <p className="font-headline-sm text-headline-sm text-on-surface">{profile.totalSales}</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Ventas</p>
            </div>
            <div className="text-center">
              <p className="font-headline-sm text-headline-sm text-on-surface">{new Date(profile.created_at).toLocaleDateString('es')}</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Miembro desde</p>
            </div>
          </div>
        </div>
      </div>

      <h2 className="font-headline-sm text-headline-sm text-on-surface mb-lg">Productos de @{profile.username}</h2>
      {products.length === 0 ? (
        <div className="text-center py-xl">
          <span className="material-symbols-outlined text-on-surface-variant/30 text-7xl">inventory_2</span>
          <p className="font-body-lg text-on-surface-variant mt-lg">Este usuario no tiene productos disponibles</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-gutter">
          {products.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  )
}
