import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../lib/api'
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
  if (!profile) return <div className="text-center py-20 text-gray-500">Usuario no encontrado</div>

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card p-6 mb-6 flex items-center gap-5">
        <div className="w-20 h-20 rounded-full bg-primary text-white flex items-center justify-center text-3xl font-bold">
          {profile.username[0].toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold">@{profile.username}</h1>
          <StarRating rating={profile.avgRating} />
          <div className="flex gap-4 mt-1 text-sm text-gray-500">
            <span>{products.length} productos</span>
            <span>{profile.totalSales} ventas</span>
            <span>Desde {new Date(profile.created_at).toLocaleDateString('es')}</span>
          </div>
        </div>
      </div>

      <h2 className="font-semibold text-lg mb-4">Productos de @{profile.username}</h2>
      {products.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">📦</p>
          <p>Este usuario no tiene productos disponibles</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {products.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  )
}
