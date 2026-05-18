import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import api, { imgUrl, formatPrice, fmtDate } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import StarRating from '../components/StarRating'
import Modal from '../components/Modal'
import ProductCard from '../components/ProductCard'

const SIDEBAR_SECTIONS = [
  {
    label: 'Marketplace',
    items: [
      { id: 'catalog',      label: 'Mis productos',   icon: 'storefront' },
      { id: 'orders',       label: 'Mis pedidos',     icon: 'local_shipping' },
      { id: 'selling',      label: 'Mis ventas',      icon: 'sell' },
      { id: 'negotiations', label: 'Mis chats',       icon: 'chat' },
      { id: 'wishlist',     label: 'Lista de deseos', icon: 'favorite' },
    ],
  },
  {
    label: 'Cuenta',
    items: [
      { id: 'addresses', label: 'Direcciones',    icon: 'location_on' },
      { id: 'payments',  label: 'Pagos',          icon: 'credit_card' },
      { id: 'settings',  label: 'Configuración',  icon: 'settings' },
    ],
  },
]

const STATUS_LABELS  = { pending: 'Pendiente', shipped: 'Enviado', received: 'Recibido' }
const STATUS_COLORS  = { pending: 'bg-surface-container text-on-surface-variant', shipped: 'bg-secondary-fixed text-on-secondary-fixed', received: 'bg-primary-fixed text-on-primary-fixed' }
const NEG_STATUS_LABELS = { open: 'Abierta', agreed: 'Acordada', rejected: 'Rechazada' }
const NEG_STATUS_COLORS = { open: 'bg-secondary-fixed text-on-secondary-fixed', agreed: 'bg-primary-fixed text-on-primary-fixed', rejected: 'bg-error-container text-on-error-container' }

// ─── Modal de tracking ────────────────────────────────────────────────────────
function TrackingModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({ tracking_number: '', carrier: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const CARRIERS = ['FedEx', 'DHL', 'Estafeta', 'UPS', 'Correos de México', 'Redpack', 'J&T Express', 'Otro']

  const submit = async () => {
    if (!form.tracking_number.trim() || !form.carrier.trim()) { setError('Completa todos los campos'); return }
    setLoading(true)
    try {
      await onSubmit(form.tracking_number.trim(), form.carrier.trim())
      onClose()
    } catch (e) {
      setError(e.response?.data?.error || 'Error al guardar')
    } finally { setLoading(false) }
  }

  return (
    <Modal onClose={onClose} title="Registrar envío" size="sm">
      <div className="space-y-md">
        <div className="bg-secondary-fixed/40 rounded-lg p-md flex items-start gap-sm">
          <span className="material-symbols-outlined text-secondary text-[20px] mt-0.5">info</span>
          <p className="font-body-md text-on-surface-variant">
            Ingresa el número de guía y la empresa transportadora para que el comprador pueda rastrear su pedido.
          </p>
        </div>

        <div>
          <label className="font-label-lg text-label-lg text-on-surface block mb-xs">Empresa transportadora *</label>
          <select value={form.carrier} onChange={e => setForm(f => ({ ...f, carrier: e.target.value }))} className="input">
            <option value="">Seleccionar empresa...</option>
            {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="font-label-lg text-label-lg text-on-surface block mb-xs">Número de guía / tracking *</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">qr_code_scanner</span>
            <input
              placeholder="Ej: 1Z999AA10123456784"
              value={form.tracking_number}
              onChange={e => setForm(f => ({ ...f, tracking_number: e.target.value }))}
              className="input pl-10"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-sm bg-error-container text-on-error-container px-md py-sm rounded-lg">
            <span className="material-symbols-outlined text-[16px]">error</span>
            <p className="font-label-sm text-label-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-sm pt-xs">
          <button onClick={onClose} className="border border-outline-variant text-on-surface-variant flex-1 py-sm rounded-lg font-label-lg hover:bg-surface-container transition-all">
            Cancelar
          </button>
          <button onClick={submit} disabled={loading} className="bg-primary text-on-primary flex-1 py-sm rounded-lg font-label-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-sm">
            {loading
              ? <><div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />Guardando...</>
              : <><span className="material-symbols-outlined text-[18px]">local_shipping</span>Confirmar envío</>
            }
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Avatar uploader ──────────────────────────────────────────────────────────
function AvatarSection({ user, onUpdated }) {
  const fileRef = useRef()
  const [uploading, setUploading] = useState(false)

  const upload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('avatar', file)
      await api.post('/users/me/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      await onUpdated()
    } catch (err) {
      alert(err.response?.data?.error || 'Error al subir imagen')
    } finally { setUploading(false) }
  }

  const remove = async () => {
    if (!confirm('¿Eliminar foto de perfil?')) return
    setUploading(true)
    try {
      await api.delete('/users/me/avatar')
      await onUpdated()
    } catch {} finally { setUploading(false) }
  }

  return (
    <div className="relative group w-20 h-20 shrink-0">
      {user.avatar ? (
        <img src={imgUrl(user.avatar)} alt={user.username} className="w-full h-full rounded-full object-cover border-4 border-primary-fixed" />
      ) : (
        <div className="w-full h-full rounded-full bg-primary-fixed text-primary flex items-center justify-center text-2xl font-bold border-4 border-primary-fixed">
          {user.username[0].toUpperCase()}
        </div>
      )}

      {/* Overlay on hover */}
      <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="p-1 bg-white/20 rounded-full hover:bg-white/40 transition-colors"
          title="Cambiar foto"
        >
          <span className="material-symbols-outlined text-white text-[16px]">photo_camera</span>
        </button>
        {user.avatar && (
          <button onClick={remove} disabled={uploading} className="p-1 bg-white/20 rounded-full hover:bg-red-500/60 transition-colors" title="Eliminar foto">
            <span className="material-symbols-outlined text-white text-[16px]">delete</span>
          </button>
        )}
      </div>

      {uploading && (
        <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={upload} />
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Profile() {
  const { user, reload, logout } = useAuth()
  const navigate = useNavigate()
  const [sp] = useSearchParams()
  const [tab, setTab] = useState(sp.get('tab') || 'catalog')
  const [data, setData] = useState({
    catalog: [], orders: [], selling: [], negotiations: [],
    wishlist: [], addresses: [], payments: [],
  })
  const [loading, setLoading] = useState(true)

  // Review modal
  const [reviewModal, setReviewModal] = useState(null) // item.id
  const [reviewData, setReviewData] = useState({ rating: 5, content: '' })

  // Tracking modal
  const [trackingModal, setTrackingModal] = useState(null) // item.id

  // Settings
  const [settingsForm, setSettingsForm] = useState({ username: '', email: '', recovery_email: '', password: '' })
  const [settingsMsg, setSettingsMsg] = useState('')

  // Address / payment forms
  const [addrForm, setAddrForm] = useState({ name: '', phone: '', address: '' })
  const [payForm, setPayForm] = useState({ type: 'card', label: '', number: '', expiry: '' })
  const [showAddrForm, setShowAddrForm] = useState(false)
  const [showPayForm, setShowPayForm] = useState(false)

  useEffect(() => {
    if (!user) { navigate('/'); return }
    setSettingsForm({ username: user.username, email: user.email, recovery_email: user.recovery_email || '', password: '' })
    const load = async () => {
      const [catalog, orders, selling, negotiations, wishlist, addresses, payments] = await Promise.all([
        api.get(`/products?seller=${user.id}&limit=50`),
        api.get('/orders'),
        api.get('/orders/selling'),
        api.get('/negotiations'),
        api.get('/wishlist'),
        api.get('/users/me/addresses'),
        api.get('/users/me/payments'),
      ])
      setData({
        catalog: catalog.data.products,
        orders: orders.data,
        selling: selling.data,
        negotiations: negotiations.data,
        wishlist: wishlist.data,
        addresses: addresses.data,
        payments: payments.data,
      })
      setLoading(false)
    }
    load()
  }, [user])

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const submitReview = async () => {
    try {
      await api.post(`/orders/items/${reviewModal}/review`, reviewData)
      setReviewModal(null)
      const { data: orders } = await api.get('/orders')
      setData(d => ({ ...d, orders }))
    } catch (e) { alert(e.response?.data?.error || 'Error al enviar reseña') }
  }

  const markReceived = async (itemId) => {
    await api.put(`/orders/items/${itemId}/received`)
    const { data: orders } = await api.get('/orders')
    setData(d => ({ ...d, orders }))
  }

  const submitTracking = async (tracking_number, carrier) => {
    await api.put(`/orders/items/${trackingModal}/tracking`, { tracking_number, carrier })
    const { data: selling } = await api.get('/orders/selling')
    setData(d => ({ ...d, selling }))
  }

  const saveSettings = async (e) => {
    e.preventDefault(); setSettingsMsg('')
    try {
      const payload = {}
      if (settingsForm.username !== user.username) payload.username = settingsForm.username
      if (settingsForm.email !== user.email) payload.email = settingsForm.email
      if (settingsForm.recovery_email !== (user.recovery_email || '')) payload.recovery_email = settingsForm.recovery_email
      if (settingsForm.password) payload.password = settingsForm.password
      if (!Object.keys(payload).length) { setSettingsMsg('Sin cambios'); return }
      await api.put('/users/me/profile', payload)
      await reload()
      setSettingsMsg('¡Guardado correctamente!')
    } catch (e) { setSettingsMsg(e.response?.data?.error || 'Error al guardar') }
  }

  const addAddress = async () => {
    const { data: newAddr } = await api.post('/users/me/addresses', addrForm)
    setData(d => ({ ...d, addresses: [...d.addresses, newAddr] }))
    setShowAddrForm(false); setAddrForm({ name: '', phone: '', address: '' })
  }

  const deleteAddress = async (id) => {
    if (!confirm('¿Eliminar dirección?')) return
    await api.delete(`/users/me/addresses/${id}`)
    setData(d => ({ ...d, addresses: d.addresses.filter(a => a.id !== id) }))
  }

  const addPayment = async () => {
    const label = payForm.label || (payForm.type === 'card' ? `**** ${payForm.number.slice(-4)}` : payForm.type)
    const { data: newPay } = await api.post('/users/me/payments', {
      type: payForm.type, label, data: { number: payForm.number, expiry: payForm.expiry },
    })
    setData(d => ({ ...d, payments: [...d.payments, newPay] }))
    setShowPayForm(false)
  }

  const deletePayment = async (id) => {
    if (!confirm('¿Eliminar método de pago?')) return
    await api.delete(`/users/me/payments/${id}`)
    setData(d => ({ ...d, payments: d.payments.filter(p => p.id !== id) }))
  }

  if (!user) return null
  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="px-margin-desktop py-xl">
      {/* ── Cabecera de perfil ── */}
      <div className="bg-surface-container-lowest p-xl rounded-xl border border-outline-variant/20 mb-xl flex flex-col sm:flex-row items-center sm:items-start gap-lg">
        <AvatarSection user={user} onUpdated={reload} />
        <div className="flex-1 text-center sm:text-left">
          <h1 className="font-display-lg text-display-lg text-on-surface">@{user.username}</h1>
          <p className="font-body-md text-on-surface-variant mt-1">{user.email}</p>
          <p className="font-label-sm text-label-sm text-on-surface-variant mt-xs">
            Miembro desde {fmtDate(user.created_at)}
          </p>
          <div className="flex gap-lg mt-md justify-center sm:justify-start">
            <div className="text-center">
              <p className="font-headline-sm text-headline-sm text-on-surface">{data.catalog.length}</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Productos</p>
            </div>
            <div className="text-center">
              <p className="font-headline-sm text-headline-sm text-on-surface">{data.selling.length}</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Ventas</p>
            </div>
          </div>
        </div>
        <Link to="/sell" className="bg-primary text-on-primary px-lg py-sm rounded-full font-label-lg shadow hover:opacity-90 active:scale-95 transition-all shrink-0">
          + Publicar
        </Link>
      </div>

      <div className="flex gap-xl flex-col md:flex-row">
        {/* ── Sidebar ── */}
        <aside className="md:w-64 shrink-0 space-y-lg">
          {SIDEBAR_SECTIONS.map(section => (
            <div key={section.label}>
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider px-md mb-xs">{section.label}</p>
              <div className="space-y-0.5">
                {section.items.map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={`w-full flex items-center gap-sm px-md py-sm rounded-lg font-label-lg transition-colors ${
                      tab === t.id ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'
                    }`}>
                    <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button onClick={logout} className="w-full flex items-center gap-sm px-md py-sm rounded-lg font-label-lg text-error hover:bg-error-container transition-colors">
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Cerrar sesión
          </button>
        </aside>

        {/* ── Contenido ── */}
        <div className="flex-1 min-w-0">

          {/* Catalog */}
          {tab === 'catalog' && (
            <div>
              <div className="flex justify-between items-center mb-lg">
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Mis productos ({data.catalog.length})</h2>
                <Link to="/sell" className="bg-primary text-on-primary px-md py-xs rounded-lg font-label-lg hover:opacity-90 active:scale-95 transition-all">+ Nuevo</Link>
              </div>
              {data.catalog.length === 0
                ? <p className="font-body-md text-on-surface-variant">Aún no has publicado productos.</p>
                : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
                    {data.catalog.map(p => <ProductCard key={p.id} product={p} />)}
                  </div>
              }
            </div>
          )}

          {/* Orders */}
          {tab === 'orders' && (
            <div className="space-y-md">
              <h2 className="font-headline-sm text-headline-sm text-on-surface">Mis pedidos ({data.orders.length})</h2>
              {data.orders.length === 0
                ? <p className="font-body-md text-on-surface-variant">No has realizado pedidos aún.</p>
                : data.orders.map(order => (
                  <div key={order.id} className="card p-lg">
                    <div className="flex justify-between items-start mb-md">
                      <div>
                        <p className="font-label-lg text-label-lg text-on-surface">Pedido #{order.id}</p>
                        <p className="font-label-sm text-label-sm text-on-surface-variant">{fmtDate(order.created_at)}</p>
                      </div>
                      <span className="bg-secondary-fixed text-on-secondary-fixed px-sm py-0.5 rounded-full font-label-sm text-label-sm capitalize">
                        {order.status === 'pending' ? 'Pendiente' : order.status}
                      </span>
                    </div>
                    <div className="space-y-md">
                      {order.items?.map(item => (
                        <div key={item.id} className="flex gap-md items-start">
                          <Link to={`/products/${item.product_id}`} className="w-12 h-12 bg-surface-container rounded-lg overflow-hidden shrink-0">
                            {item.image && <img src={imgUrl(item.image)} alt="" className="w-full h-full object-cover" />}
                          </Link>
                          <div className="flex-1">
                            <p className="font-label-lg text-label-lg text-on-surface">{item.title}</p>
                            <p className="font-label-sm text-label-sm text-on-surface-variant">${formatPrice(item.price)} x{item.quantity}</p>
                            {item.tracking_number && (
                              <div className="flex items-center gap-1 mt-1">
                                <span className="material-symbols-outlined text-primary text-[14px]">local_shipping</span>
                                <p className="font-label-sm text-label-sm text-primary">Rastreo: {item.tracking_number} ({item.carrier})</p>
                              </div>
                            )}
                            <div className="flex gap-sm mt-sm flex-wrap items-center">
                              {item.status === 'shipped' && (
                                <button onClick={() => markReceived(item.id)} className="bg-primary text-on-primary px-sm py-0.5 rounded-lg font-label-sm hover:opacity-90 active:scale-95 transition-all">
                                  Marcar recibido
                                </button>
                              )}
                              {item.status === 'received' && !item.reviewed && (
                                <button onClick={() => { setReviewData({ rating: 5, content: '' }); setReviewModal(item.id) }}
                                  className="border border-secondary text-secondary px-sm py-0.5 rounded-lg font-label-sm hover:bg-secondary-fixed transition-all">
                                  Dejar reseña
                                </button>
                              )}
                              {item.status === 'received' && item.reviewed && (
                                <span className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
                                  <span className="material-symbols-outlined text-primary text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                  Reseña enviada
                                </span>
                              )}
                              <span className={`font-label-sm text-label-sm px-sm py-0.5 rounded-full ${STATUS_COLORS[item.status] || ''}`}>
                                {STATUS_LABELS[item.status] || item.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-outline-variant/20 mt-md pt-sm flex justify-between font-label-lg text-label-lg">
                      <span className="text-on-surface">Total</span>
                      <span className="text-primary">${formatPrice(order.total)}</span>
                    </div>
                  </div>
                ))
              }
            </div>
          )}

          {/* Selling */}
          {tab === 'selling' && (
            <div className="space-y-sm">
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-lg">Mis ventas ({data.selling.length})</h2>
              {data.selling.length === 0
                ? <p className="font-body-md text-on-surface-variant">No tienes ventas aún.</p>
                : data.selling.map(item => (
                  <div key={item.id} className="card p-md flex gap-md items-start">
                    <Link to={`/products/${item.product_id}`} className="w-14 h-14 bg-surface-container rounded-lg overflow-hidden shrink-0">
                      {item.image && <img src={imgUrl(item.image)} alt="" className="w-full h-full object-cover" />}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <p className="font-label-lg text-label-lg text-on-surface truncate">{item.title}</p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">
                        @{item.buyer_username} · ${formatPrice(item.price)} x{item.quantity}
                      </p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">{fmtDate(item.order_date)}</p>
                      {item.tracking_number && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="material-symbols-outlined text-primary text-[14px]">local_shipping</span>
                          <p className="font-label-sm text-label-sm text-primary">{item.tracking_number} ({item.carrier})</p>
                        </div>
                      )}
                      <div className="flex gap-sm mt-sm flex-wrap items-center">
                        {item.status === 'pending' && (
                          <button
                            onClick={() => setTrackingModal(item.id)}
                            className="bg-primary text-on-primary px-sm py-0.5 rounded-lg font-label-sm hover:opacity-90 active:scale-95 transition-all flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">local_shipping</span>
                            Registrar envío
                          </button>
                        )}
                        <span className={`font-label-sm text-label-sm px-sm py-0.5 rounded-full ${
                          item.status === 'received' ? 'bg-primary-fixed text-on-primary-fixed' :
                          item.status === 'shipped' ? 'bg-secondary-fixed text-on-secondary-fixed' :
                          'bg-surface-container text-on-surface-variant'
                        }`}>
                          {item.status === 'pending' ? 'Por enviar' : item.status === 'shipped' ? 'En camino' : 'Entregado'}
                        </span>
                      </div>
                    </div>
                    <p className="font-label-lg text-label-lg text-primary shrink-0">${formatPrice(item.price * item.quantity)}</p>
                  </div>
                ))
              }
            </div>
          )}

          {/* Negotiations */}
          {tab === 'negotiations' && (
            <div className="space-y-sm">
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-lg">Mis chats ({data.negotiations.length})</h2>
              {data.negotiations.length === 0
                ? <p className="font-body-md text-on-surface-variant">No tienes negociaciones activas.</p>
                : data.negotiations.map(neg => {
                  const isBuyer = neg.buyer_id === user.id
                  const counterpart = isBuyer ? neg.seller_username : neg.buyer_username
                  return (
                    <div key={neg.id} className="card p-md flex gap-md items-center">
                      <Link to={`/products/${neg.product_id}`} className="w-14 h-14 bg-surface-container rounded-lg overflow-hidden shrink-0">
                        {neg.product_images?.[0] && (
                          <img src={imgUrl(neg.product_images[0])} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none' }} />
                        )}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <p className="font-label-lg text-label-lg text-on-surface truncate">{neg.product_title}</p>
                        <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                          {isBuyer ? 'Comprando a' : 'Vendiendo a'} <span className="font-label-lg">@{counterpart}</span>
                        </p>
                        {neg.agreed_price && (
                          <p className="font-label-sm text-label-sm text-primary mt-0.5">Acordado: ${formatPrice(neg.agreed_price)}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-sm shrink-0">
                        <span className={`font-label-sm text-label-sm px-sm py-0.5 rounded-full ${NEG_STATUS_COLORS[neg.status] || ''}`}>
                          {NEG_STATUS_LABELS[neg.status] || neg.status}
                        </span>
                        <Link to={`/negotiations/${neg.id}`} className="bg-primary text-on-primary px-sm py-0.5 rounded-lg font-label-sm hover:opacity-90 active:scale-95 transition-all">
                          {neg.status === 'open' ? 'Abrir chat' : 'Ver chat'}
                        </Link>
                      </div>
                    </div>
                  )
                })
              }
            </div>
          )}

          {/* Wishlist */}
          {tab === 'wishlist' && (
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-lg">Lista de deseos ({data.wishlist.length})</h2>
              {data.wishlist.length === 0
                ? <p className="font-body-md text-on-surface-variant">Tu lista de deseos está vacía.</p>
                : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
                    {data.wishlist.map(p => <ProductCard key={p.id} product={p} />)}
                  </div>
              }
            </div>
          )}

          {/* Addresses */}
          {tab === 'addresses' && (
            <div>
              <div className="flex justify-between items-center mb-lg">
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Direcciones de envío</h2>
                <button onClick={() => setShowAddrForm(true)} className="bg-primary text-on-primary px-md py-xs rounded-lg font-label-lg hover:opacity-90 active:scale-95 transition-all">
                  + Agregar
                </button>
              </div>
              {data.addresses.length === 0 && !showAddrForm && (
                <p className="font-body-md text-on-surface-variant">No tienes direcciones guardadas.</p>
              )}
              {data.addresses.map(a => (
                <div key={a.id} className="card p-md mb-sm flex justify-between items-start">
                  <div className="flex items-start gap-sm">
                    <span className="material-symbols-outlined text-on-surface-variant text-[20px] mt-0.5">location_on</span>
                    <div>
                      <p className="font-label-lg text-label-lg text-on-surface">{a.name}</p>
                      <p className="font-body-md text-on-surface-variant">{a.phone} · {a.address}</p>
                    </div>
                  </div>
                  <button onClick={() => deleteAddress(a.id)} className="font-label-sm text-label-sm text-error hover:underline shrink-0 ml-md">Eliminar</button>
                </div>
              ))}
              {showAddrForm && (
                <div className="card p-md space-y-sm mt-sm">
                  <input placeholder="Nombre completo" value={addrForm.name} onChange={e => setAddrForm(p => ({ ...p, name: e.target.value }))} className="input" />
                  <input placeholder="Teléfono" value={addrForm.phone} onChange={e => setAddrForm(p => ({ ...p, phone: e.target.value }))} className="input" />
                  <input placeholder="Dirección completa" value={addrForm.address} onChange={e => setAddrForm(p => ({ ...p, address: e.target.value }))} className="input" />
                  <div className="flex gap-sm">
                    <button onClick={() => setShowAddrForm(false)} className="border border-outline-variant text-on-surface-variant flex-1 py-sm rounded-lg font-label-lg hover:bg-surface-container transition-all">Cancelar</button>
                    <button onClick={addAddress} className="bg-primary text-on-primary flex-1 py-sm rounded-lg font-label-lg hover:opacity-90 active:scale-95 transition-all">Guardar</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payments */}
          {tab === 'payments' && (
            <div>
              <div className="flex justify-between items-center mb-lg">
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Métodos de pago</h2>
                <button onClick={() => setShowPayForm(true)} className="bg-primary text-on-primary px-md py-xs rounded-lg font-label-lg hover:opacity-90 active:scale-95 transition-all">
                  + Agregar
                </button>
              </div>
              {data.payments.length === 0 && !showPayForm && (
                <p className="font-body-md text-on-surface-variant">No tienes métodos de pago guardados.</p>
              )}
              {data.payments.map(p => (
                <div key={p.id} className="card p-md mb-sm flex justify-between items-center">
                  <div className="flex items-center gap-sm">
                    <span className="material-symbols-outlined text-on-surface-variant">credit_card</span>
                    <div>
                      <p className="font-label-lg text-label-lg text-on-surface">{p.label}</p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant capitalize">{p.type}</p>
                    </div>
                  </div>
                  <button onClick={() => deletePayment(p.id)} className="font-label-sm text-label-sm text-error hover:underline">Eliminar</button>
                </div>
              ))}
              {showPayForm && (
                <div className="card p-md space-y-sm mt-sm">
                  <select value={payForm.type} onChange={e => setPayForm(p => ({ ...p, type: e.target.value }))} className="input">
                    <option value="card">Tarjeta</option>
                    <option value="paypal">PayPal</option>
                    <option value="transfer">Transferencia</option>
                    <option value="cash">Efectivo</option>
                  </select>
                  <input placeholder="Etiqueta (ej: Visa personal)" value={payForm.label} onChange={e => setPayForm(p => ({ ...p, label: e.target.value }))} className="input" />
                  {payForm.type === 'card' && (
                    <input placeholder="Últimos 4 dígitos" value={payForm.number} onChange={e => setPayForm(p => ({ ...p, number: e.target.value }))} className="input" maxLength={4} />
                  )}
                  <div className="flex gap-sm">
                    <button onClick={() => setShowPayForm(false)} className="border border-outline-variant text-on-surface-variant flex-1 py-sm rounded-lg font-label-lg hover:bg-surface-container transition-all">Cancelar</button>
                    <button onClick={addPayment} className="bg-primary text-on-primary flex-1 py-sm rounded-lg font-label-lg hover:opacity-90 active:scale-95 transition-all">Guardar</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Settings */}
          {tab === 'settings' && (
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-lg">Configuración de cuenta</h2>
              <form onSubmit={saveSettings} className="card p-xl space-y-md max-w-lg">
                <div>
                  <label className="font-label-lg text-label-lg text-on-surface block mb-xs">Nombre de usuario</label>
                  <input className="input" value={settingsForm.username} onChange={e => setSettingsForm(f => ({ ...f, username: e.target.value }))} />
                </div>
                <div>
                  <label className="font-label-lg text-label-lg text-on-surface block mb-xs">Correo principal</label>
                  <input className="input" type="email" value={settingsForm.email} onChange={e => setSettingsForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className="font-label-lg text-label-lg text-on-surface block mb-xs">Correo de recuperación</label>
                  <input className="input" type="email" value={settingsForm.recovery_email} onChange={e => setSettingsForm(f => ({ ...f, recovery_email: e.target.value }))} />
                </div>
                <div>
                  <label className="font-label-lg text-label-lg text-on-surface block mb-xs">
                    Nueva contraseña <span className="font-label-sm text-on-surface-variant">(dejar vacío para no cambiar)</span>
                  </label>
                  <input className="input" type="password" value={settingsForm.password} onChange={e => setSettingsForm(f => ({ ...f, password: e.target.value }))} />
                </div>
                {settingsMsg && (
                  <p className={`font-body-md ${settingsMsg.includes('Error') || settingsMsg.includes('existe') ? 'text-error' : 'text-primary'}`}>{settingsMsg}</p>
                )}
                <button type="submit" className="bg-primary text-on-primary px-lg py-sm rounded-lg font-label-lg hover:opacity-90 active:scale-95 transition-all">
                  Guardar cambios
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* ── Review Modal ── */}
      {reviewModal && (
        <Modal onClose={() => setReviewModal(null)} title="Dejar reseña" size="sm">
          <div className="space-y-md">
            <div>
              <p className="font-label-lg text-label-lg text-on-surface mb-sm">Calificación</p>
              <StarRating rating={reviewData.rating} size="lg" onChange={r => setReviewData(d => ({ ...d, rating: r }))} />
            </div>
            <div>
              <label className="font-label-lg text-label-lg text-on-surface block mb-xs">Comentario (opcional)</label>
              <textarea className="input min-h-[80px]" value={reviewData.content}
                onChange={e => setReviewData(d => ({ ...d, content: e.target.value }))}
                placeholder="Describe tu experiencia con el vendedor..." />
            </div>
            <div className="flex gap-sm">
              <button onClick={() => setReviewModal(null)} className="border border-outline-variant text-on-surface-variant flex-1 py-sm rounded-lg font-label-lg hover:bg-surface-container transition-all">Cancelar</button>
              <button onClick={submitReview} className="bg-primary text-on-primary flex-1 py-sm rounded-lg font-label-lg hover:opacity-90 active:scale-95 transition-all">Enviar reseña</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Tracking Modal ── */}
      {trackingModal && (
        <TrackingModal
          onClose={() => setTrackingModal(null)}
          onSubmit={submitTracking}
        />
      )}
    </div>
  )
}
