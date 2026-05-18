import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api, { imgUrl, formatPrice } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useWishlist } from '../context/WishlistContext'
import StarRating from '../components/StarRating'
import Modal from '../components/Modal'

export default function ProductDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const { isWishlisted, toggle: toggleWishlistCtx } = useWishlist()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [comments, setComments] = useState([])
  const [selectedImg, setSelectedImg] = useState(0)
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedColor, setSelectedColor] = useState('')
  const [outfits, setOutfits] = useState([])
  const [commentText, setCommentText] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [showOutfitModal, setShowOutfitModal] = useState(false)
  const [newOutfitName, setNewOutfitName] = useState('')
  const [adding, setAdding] = useState(false)
  const [addedCart, setAddedCart] = useState(false)
  const [loading, setLoading] = useState(true)

  // El estado de wishlist viene del contexto global — siempre sincronizado
  const inWishlist = isWishlisted(id)

  useEffect(() => {
    async function load() {
      try {
        const requests = [api.get(`/products/${id}`), api.get(`/comments/${id}`)]
        if (user) requests.push(api.get('/outfits'))
        const [prodRes, commRes, outfitRes] = await Promise.all(requests)
        setProduct(prodRes.data)
        setComments(commRes.data)
        if (outfitRes) setOutfits(outfitRes.data)
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
    await toggleWishlistCtx(product.id)
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
    <div className="max-w-[1440px] mx-auto px-margin-desktop py-xl">
      <div className="grid lg:grid-cols-12 gap-xl">
        {/* Images - 7 cols */}
        <div className="lg:col-span-7 space-y-sm">
          <div className="aspect-[4/5] rounded-lg overflow-hidden bg-surface-container relative">
            {product.images[selectedImg] ? (
              <img src={imgUrl(product.images[selectedImg])} alt={product.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="material-symbols-outlined text-on-surface-variant/30 text-8xl">checkroom</span>
              </div>
            )}
            <button onClick={toggleWishlist} className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur-md rounded-full shadow-sm hover:bg-white active:scale-90 transition-all">
              <span className={`material-symbols-outlined text-[22px] ${inWishlist ? 'text-primary' : 'text-on-surface-variant'}`}
                style={inWishlist ? { fontVariationSettings: "'FILL' 1" } : {}}>
                favorite
              </span>
            </button>
          </div>
          {product.images.length > 1 && (
            <div className="grid grid-cols-5 gap-sm">
              {product.images.map((img, i) => (
                <button key={i} onClick={() => setSelectedImg(i)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${i === selectedImg ? 'border-primary' : 'border-transparent hover:border-outline-variant'}`}>
                  <img src={imgUrl(img)} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info - 5 cols */}
        <div className="lg:col-span-5 space-y-lg">
          <div>
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-xs">{product.category}</p>
            <h1 className="font-display-lg text-display-lg text-on-surface leading-tight mb-sm">{product.title}</h1>
            <span className={`inline-block text-[10px] uppercase font-bold px-2 py-1 rounded-sm ${
              product.condition === 'new' ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface-variant'
            }`}>
              {product.condition === 'new' ? 'Nuevo' : 'Usado'}
            </span>
          </div>

          <div className="font-headline-md text-headline-md text-primary">${formatPrice(product.price)}</div>

          {/* Seller */}
          <Link to={`/users/${product.seller_id}`} className="flex items-center gap-md p-md bg-surface-container-low rounded-lg hover:bg-surface-container transition-colors">
            {product.seller?.avatar ? (
              <img src={imgUrl(product.seller.avatar)} alt={product.seller?.username} className="w-10 h-10 rounded-full object-cover border-2 border-primary-fixed shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold text-sm shrink-0">
                {product.seller?.username?.[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-label-lg text-label-lg text-on-surface">@{product.seller?.username}</p>
              <StarRating rating={product.sellerRating} size="sm" />
            </div>
          </Link>

          {/* Sizes */}
          {product.sizes?.length > 0 && (
            <div>
              <label className="font-label-lg text-label-lg text-on-surface block mb-sm">Talla</label>
              <div className="flex gap-sm flex-wrap">
                {product.sizes.map(s => (
                  <button key={s} onClick={() => setSelectedSize(s === selectedSize ? '' : s)}
                    className={`px-md py-xs border-2 rounded-lg font-label-lg text-label-lg transition-colors ${
                      selectedSize === s ? 'border-secondary bg-secondary-fixed text-secondary' : 'border-outline-variant text-on-surface-variant hover:border-outline'
                    }`}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {/* Colors */}
          {product.colors?.length > 0 && (
            <div>
              <label className="font-label-lg text-label-lg text-on-surface block mb-sm">Color/Variante</label>
              <div className="flex gap-sm flex-wrap">
                {product.colors.map(c => (
                  <button key={c} onClick={() => setSelectedColor(c === selectedColor ? '' : c)}
                    className={`px-md py-xs border-2 rounded-lg font-label-lg text-label-lg transition-colors ${
                      selectedColor === c ? 'border-secondary bg-secondary-fixed text-secondary' : 'border-outline-variant text-on-surface-variant hover:border-outline'
                    }`}>{c}</button>
                ))}
              </div>
            </div>
          )}

          <p className="font-label-sm text-label-sm text-on-surface-variant">Stock disponible: {product.quantity} unidades</p>

          {/* Actions */}
          {!isOwner && (
            <div className="space-y-sm">
              <button onClick={addToCart} disabled={adding || product.quantity === 0}
                className="bg-primary text-on-primary w-full py-md rounded-lg font-label-lg shadow hover:opacity-90 active:scale-95 transition-all disabled:opacity-50">
                {addedCart ? '✓ Agregado al carrito' : adding ? 'Agregando...' : product.quantity === 0 ? 'Sin stock' : 'Comprar ahora'}
              </button>
              {product.condition === 'used' && (
                <button onClick={negotiate} className="w-full py-md rounded-lg border-2 border-secondary text-secondary font-label-lg hover:bg-secondary-fixed active:scale-95 transition-all flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">chat</span>
                  Negociar precio
                </button>
              )}
              {user && (
                <button onClick={() => setShowOutfitModal(true)} className="w-full py-sm rounded-lg font-label-lg text-on-surface-variant border border-outline-variant/50 hover:bg-surface-container transition-all flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">style</span>
                  Agregar a un Outfit
                </button>
              )}
            </div>
          )}
          {isOwner && (
            <div className="flex gap-md">
              <Link to={`/profile/edit-product/${product.id}`} className="border-2 border-secondary text-secondary flex-1 py-sm rounded-lg font-label-lg text-center hover:bg-secondary-fixed transition-all">Editar</Link>
              <button onClick={async () => { if (confirm('¿Eliminar producto?')) { await api.delete(`/products/${id}`); navigate('/profile') } }}
                className="bg-error text-on-error flex-1 py-sm rounded-lg font-label-lg hover:opacity-90 active:scale-95 transition-all">Eliminar</button>
            </div>
          )}

          {product.description && (
            <div className="border-t border-outline-variant/20 pt-lg">
              <h3 className="font-label-lg text-label-lg text-on-surface mb-sm">Descripción</h3>
              <p className="font-body-md text-on-surface-variant leading-relaxed">{product.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Comments */}
      <div className="mt-xl">
        <h2 className="font-headline-md text-headline-md text-on-surface mb-lg">Preguntas y comentarios ({comments.length})</h2>
        {user && (
          <form onSubmit={submitComment} className="mb-lg">
            {replyTo && (
              <div className="flex items-center gap-sm mb-sm font-label-sm text-on-surface-variant">
                Respondiendo a un comentario
                <button type="button" onClick={() => setReplyTo(null)} className="text-error hover:underline">cancelar</button>
              </div>
            )}
            <div className="flex gap-md">
              <div className="w-9 h-9 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold text-sm shrink-0">
                {user.username[0].toUpperCase()}
              </div>
              <div className="flex-1 flex gap-sm">
                <input value={commentText} onChange={e => setCommentText(e.target.value)}
                  placeholder={replyTo ? 'Escribe una respuesta...' : 'Escribe tu pregunta o comentario...'}
                  className="input flex-1" />
                <button type="submit" className="bg-primary text-on-primary px-lg py-sm rounded-lg font-label-lg hover:opacity-90 active:scale-95 transition-all">Enviar</button>
              </div>
            </div>
          </form>
        )}
        <div className="space-y-lg">
          {comments.map(c => (
            <div key={c.id} className="space-y-md">
              <div className="flex gap-md">
                <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center font-label-lg text-on-surface-variant shrink-0">
                  {c.username?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-sm">
                    <span className="font-label-lg text-label-lg text-on-surface">{c.username}</span>
                    {c.user_id === product.seller_id && (
                      <span className="bg-primary-fixed text-on-primary-fixed px-2 py-0.5 rounded-full font-label-sm text-label-sm">Vendedor</span>
                    )}
                    <span className="font-label-sm text-label-sm text-on-surface-variant">{new Date(c.created_at).toLocaleDateString('es')}</span>
                  </div>
                  <p className="font-body-md text-on-surface mt-0.5">{c.content}</p>
                  {user && <button onClick={() => setReplyTo(c.id)} className="font-label-sm text-label-sm text-primary hover:underline mt-1">Responder</button>}
                </div>
              </div>
              {c.replies?.map(r => (
                <div key={r.id} className="ml-11 flex gap-md">
                  <div className="w-7 h-7 rounded-full bg-surface-container-low flex items-center justify-center font-label-sm text-on-surface-variant shrink-0">
                    {r.username?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-sm">
                      <span className="font-label-lg text-label-lg text-on-surface">{r.username}</span>
                      {r.user_id === product.seller_id && (
                        <span className="bg-primary-fixed text-on-primary-fixed px-2 py-0.5 rounded-full font-label-sm text-label-sm">Vendedor</span>
                      )}
                    </div>
                    <p className="font-body-md text-on-surface">{r.content}</p>
                  </div>
                </div>
              ))}
            </div>
          ))}
          {comments.length === 0 && <p className="font-body-md text-on-surface-variant">Sé el primero en preguntar.</p>}
        </div>
      </div>

      {/* Outfit modal */}
      {showOutfitModal && (
        <Modal onClose={() => setShowOutfitModal(false)} title="Agregar a outfit" size="sm">
          <div className="space-y-sm">
            {outfits.map(o => (
              <button key={o.id} onClick={() => addToOutfit(o.id)}
                className="w-full text-left p-md border border-outline-variant/30 rounded-lg hover:border-primary hover:bg-primary-fixed/20 transition-colors">
                <p className="font-label-lg text-label-lg text-on-surface">{o.name}</p>
                <p className="font-label-sm text-label-sm text-on-surface-variant">{o.items?.length || 0} prendas</p>
              </button>
            ))}
            <div className="border-t border-outline-variant/20 pt-md">
              <p className="font-label-lg text-label-lg text-on-surface mb-sm">Crear nuevo outfit</p>
              <div className="flex gap-sm">
                <input value={newOutfitName} onChange={e => setNewOutfitName(e.target.value)} placeholder="Nombre del outfit" className="input flex-1" />
                <button onClick={createAndAddOutfit} className="bg-primary text-on-primary px-md py-sm rounded-lg font-label-lg hover:opacity-90 transition-all">Crear</button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
