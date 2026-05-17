import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api, { imgUrl } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import StarRating from '../components/StarRating'
import Modal from '../components/Modal'

export default function ProductDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [comments, setComments] = useState([])
  const [selectedImg, setSelectedImg] = useState(0)
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedColor, setSelectedColor] = useState('')
  const [outfits, setOutfits] = useState([])
  const [inWishlist, setInWishlist] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [showOutfitModal, setShowOutfitModal] = useState(false)
  const [newOutfitName, setNewOutfitName] = useState('')
  const [adding, setAdding] = useState(false)
  const [addedCart, setAddedCart] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [prodRes, commRes] = await Promise.all([api.get(`/products/${id}`), api.get(`/comments/${id}`)])
        setProduct(prodRes.data)
        setComments(commRes.data)
        if (user) {
          const [wlRes, outfitRes] = await Promise.all([api.get(`/wishlist/check/${id}`), api.get('/outfits')])
          setInWishlist(wlRes.data.inWishlist)
          setOutfits(outfitRes.data)
        }
      } catch { navigate('/') }
      finally { setLoading(false) }
    }
    load()
  }, [id, user])

  const addToCart = async () => {
    if (!user) return navigate('/')
    setAdding(true)
    try {
      await api.post('/cart', { product_id: product.id, size: selectedSize || null, color: selectedColor || null })
      setAddedCart(true)
      setTimeout(() => setAddedCart(false), 2000)
    } catch (e) { alert(e.response?.data?.error || 'Error') }
    finally { setAdding(false) }
  }

  const negotiate = async () => {
    if (!user) return navigate('/')
    try {
      const { data } = await api.post('/negotiations', { product_id: product.id })
      navigate(`/negotiations/${data.id}`)
    } catch (e) { alert(e.response?.data?.error || 'Error') }
  }

  const toggleWishlist = async () => {
    if (!user) return navigate('/')
    if (inWishlist) { await api.delete(`/wishlist/${product.id}`); setInWishlist(false) }
    else { await api.post('/wishlist', { product_id: product.id }); setInWishlist(true) }
  }

  const submitComment = async (e) => {
    e.preventDefault()
    if (!user) return navigate('/')
    if (!commentText.trim()) return
    try {
      const { data } = await api.post(`/comments/${id}`, { content: commentText, parent_id: replyTo })
      if (replyTo) {
        setComments(prev => prev.map(c => c.id === replyTo ? { ...c, replies: [...(c.replies || []), data] } : c))
      } else {
        setComments(prev => [{ ...data, replies: [] }, ...prev])
      }
      setCommentText(''); setReplyTo(null)
    } catch {}
  }

  const addToOutfit = async (outfitId) => {
    try { await api.post(`/outfits/${outfitId}/items`, { product_id: product.id }); setShowOutfitModal(false) }
    catch (e) { alert(e.response?.data?.error || 'Error') }
  }

  const createAndAddOutfit = async () => {
    if (!newOutfitName.trim()) return
    try {
      await api.post('/outfits', { name: newOutfitName, product_id: product.id })
      setShowOutfitModal(false); setNewOutfitName('')
    } catch {}
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
  if (!product) return null

  const isOwner = user?.id === product.seller_id

  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Images */}
        <div className="space-y-3">
          <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden">
            {product.images[selectedImg] ? (
              <img src={imgUrl(product.images[selectedImg])} alt={product.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {product.images.map((img, i) => (
                <button key={i} onClick={() => setSelectedImg(i)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 ${i === selectedImg ? 'border-primary' : 'border-transparent'}`}>
                  <img src={imgUrl(img)} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div>
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-bold leading-tight">{product.title}</h1>
              <button onClick={toggleWishlist} className="shrink-0 p-2 border rounded-full hover:border-red-300">
                <svg className={`w-5 h-5 ${inWishlist ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} fill={inWishlist ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
            </div>
            <p className="text-gray-500 text-sm mt-1">{product.category}</p>
            <span className={product.condition === 'new' ? 'badge-new mt-2' : 'badge-used mt-2'}>
              {product.condition === 'new' ? 'Nuevo' : 'Usado'}
            </span>
          </div>

          <div className="text-3xl font-bold text-primary">${Number(product.price).toLocaleString()}</div>

          {/* Seller */}
          <Link to={`/users/${product.seller_id}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100">
            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
              {product.seller?.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-sm">@{product.seller?.username}</p>
              <StarRating rating={product.sellerRating} size="sm" />
            </div>
          </Link>

          {/* Sizes */}
          {product.sizes?.length > 0 && (
            <div>
              <label className="text-sm font-medium block mb-2">Talla</label>
              <div className="flex gap-2 flex-wrap">
                {product.sizes.map(s => (
                  <button key={s} onClick={() => setSelectedSize(s === selectedSize ? '' : s)}
                    className={`px-3 py-1.5 border rounded-lg text-sm font-medium transition-colors ${selectedSize === s ? 'border-primary bg-primary-light text-primary' : 'hover:border-gray-400'}`}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {/* Colors */}
          {product.colors?.length > 0 && (
            <div>
              <label className="text-sm font-medium block mb-2">Color/Variante</label>
              <div className="flex gap-2 flex-wrap">
                {product.colors.map(c => (
                  <button key={c} onClick={() => setSelectedColor(c === selectedColor ? '' : c)}
                    className={`px-3 py-1.5 border rounded-lg text-sm font-medium transition-colors ${selectedColor === c ? 'border-primary bg-primary-light text-primary' : 'hover:border-gray-400'}`}>{c}</button>
                ))}
              </div>
            </div>
          )}

          <p className="text-sm text-gray-500">Stock disponible: {product.quantity} unidades</p>

          {/* Actions */}
          {!isOwner && (
            <div className="space-y-3">
              <button onClick={addToCart} disabled={adding || product.quantity === 0}
                className="btn-primary w-full py-3 text-base">
                {addedCart ? '✓ Agregado al carrito' : adding ? 'Agregando...' : product.quantity === 0 ? 'Sin stock' : 'Agregar al carrito'}
              </button>
              {product.condition === 'used' && (
                <button onClick={negotiate} className="btn-outline w-full py-3 text-base">
                  💬 Negociar precio
                </button>
              )}
              {user && (
                <button onClick={() => setShowOutfitModal(true)} className="btn-ghost w-full border border-gray-200">
                  👗 Agregar a un Outfit
                </button>
              )}
            </div>
          )}
          {isOwner && (
            <div className="flex gap-3">
              <Link to={`/profile/edit-product/${product.id}`} className="btn-outline flex-1">Editar</Link>
              <button onClick={async () => { if (confirm('¿Eliminar producto?')) { await api.delete(`/products/${id}`); navigate('/profile') } }} className="btn-danger flex-1">Eliminar</button>
            </div>
          )}

          {product.description && (
            <div>
              <h3 className="font-semibold mb-2">Descripción</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{product.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Comments */}
      <div className="mt-10">
        <h2 className="text-xl font-bold mb-4">Preguntas y comentarios</h2>
        {user && (
          <form onSubmit={submitComment} className="mb-6">
            {replyTo && (
              <div className="flex items-center gap-2 mb-2 text-sm text-gray-500">
                Respondiendo a un comentario <button type="button" onClick={() => setReplyTo(null)} className="text-red-500 hover:underline">cancelar</button>
              </div>
            )}
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-bold shrink-0">
                {user.username[0].toUpperCase()}
              </div>
              <div className="flex-1 flex gap-2">
                <input value={commentText} onChange={e => setCommentText(e.target.value)} placeholder={replyTo ? 'Escribe una respuesta...' : 'Escribe tu pregunta o comentario...'}
                  className="input flex-1" />
                <button type="submit" className="btn-primary">Enviar</button>
              </div>
            </div>
          </form>
        )}
        <div className="space-y-4">
          {comments.map(c => (
            <div key={c.id} className="space-y-3">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold shrink-0">
                  {c.username?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{c.username}</span>
                    {c.user_id === product.seller_id && <span className="badge bg-primary-light text-primary">Vendedor</span>}
                    <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString('es')}</span>
                  </div>
                  <p className="text-sm text-gray-700 mt-0.5">{c.content}</p>
                  {user && <button onClick={() => setReplyTo(c.id)} className="text-xs text-primary hover:underline mt-1">Responder</button>}
                </div>
              </div>
              {c.replies?.map(r => (
                <div key={r.id} className="ml-11 flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold shrink-0">
                    {r.username?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs">{r.username}</span>
                      {r.user_id === product.seller_id && <span className="badge bg-primary-light text-primary text-xs">Vendedor</span>}
                    </div>
                    <p className="text-sm text-gray-700">{r.content}</p>
                  </div>
                </div>
              ))}
            </div>
          ))}
          {comments.length === 0 && <p className="text-gray-500 text-sm">Sé el primero en preguntar.</p>}
        </div>
      </div>

      {/* Outfit modal */}
      {showOutfitModal && (
        <Modal onClose={() => setShowOutfitModal(false)} title="Agregar a outfit" size="sm">
          <div className="space-y-3">
            {outfits.map(o => (
              <button key={o.id} onClick={() => addToOutfit(o.id)}
                className="w-full text-left p-3 border rounded-lg hover:border-primary hover:bg-primary-light transition-colors">
                <p className="font-medium">{o.name}</p>
                <p className="text-xs text-gray-500">{o.items?.length || 0} prendas</p>
              </button>
            ))}
            <div className="border-t pt-3">
              <p className="text-sm font-medium mb-2">Crear nuevo outfit</p>
              <div className="flex gap-2">
                <input value={newOutfitName} onChange={e => setNewOutfitName(e.target.value)} placeholder="Nombre del outfit" className="input text-sm flex-1" />
                <button onClick={createAndAddOutfit} className="btn-primary text-sm">Crear</button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
