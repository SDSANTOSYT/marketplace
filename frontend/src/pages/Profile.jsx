import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import api, { imgUrl } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import StarRating from '../components/StarRating'
import Modal from '../components/Modal'
import ProductCard from '../components/ProductCard'

const TABS = [
  { id: 'catalog', label: 'Mis productos' },
  { id: 'orders', label: 'Mis pedidos' },
  { id: 'selling', label: 'Mis ventas' },
  { id: 'negotiations', label: 'Mis chats' },
  { id: 'wishlist', label: 'Lista de deseos' },
  { id: 'addresses', label: 'Direcciones' },
  { id: 'payments', label: 'Pagos' },
  { id: 'settings', label: 'Configuración' },
]

export default function Profile() {
  const { user, reload, logout } = useAuth()
  const navigate = useNavigate()
  const [sp] = useSearchParams()
  const [tab, setTab] = useState(sp.get('tab') || 'catalog')
  const [data, setData] = useState({ catalog: [], orders: [], selling: [], negotiations: [], wishlist: [], addresses: [], payments: [] })
  const [loading, setLoading] = useState(true)
  const [reviewModal, setReviewModal] = useState(null)
  const [reviewData, setReviewData] = useState({ rating: 5, content: '' })
  const [settingsForm, setSettingsForm] = useState({ username: '', email: '', recovery_email: '', password: '' })
  const [settingsMsg, setSettingsMsg] = useState('')
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
      setData({ catalog: catalog.data.products, orders: orders.data, selling: selling.data, negotiations: negotiations.data, wishlist: wishlist.data, addresses: addresses.data, payments: payments.data })
      setLoading(false)
    }
    load()
  }, [user])

  const submitReview = async () => {
    await api.post(`/orders/items/${reviewModal}/review`, reviewData)
    setReviewModal(null)
    const { data: orders } = await api.get('/orders')
    setData(d => ({ ...d, orders }))
  }

  const markReceived = async (itemId) => {
    await api.put(`/orders/items/${itemId}/received`)
    const { data: orders } = await api.get('/orders')
    setData(d => ({ ...d, orders }))
  }

  const addTracking = async (itemId) => {
    const tracking_number = prompt('Número de seguimiento:')
    if (!tracking_number) return
    const carrier = prompt('Empresa de envío (ej: FedEx, DHL):')
    if (!carrier) return
    await api.put(`/orders/items/${itemId}/tracking`, { tracking_number, carrier })
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
    } catch (e) { setSettingsMsg(e.response?.data?.error || 'Error') }
  }

  const addAddress = async () => {
    const { data: newAddr } = await api.post('/users/me/addresses', addrForm)
    setData(d => ({ ...d, addresses: [...d.addresses, newAddr] })); setShowAddrForm(false); setAddrForm({ name: '', phone: '', address: '' })
  }

  const deleteAddress = async (id) => {
    if (!confirm('¿Eliminar dirección?')) return
    await api.delete(`/users/me/addresses/${id}`)
    setData(d => ({ ...d, addresses: d.addresses.filter(a => a.id !== id) }))
  }

  const addPayment = async () => {
    const { data: newPay } = await api.post('/users/me/payments', { type: payForm.type, label: payForm.label || `${payForm.type} ****${payForm.number?.slice(-4)}`, data: { number: payForm.number, expiry: payForm.expiry } })
    setData(d => ({ ...d, payments: [...d.payments, newPay] })); setShowPayForm(false)
  }

  const deletePayment = async (id) => {
    if (!confirm('¿Eliminar método de pago?')) return
    await api.delete(`/users/me/payments/${id}`)
    setData(d => ({ ...d, payments: d.payments.filter(p => p.id !== id) }))
  }

  if (!user) return null
  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="card p-6 mb-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-bold">
          {user.username[0].toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-bold">@{user.username}</h1>
          <p className="text-gray-500 text-sm">{user.email}</p>
          <p className="text-xs text-gray-400 mt-0.5">Miembro desde {new Date(user.created_at).toLocaleDateString('es')}</p>
        </div>
        <Link to="/sell" className="btn-primary ml-auto">+ Publicar</Link>
      </div>

      <div className="flex gap-6 flex-col md:flex-row">
        {/* Sidebar tabs */}
        <aside className="md:w-48 shrink-0">
          <div className="card p-2 space-y-0.5">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${tab === t.id ? 'bg-primary-light text-primary font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                {t.label}
              </button>
            ))}
            <button onClick={logout} className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 mt-2">Cerrar sesión</button>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          {/* Catalog */}
          {tab === 'catalog' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold">Mis productos ({data.catalog.length})</h2>
                <Link to="/sell" className="btn-primary text-sm">+ Nuevo</Link>
              </div>
              {data.catalog.length === 0 ? <p className="text-gray-500 text-sm">Aún no has publicado productos.</p> : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {data.catalog.map(p => <ProductCard key={p.id} product={p} />)}
                </div>
              )}
            </div>
          )}

          {/* Orders */}
          {tab === 'orders' && (
            <div className="space-y-4">
              <h2 className="font-semibold">Mis pedidos ({data.orders.length})</h2>
              {data.orders.length === 0 ? <p className="text-gray-500 text-sm">No has realizado pedidos aún.</p> : data.orders.map(order => (
                <div key={order.id} className="card p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-medium text-sm">Pedido #{order.id}</p>
                      <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString('es')}</p>
                    </div>
                    <span className="badge bg-blue-100 text-blue-700 capitalize">{order.status}</span>
                  </div>
                  <div className="space-y-3">
                    {order.items?.map(item => (
                      <div key={item.id} className="flex gap-3 items-start">
                        <Link to={`/products/${item.product_id}`} className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                          {item.image && <img src={imgUrl(item.image)} alt="" className="w-full h-full object-cover" />}
                        </Link>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{item.title}</p>
                          <p className="text-xs text-gray-500">${item.price} x{item.quantity}</p>
                          {item.tracking_number && <p className="text-xs text-green-600 mt-1">Rastreo: {item.tracking_number} ({item.carrier})</p>}
                          <div className="flex gap-2 mt-1.5">
                            {item.status === 'shipped' && (
                              <button onClick={() => markReceived(item.id)} className="text-xs btn-primary py-1 px-2">Marcar recibido</button>
                            )}
                            {item.status === 'received' && !item.reviewed && (
                              <button onClick={() => setReviewModal(item.id)} className="text-xs btn-outline py-1 px-2">Dejar reseña</button>
                            )}
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              item.status === 'received' ? 'bg-green-100 text-green-700' :
                              item.status === 'shipped' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                            }`}>{item.status === 'pending' ? 'Pendiente' : item.status === 'shipped' ? 'Enviado' : 'Recibido'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t mt-3 pt-2 flex justify-between text-sm font-bold">
                    <span>Total</span><span className="text-primary">${Number(order.total).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Selling */}
          {tab === 'selling' && (
            <div className="space-y-3">
              <h2 className="font-semibold">Mis ventas ({data.selling.length})</h2>
              {data.selling.length === 0 ? <p className="text-gray-500 text-sm">No tienes ventas aún.</p> : data.selling.map(item => (
                <div key={item.id} className="card p-4 flex gap-4 items-start">
                  <Link to={`/products/${item.product_id}`} className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                    {item.image && <img src={imgUrl(item.image)} alt="" className="w-full h-full object-cover" />}
                  </Link>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="text-xs text-gray-500">Comprador: @{item.buyer_username} · ${item.price} x{item.quantity}</p>
                    {item.tracking_number && <p className="text-xs text-green-600 mt-1">Rastreo: {item.tracking_number}</p>}
                    <div className="flex gap-2 mt-2">
                      {item.status === 'pending' && (
                        <button onClick={() => addTracking(item.id)} className="text-xs btn-primary py-1 px-2">Registrar envío</button>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${item.status === 'received' ? 'bg-green-100 text-green-700' : item.status === 'shipped' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                        {item.status === 'pending' ? 'Por enviar' : item.status === 'shipped' ? 'En camino' : 'Entregado'}
                      </span>
                    </div>
                  </div>
                  <p className="font-bold text-primary text-sm shrink-0">${(item.price * item.quantity).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}

          {/* Negotiations */}
          {tab === 'negotiations' && (
            <div className="space-y-3">
              <h2 className="font-semibold">Mis chats de negociación ({data.negotiations.length})</h2>
              {data.negotiations.length === 0 ? (
                <p className="text-gray-500 text-sm">No tienes negociaciones activas.</p>
              ) : data.negotiations.map(neg => {
                const isBuyer = neg.buyer_id === user.id
                const counterpart = isBuyer ? neg.seller_username : neg.buyer_username
                const statusColors = {
                  open: 'bg-blue-100 text-blue-700',
                  agreed: 'bg-green-100 text-green-700',
                  rejected: 'bg-red-100 text-red-700',
                }
                const statusLabels = { open: 'Abierta', agreed: 'Acordada', rejected: 'Rechazada' }
                return (
                  <div key={neg.id} className="card p-4 flex gap-4 items-center">
                    <Link to={`/products/${neg.product_id}`} className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                      {neg.product_images?.[0] && (
                        <img src={imgUrl(neg.product_images[0])} alt="" className="w-full h-full object-cover"
                          onError={e => { e.target.style.display = 'none' }} />
                      )}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{neg.product_title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        <span className="font-medium">{isBuyer ? 'Comprando a' : 'Vendiendo a'}</span> @{counterpart}
                      </p>
                      {neg.agreed_price && (
                        <p className="text-xs text-green-600 mt-0.5">Precio acordado: ${Number(neg.agreed_price).toLocaleString()}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[neg.status] || 'bg-gray-100 text-gray-600'}`}>
                        {statusLabels[neg.status] || neg.status}
                      </span>
                      <Link to={`/negotiations/${neg.id}`} className="btn-primary text-xs py-1 px-3">
                        {neg.status === 'open' ? 'Abrir chat' : 'Ver chat'}
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Wishlist */}
          {tab === 'wishlist' && (
            <div>
              <h2 className="font-semibold mb-4">Lista de deseos ({data.wishlist.length})</h2>
              {data.wishlist.length === 0 ? <p className="text-gray-500 text-sm">Tu lista de deseos está vacía.</p> : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {data.wishlist.map(p => <ProductCard key={p.id} product={{ ...p, inWishlist: true }} onWishlistChange={async () => { const { data: wl } = await api.get('/wishlist'); setData(d => ({ ...d, wishlist: wl })) }} />)}
                </div>
              )}
            </div>
          )}

          {/* Addresses */}
          {tab === 'addresses' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold">Direcciones de envío</h2>
                <button onClick={() => setShowAddrForm(true)} className="btn-primary text-sm">+ Agregar</button>
              </div>
              {data.addresses.map(a => (
                <div key={a.id} className="card p-4 mb-3 flex justify-between items-start">
                  <div><p className="font-medium">{a.name}</p><p className="text-sm text-gray-500">{a.phone} · {a.address}</p></div>
                  <button onClick={() => deleteAddress(a.id)} className="text-red-400 hover:text-red-600 text-sm">Eliminar</button>
                </div>
              ))}
              {data.addresses.length === 0 && !showAddrForm && <p className="text-gray-500 text-sm">No tienes direcciones guardadas.</p>}
              {showAddrForm && (
                <div className="card p-4 space-y-3">
                  <input placeholder="Nombre" value={addrForm.name} onChange={e => setAddrForm(p => ({ ...p, name: e.target.value }))} className="input" />
                  <input placeholder="Teléfono" value={addrForm.phone} onChange={e => setAddrForm(p => ({ ...p, phone: e.target.value }))} className="input" />
                  <input placeholder="Dirección completa" value={addrForm.address} onChange={e => setAddrForm(p => ({ ...p, address: e.target.value }))} className="input" />
                  <div className="flex gap-2">
                    <button onClick={() => setShowAddrForm(false)} className="btn-ghost flex-1">Cancelar</button>
                    <button onClick={addAddress} className="btn-primary flex-1">Guardar</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payments */}
          {tab === 'payments' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold">Métodos de pago</h2>
                <button onClick={() => setShowPayForm(true)} className="btn-primary text-sm">+ Agregar</button>
              </div>
              {data.payments.map(p => (
                <div key={p.id} className="card p-4 mb-3 flex justify-between items-center">
                  <div><p className="font-medium">{p.label}</p><p className="text-xs text-gray-500 capitalize">{p.type}</p></div>
                  <button onClick={() => deletePayment(p.id)} className="text-red-400 hover:text-red-600 text-sm">Eliminar</button>
                </div>
              ))}
              {data.payments.length === 0 && !showPayForm && <p className="text-gray-500 text-sm">No tienes métodos de pago guardados.</p>}
              {showPayForm && (
                <div className="card p-4 space-y-3">
                  <select value={payForm.type} onChange={e => setPayForm(p => ({ ...p, type: e.target.value }))} className="input">
                    <option value="card">Tarjeta</option><option value="paypal">PayPal</option><option value="transfer">Transferencia</option><option value="cash">Efectivo</option>
                  </select>
                  <input placeholder="Etiqueta (ej: Visa personal)" value={payForm.label} onChange={e => setPayForm(p => ({ ...p, label: e.target.value }))} className="input" />
                  {payForm.type === 'card' && <input placeholder="Número de tarjeta" value={payForm.number} onChange={e => setPayForm(p => ({ ...p, number: e.target.value }))} className="input" />}
                  <div className="flex gap-2">
                    <button onClick={() => setShowPayForm(false)} className="btn-ghost flex-1">Cancelar</button>
                    <button onClick={addPayment} className="btn-primary flex-1">Guardar</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Settings */}
          {tab === 'settings' && (
            <div>
              <h2 className="font-semibold mb-4">Configuración de cuenta</h2>
              <form onSubmit={saveSettings} className="card p-5 space-y-4">
                <div><label className="text-sm font-medium block mb-1">Nombre de usuario</label><input className="input" value={settingsForm.username} onChange={e => setSettingsForm(f => ({ ...f, username: e.target.value }))} /></div>
                <div><label className="text-sm font-medium block mb-1">Correo principal</label><input className="input" type="email" value={settingsForm.email} onChange={e => setSettingsForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div><label className="text-sm font-medium block mb-1">Correo de recuperación</label><input className="input" type="email" value={settingsForm.recovery_email} onChange={e => setSettingsForm(f => ({ ...f, recovery_email: e.target.value }))} /></div>
                <div><label className="text-sm font-medium block mb-1">Nueva contraseña <span className="text-gray-400 font-normal">(dejar vacío para no cambiar)</span></label><input className="input" type="password" value={settingsForm.password} onChange={e => setSettingsForm(f => ({ ...f, password: e.target.value }))} /></div>
                {settingsMsg && <p className={`text-sm ${settingsMsg.includes('Error') || settingsMsg.includes('existe') ? 'text-red-600' : 'text-green-600'}`}>{settingsMsg}</p>}
                <button type="submit" className="btn-primary">Guardar cambios</button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Review modal */}
      {reviewModal && (
        <Modal onClose={() => setReviewModal(null)} title="Dejar reseña" size="sm">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Calificación</p>
              <StarRating rating={reviewData.rating} size="lg" onChange={r => setReviewData(d => ({ ...d, rating: r }))} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Comentario (opcional)</label>
              <textarea className="input min-h-[80px]" value={reviewData.content} onChange={e => setReviewData(d => ({ ...d, content: e.target.value }))} placeholder="Describe tu experiencia con el vendedor..." />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setReviewModal(null)} className="btn-ghost flex-1">Cancelar</button>
              <button onClick={submitReview} className="btn-primary flex-1">Enviar reseña</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
