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

  const SIDEBAR_SECTIONS = [
    {
      label: 'Marketplace',
      items: [
        { id: 'catalog', label: 'Mis productos', icon: 'storefront' },
        { id: 'orders', label: 'Mis pedidos', icon: 'local_shipping' },
        { id: 'selling', label: 'Mis ventas', icon: 'sell' },
        { id: 'negotiations', label: 'Mis chats', icon: 'chat' },
        { id: 'wishlist', label: 'Lista de deseos', icon: 'favorite' },
      ]
    },
    {
      label: 'Configuración',
      items: [
        { id: 'addresses', label: 'Direcciones', icon: 'location_on' },
        { id: 'payments', label: 'Pagos', icon: 'credit_card' },
        { id: 'settings', label: 'Configuración', icon: 'settings' },
      ]
    }
  ]

  return (
    <div className="px-margin-desktop py-xl">
      {/* Profile header */}
      <div className="bg-surface-container-lowest p-xl rounded-xl border border-outline-variant/20 mb-xl flex flex-col sm:flex-row items-center sm:items-start gap-lg">
        <div className="w-20 h-20 rounded-full bg-primary-fixed text-primary flex items-center justify-center text-2xl font-bold border-4 border-primary-fixed shrink-0">
          {user.username[0].toUpperCase()}
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h1 className="font-display-lg text-display-lg text-on-surface">@{user.username}</h1>
          <p className="font-body-md text-on-surface-variant mt-1">{user.email}</p>
          <p className="font-label-sm text-label-sm text-on-surface-variant mt-xs">Miembro desde {new Date(user.created_at).toLocaleDateString('es')}</p>
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
        {/* Sidebar */}
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

        <div className="flex-1 min-w-0">
          {/* Catalog */}
          {tab === 'catalog' && (
            <div>
              <div className="flex justify-between items-center mb-lg">
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Mis productos ({data.catalog.length})</h2>
                <Link to="/sell" className="bg-primary text-on-primary px-md py-xs rounded-lg font-label-lg hover:opacity-90 active:scale-95 transition-all">+ Nuevo</Link>
              </div>
              {data.catalog.length === 0 ? <p className="font-body-md text-on-surface-variant">Aún no has publicado productos.</p> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
                  {data.catalog.map(p => <ProductCard key={p.id} product={p} />)}
                </div>
              )}
            </div>
          )}

          {/* Orders */}
          {tab === 'orders' && (
            <div className="space-y-md">
              <h2 className="font-headline-sm text-headline-sm text-on-surface">Mis pedidos ({data.orders.length})</h2>
              {data.orders.length === 0 ? <p className="font-body-md text-on-surface-variant">No has realizado pedidos aún.</p> : data.orders.map(order => (
                <div key={order.id} className="card p-lg">
                  <div className="flex justify-between items-start mb-md">
                    <div>
                      <p className="font-label-lg text-label-lg text-on-surface">Pedido #{order.id}</p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">{new Date(order.created_at).toLocaleDateString('es')}</p>
                    </div>
                    <span className="bg-secondary-fixed text-on-secondary-fixed px-sm py-0.5 rounded-full font-label-sm text-label-sm capitalize">{order.status}</span>
                  </div>
                  <div className="space-y-md">
                    {order.items?.map(item => (
                      <div key={item.id} className="flex gap-md items-start">
                        <Link to={`/products/${item.product_id}`} className="w-12 h-12 bg-surface-container rounded-lg overflow-hidden shrink-0">
                          {item.image && <img src={imgUrl(item.image)} alt="" className="w-full h-full object-cover" />}
                        </Link>
                        <div className="flex-1">
                          <p className="font-label-lg text-label-lg text-on-surface">{item.title}</p>
                          <p className="font-label-sm text-label-sm text-on-surface-variant">${item.price} x{item.quantity}</p>
                          {item.tracking_number && <p className="font-label-sm text-label-sm text-primary mt-1">Rastreo: {item.tracking_number} ({item.carrier})</p>}
                          <div className="flex gap-sm mt-sm flex-wrap">
                            {item.status === 'shipped' && (
                              <button onClick={() => markReceived(item.id)} className="bg-primary text-on-primary px-sm py-0.5 rounded-lg font-label-sm hover:opacity-90 active:scale-95 transition-all">Marcar recibido</button>
                            )}
                            {item.status === 'received' && !item.reviewed && (
                              <button onClick={() => setReviewModal(item.id)} className="border border-secondary text-secondary px-sm py-0.5 rounded-lg font-label-sm hover:bg-secondary-fixed transition-all">Dejar reseña</button>
                            )}
                            <span className={`font-label-sm text-label-sm px-sm py-0.5 rounded-full ${
                              item.status === 'received' ? 'bg-primary-fixed text-on-primary-fixed' :
                              item.status === 'shipped' ? 'bg-secondary-fixed text-on-secondary-fixed' : 'bg-surface-container text-on-surface-variant'
                            }`}>{item.status === 'pending' ? 'Pendiente' : item.status === 'shipped' ? 'Enviado' : 'Recibido'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-outline-variant/20 mt-md pt-sm flex justify-between font-label-lg text-label-lg">
                    <span className="text-on-surface">Total</span>
                    <span className="text-primary">${Number(order.total).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Selling */}
          {tab === 'selling' && (
            <div className="space-y-sm">
              <h2 className="font-headline-sm text-headline-sm text-on-surface">Mis ventas ({data.selling.length})</h2>
              {data.selling.length === 0 ? <p className="font-body-md text-on-surface-variant">No tienes ventas aún.</p> : data.selling.map(item => (
                <div key={item.id} className="card p-md flex gap-md items-start">
                  <Link to={`/products/${item.product_id}`} className="w-14 h-14 bg-surface-container rounded-lg overflow-hidden shrink-0">
                    {item.image && <img src={imgUrl(item.image)} alt="" className="w-full h-full object-cover" />}
                  </Link>
                  <div className="flex-1">
                    <p className="font-label-lg text-label-lg text-on-surface">{item.title}</p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">Comprador: @{item.buyer_username} · ${item.price} x{item.quantity}</p>
                    {item.tracking_number && <p className="font-label-sm text-label-sm text-primary mt-1">Rastreo: {item.tracking_number}</p>}
                    <div className="flex gap-sm mt-sm">
                      {item.status === 'pending' && (
                        <button onClick={() => addTracking(item.id)} className="bg-primary text-on-primary px-sm py-0.5 rounded-lg font-label-sm hover:opacity-90 active:scale-95 transition-all">Registrar envío</button>
                      )}
                      <span className={`font-label-sm text-label-sm px-sm py-0.5 rounded-full ${item.status === 'received' ? 'bg-primary-fixed text-on-primary-fixed' : item.status === 'shipped' ? 'bg-secondary-fixed text-on-secondary-fixed' : 'bg-surface-container text-on-surface-variant'}`}>
                        {item.status === 'pending' ? 'Por enviar' : item.status === 'shipped' ? 'En camino' : 'Entregado'}
                      </span>
                    </div>
                  </div>
                  <p className="font-label-lg text-label-lg text-primary shrink-0">${(item.price * item.quantity).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}

          {/* Negotiations */}
          {tab === 'negotiations' && (
            <div className="space-y-sm">
              <h2 className="font-headline-sm text-headline-sm text-on-surface">Mis chats de negociación ({data.negotiations.length})</h2>
              {data.negotiations.length === 0 ? (
                <p className="font-body-md text-on-surface-variant">No tienes negociaciones activas.</p>
              ) : data.negotiations.map(neg => {
                const isBuyer = neg.buyer_id === user.id
                const counterpart = isBuyer ? neg.seller_username : neg.buyer_username
                const statusColors = {
                  open: 'bg-secondary-fixed text-on-secondary-fixed',
                  agreed: 'bg-primary-fixed text-on-primary-fixed',
                  rejected: 'bg-error-container text-on-error-container',
                }
                const statusLabels = { open: 'Abierta', agreed: 'Acordada', rejected: 'Rechazada' }
                return (
                  <div key={neg.id} className="card p-md flex gap-md items-center">
                    <Link to={`/products/${neg.product_id}`} className="w-14 h-14 bg-surface-container rounded-lg overflow-hidden shrink-0">
                      {neg.product_images?.[0] && (
                        <img src={imgUrl(neg.product_images[0])} alt="" className="w-full h-full object-cover"
                          onError={e => { e.target.style.display = 'none' }} />
                      )}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <p className="font-label-lg text-label-lg text-on-surface truncate">{neg.product_title}</p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                        <span className="font-label-lg">{isBuyer ? 'Comprando a' : 'Vendiendo a'}</span> @{counterpart}
                      </p>
                      {neg.agreed_price && (
                        <p className="font-label-sm text-label-sm text-primary mt-0.5">Precio acordado: ${Number(neg.agreed_price).toLocaleString()}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-sm shrink-0">
                      <span className={`font-label-sm text-label-sm px-sm py-0.5 rounded-full ${statusColors[neg.status] || 'bg-surface-container text-on-surface-variant'}`}>
                        {statusLabels[neg.status] || neg.status}
                      </span>
                      <Link to={`/negotiations/${neg.id}`} className="bg-primary text-on-primary px-sm py-0.5 rounded-lg font-label-sm hover:opacity-90 active:scale-95 transition-all">
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
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-lg">Lista de deseos ({data.wishlist.length})</h2>
              {data.wishlist.length === 0 ? <p className="font-body-md text-on-surface-variant">Tu lista de deseos está vacía.</p> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
                  {data.wishlist.map(p => <ProductCard key={p.id} product={{ ...p, inWishlist: true }} onWishlistChange={async () => { const { data: wl } = await api.get('/wishlist'); setData(d => ({ ...d, wishlist: wl })) }} />)}
                </div>
              )}
            </div>
          )}

          {/* Addresses */}
          {tab === 'addresses' && (
            <div>
              <div className="flex justify-between items-center mb-lg">
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Direcciones de envío</h2>
                <button onClick={() => setShowAddrForm(true)} className="bg-primary text-on-primary px-md py-xs rounded-lg font-label-lg hover:opacity-90 active:scale-95 transition-all">+ Agregar</button>
              </div>
              {data.addresses.map(a => (
                <div key={a.id} className="card p-md mb-sm flex justify-between items-start">
                  <div>
                    <p className="font-label-lg text-label-lg text-on-surface">{a.name}</p>
                    <p className="font-body-md text-on-surface-variant">{a.phone} · {a.address}</p>
                  </div>
                  <button onClick={() => deleteAddress(a.id)} className="font-label-sm text-label-sm text-error hover:underline">Eliminar</button>
                </div>
              ))}
              {data.addresses.length === 0 && !showAddrForm && <p className="font-body-md text-on-surface-variant">No tienes direcciones guardadas.</p>}
              {showAddrForm && (
                <div className="card p-md space-y-sm">
                  <input placeholder="Nombre" value={addrForm.name} onChange={e => setAddrForm(p => ({ ...p, name: e.target.value }))} className="input" />
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
                <button onClick={() => setShowPayForm(true)} className="bg-primary text-on-primary px-md py-xs rounded-lg font-label-lg hover:opacity-90 active:scale-95 transition-all">+ Agregar</button>
              </div>
              {data.payments.map(p => (
                <div key={p.id} className="card p-md mb-sm flex justify-between items-center">
                  <div>
                    <p className="font-label-lg text-label-lg text-on-surface">{p.label}</p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant capitalize">{p.type}</p>
                  </div>
                  <button onClick={() => deletePayment(p.id)} className="font-label-sm text-label-sm text-error hover:underline">Eliminar</button>
                </div>
              ))}
              {data.payments.length === 0 && !showPayForm && <p className="font-body-md text-on-surface-variant">No tienes métodos de pago guardados.</p>}
              {showPayForm && (
                <div className="card p-md space-y-sm">
                  <select value={payForm.type} onChange={e => setPayForm(p => ({ ...p, type: e.target.value }))} className="input">
                    <option value="card">Tarjeta</option><option value="paypal">PayPal</option><option value="transfer">Transferencia</option><option value="cash">Efectivo</option>
                  </select>
                  <input placeholder="Etiqueta (ej: Visa personal)" value={payForm.label} onChange={e => setPayForm(p => ({ ...p, label: e.target.value }))} className="input" />
                  {payForm.type === 'card' && <input placeholder="Número de tarjeta" value={payForm.number} onChange={e => setPayForm(p => ({ ...p, number: e.target.value }))} className="input" />}
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
              <form onSubmit={saveSettings} className="card p-xl space-y-md">
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
                  <label className="font-label-lg text-label-lg text-on-surface block mb-xs">Nueva contraseña <span className="font-label-sm text-on-surface-variant">(dejar vacío para no cambiar)</span></label>
                  <input className="input" type="password" value={settingsForm.password} onChange={e => setSettingsForm(f => ({ ...f, password: e.target.value }))} />
                </div>
                {settingsMsg && <p className={`font-body-md ${settingsMsg.includes('Error') || settingsMsg.includes('existe') ? 'text-error' : 'text-primary'}`}>{settingsMsg}</p>}
                <button type="submit" className="bg-primary text-on-primary px-lg py-sm rounded-lg font-label-lg hover:opacity-90 active:scale-95 transition-all">Guardar cambios</button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Review modal */}
      {reviewModal && (
        <Modal onClose={() => setReviewModal(null)} title="Dejar reseña" size="sm">
          <div className="space-y-md">
            <div>
              <p className="font-label-lg text-label-lg text-on-surface mb-sm">Calificación</p>
              <StarRating rating={reviewData.rating} size="lg" onChange={r => setReviewData(d => ({ ...d, rating: r }))} />
            </div>
            <div>
              <label className="font-label-lg text-label-lg text-on-surface block mb-xs">Comentario (opcional)</label>
              <textarea className="input min-h-[80px]" value={reviewData.content} onChange={e => setReviewData(d => ({ ...d, content: e.target.value }))} placeholder="Describe tu experiencia con el vendedor..." />
            </div>
            <div className="flex gap-sm">
              <button onClick={() => setReviewModal(null)} className="border border-outline-variant text-on-surface-variant flex-1 py-sm rounded-lg font-label-lg hover:bg-surface-container transition-all">Cancelar</button>
              <button onClick={submitReview} className="bg-primary text-on-primary flex-1 py-sm rounded-lg font-label-lg hover:opacity-90 active:scale-95 transition-all">Enviar reseña</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
