import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api, { imgUrl } from '../lib/api'
import { useAuth } from '../context/AuthContext'

// Formatea número de tarjeta en grupos de 4
function formatCardNumber(val) {
  return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}

// Formatea expiración MM/AA
function formatExpiry(val) {
  const digits = val.replace(/\D/g, '').slice(0, 4)
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return digits
}

function validateCard(number, expiry, cvv) {
  const clean = number.replace(/\s/g, '')
  if (clean.length < 13 || clean.length > 19) return 'Número de tarjeta inválido'
  if (!/^\d{2}\/\d{2}$/.test(expiry)) return 'Fecha de expiración inválida (MM/AA)'
  const [mm, yy] = expiry.split('/').map(Number)
  if (mm < 1 || mm > 12) return 'Mes inválido'
  const now = new Date()
  const expDate = new Date(2000 + yy, mm - 1, 1)
  if (expDate < now) return 'Tarjeta expirada'
  if (!/^\d{3,4}$/.test(cvv)) return 'CVV inválido (3-4 dígitos)'
  return null
}

const PAYMENT_ICONS = {
  card: 'credit_card',
  paypal: 'account_balance_wallet',
  transfer: 'account_balance',
  cash: 'payments',
}

export default function Checkout() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [addresses, setAddresses] = useState([])
  const [payments, setPayments] = useState([])
  const [cartItems, setCartItems] = useState([])
  const [selectedAddress, setSelectedAddress] = useState('')
  const [selectedPayment, setSelectedPayment] = useState('')
  const [loading, setLoading] = useState(true)
  const [placing, setPlacing] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(null) // { id }
  const [error, setError] = useState('')

  const [showNewAddress, setShowNewAddress] = useState(false)
  const [showNewPayment, setShowNewPayment] = useState(false)
  const [newAddr, setNewAddr] = useState({ name: '', phone: '', address: '' })
  const [newPay, setNewPay] = useState({ type: 'card', label: '', number: '', expiry: '', cvv: '' })
  const [payError, setPayError] = useState('')

  useEffect(() => {
    if (!user) { navigate('/'); return }
    Promise.all([
      api.get('/users/me/addresses'),
      api.get('/users/me/payments'),
      api.get('/cart'),
    ]).then(([a, p, c]) => {
      setAddresses(a.data)
      setPayments(p.data)
      setCartItems(c.data)
      if (a.data[0]) setSelectedAddress(a.data[0].id)
      if (p.data[0]) setSelectedPayment(p.data[0].id)
    }).finally(() => setLoading(false))
  }, [user])

  const addAddress = async () => {
    if (!newAddr.name || !newAddr.phone || !newAddr.address) return
    const { data } = await api.post('/users/me/addresses', newAddr)
    setAddresses(prev => [...prev, data])
    setSelectedAddress(data.id)
    setShowNewAddress(false)
    setNewAddr({ name: '', phone: '', address: '' })
  }

  const addPayment = async () => {
    setPayError('')
    if (newPay.type === 'card') {
      const err = validateCard(newPay.number, newPay.expiry, newPay.cvv)
      if (err) { setPayError(err); return }
    }
    const label = newPay.label || (newPay.type === 'card'
      ? `**** **** **** ${newPay.number.replace(/\s/g, '').slice(-4)}`
      : newPay.type.charAt(0).toUpperCase() + newPay.type.slice(1))
    const { data } = await api.post('/users/me/payments', {
      type: newPay.type,
      label,
      data: { number: newPay.number, expiry: newPay.expiry },
    })
    setPayments(prev => [...prev, data])
    setSelectedPayment(data.id)
    setShowNewPayment(false)
    setNewPay({ type: 'card', label: '', number: '', expiry: '', cvv: '' })
  }

  const placeOrder = async () => {
    setError('')
    if (!selectedAddress) { setError('Selecciona una dirección de envío'); return }
    if (!selectedPayment) { setError('Selecciona un método de pago'); return }
    if (!cartItems.length) { setError('Tu carrito está vacío'); return }

    setPlacing(true)
    try {
      const { data } = await api.post('/orders', { address_id: selectedAddress, payment_id: selectedPayment })
      setOrderSuccess({ id: data.id })
    } catch (e) {
      setError(e.response?.data?.error || 'Error al realizar el pedido. Inténtalo de nuevo.')
    } finally {
      setPlacing(false)
    }
  }

  const total = cartItems.reduce((s, i) => s + i.effectivePrice * i.quantity, 0)

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  // ── Pantalla de éxito ──────────────────────────────────────────────────────
  if (orderSuccess) return (
    <div className="max-w-md mx-auto px-margin-desktop py-xl text-center">
      <div className="w-24 h-24 rounded-full bg-primary-fixed flex items-center justify-center mx-auto mb-lg animate-[scale-in_0.3s_ease-out]">
        <span className="material-symbols-outlined text-primary text-5xl">check_circle</span>
      </div>
      <h1 className="font-display-lg text-display-lg text-on-surface mb-sm">¡Pedido confirmado!</h1>
      <p className="font-body-lg text-on-surface-variant mb-xl">
        Tu compra fue procesada exitosamente. Recibirás notificaciones cuando tu pedido sea enviado.
      </p>
      <div className="bg-surface-container-low rounded-lg p-md mb-xl text-left">
        <p className="font-label-sm text-label-sm text-on-surface-variant mb-xs">Total pagado</p>
        <p className="font-headline-md text-headline-md text-primary">${total.toLocaleString()}</p>
        <p className="font-label-sm text-label-sm text-on-surface-variant mt-sm">Pedido #{orderSuccess.id}</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-sm">
        <Link to={`/profile?tab=orders`} className="bg-primary text-on-primary flex-1 py-md rounded-lg font-label-lg hover:opacity-90 active:scale-95 transition-all text-center">
          Ver mis pedidos
        </Link>
        <Link to="/" className="border-2 border-secondary text-secondary flex-1 py-md rounded-lg font-label-lg hover:bg-secondary-fixed active:scale-95 transition-all text-center">
          Seguir comprando
        </Link>
      </div>
    </div>
  )

  // ── Checkout normal ────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto px-margin-desktop py-xl">
      <h1 className="font-headline-md text-headline-md text-on-surface mb-xl">Finalizar compra</h1>

      {error && (
        <div className="bg-error-container text-on-error-container px-md py-sm rounded-lg flex items-center gap-sm mb-lg">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <p className="font-body-md">{error}</p>
        </div>
      )}

      <div className="grid md:grid-cols-5 gap-xl">
        <div className="md:col-span-3 space-y-lg">

          {/* Shipping address */}
          <div className="card p-lg">
            <h2 className="font-headline-sm text-headline-sm text-on-surface mb-lg flex items-center gap-sm">
              <span className="material-symbols-outlined text-on-surface-variant">location_on</span>
              Dirección de envío
            </h2>
            <div className="space-y-sm">
              {addresses.map(a => (
                <label key={a.id} className={`flex gap-md p-md border-2 rounded-lg cursor-pointer transition-colors ${selectedAddress == a.id ? 'border-primary bg-primary-fixed/20' : 'border-outline-variant/30 hover:border-outline-variant'}`}>
                  <input type="radio" name="address" value={a.id} checked={selectedAddress == a.id} onChange={() => setSelectedAddress(a.id)} className="mt-0.5 accent-primary" />
                  <div>
                    <p className="font-label-lg text-label-lg text-on-surface">{a.name}</p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">{a.phone} · {a.address}</p>
                  </div>
                </label>
              ))}
              {addresses.length === 0 && !showNewAddress && (
                <p className="font-body-md text-on-surface-variant px-sm">No tienes direcciones guardadas.</p>
              )}
              {!showNewAddress ? (
                <button onClick={() => setShowNewAddress(true)} className="w-full text-left font-label-lg text-label-lg text-primary hover:underline p-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  Agregar nueva dirección
                </button>
              ) : (
                <div className="border border-outline-variant/30 rounded-lg p-md space-y-sm">
                  <input placeholder="Nombre completo" value={newAddr.name} onChange={e => setNewAddr(p => ({ ...p, name: e.target.value }))} className="input" />
                  <input placeholder="Teléfono" value={newAddr.phone} onChange={e => setNewAddr(p => ({ ...p, phone: e.target.value }))} className="input" />
                  <input placeholder="Dirección completa" value={newAddr.address} onChange={e => setNewAddr(p => ({ ...p, address: e.target.value }))} className="input" />
                  <div className="flex gap-sm">
                    <button onClick={() => setShowNewAddress(false)} className="border border-outline-variant text-on-surface-variant flex-1 py-xs rounded-lg font-label-lg hover:bg-surface-container transition-all">Cancelar</button>
                    <button onClick={addAddress} disabled={!newAddr.name || !newAddr.phone || !newAddr.address} className="bg-primary text-on-primary flex-1 py-xs rounded-lg font-label-lg hover:opacity-90 transition-all disabled:opacity-50">Guardar</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment */}
          <div className="card p-lg">
            <h2 className="font-headline-sm text-headline-sm text-on-surface mb-lg flex items-center gap-sm">
              <span className="material-symbols-outlined text-on-surface-variant">credit_card</span>
              Método de pago
            </h2>
            <div className="space-y-sm">
              {payments.map(p => (
                <label key={p.id} className={`flex gap-md p-md border-2 rounded-lg cursor-pointer transition-colors ${selectedPayment == p.id ? 'border-primary bg-primary-fixed/20' : 'border-outline-variant/30 hover:border-outline-variant'}`}>
                  <input type="radio" name="payment" value={p.id} checked={selectedPayment == p.id} onChange={() => setSelectedPayment(p.id)} className="mt-0.5 accent-primary" />
                  <div className="flex items-center gap-sm">
                    <span className="material-symbols-outlined text-on-surface-variant">{PAYMENT_ICONS[p.type] || 'payment'}</span>
                    <div>
                      <p className="font-label-lg text-label-lg text-on-surface">{p.label}</p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant capitalize">{p.type === 'card' ? 'Tarjeta' : p.type}</p>
                    </div>
                  </div>
                </label>
              ))}
              {payments.length === 0 && !showNewPayment && (
                <p className="font-body-md text-on-surface-variant px-sm">No tienes métodos de pago guardados.</p>
              )}
              {payError && <p className="font-label-sm text-label-sm text-error px-sm">{payError}</p>}
              {!showNewPayment ? (
                <button onClick={() => { setShowNewPayment(true); setPayError('') }} className="w-full text-left font-label-lg text-label-lg text-primary hover:underline p-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  Agregar método de pago
                </button>
              ) : (
                <div className="border border-outline-variant/30 rounded-lg p-md space-y-sm">
                  <select value={newPay.type} onChange={e => setNewPay(p => ({ ...p, type: e.target.value, number: '', expiry: '', cvv: '' }))} className="input">
                    <option value="card">Tarjeta de crédito/débito</option>
                    <option value="paypal">PayPal</option>
                    <option value="transfer">Transferencia bancaria</option>
                    <option value="cash">Efectivo</option>
                  </select>
                  <input
                    placeholder="Etiqueta (ej: Visa personal)"
                    value={newPay.label}
                    onChange={e => setNewPay(p => ({ ...p, label: e.target.value }))}
                    className="input"
                  />
                  {newPay.type === 'card' && (
                    <>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">credit_card</span>
                        <input
                          placeholder="Número de tarjeta"
                          value={newPay.number}
                          onChange={e => setNewPay(p => ({ ...p, number: formatCardNumber(e.target.value) }))}
                          className="input pl-10"
                          maxLength={19}
                          inputMode="numeric"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-sm">
                        <input
                          placeholder="MM/AA"
                          value={newPay.expiry}
                          onChange={e => setNewPay(p => ({ ...p, expiry: formatExpiry(e.target.value) }))}
                          className="input"
                          maxLength={5}
                          inputMode="numeric"
                        />
                        <input
                          placeholder="CVV"
                          value={newPay.cvv}
                          onChange={e => setNewPay(p => ({ ...p, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                          className="input"
                          maxLength={4}
                          inputMode="numeric"
                          type="password"
                        />
                      </div>
                    </>
                  )}
                  {payError && <p className="font-label-sm text-label-sm text-error">{payError}</p>}
                  <div className="flex gap-sm">
                    <button onClick={() => { setShowNewPayment(false); setPayError('') }} className="border border-outline-variant text-on-surface-variant flex-1 py-xs rounded-lg font-label-lg hover:bg-surface-container transition-all">Cancelar</button>
                    <button onClick={addPayment} className="bg-primary text-on-primary flex-1 py-xs rounded-lg font-label-lg hover:opacity-90 transition-all">Guardar</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Order summary */}
        <div className="md:col-span-2">
          <div className="bg-surface-container-lowest rounded-lg p-lg border border-outline-variant/20 sticky top-24">
            <h2 className="font-headline-sm text-headline-sm text-on-surface mb-lg">Resumen del pedido</h2>
            <div className="space-y-sm font-body-md mb-lg max-h-48 overflow-y-auto pr-1">
              {cartItems.map(i => (
                <div key={i.id} className="flex gap-sm">
                  <div className="w-10 h-10 rounded bg-surface-container shrink-0 overflow-hidden">
                    {i.images?.[0]
                      ? <img src={imgUrl(i.images[0])} alt={i.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-surface-container" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-label-lg text-label-lg text-on-surface truncate">{i.title}</p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">x{i.quantity}</p>
                  </div>
                  <span className="font-label-lg text-on-surface shrink-0">${(i.effectivePrice * i.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-outline-variant/20 pt-md flex justify-between font-headline-sm text-headline-sm mb-lg">
              <span className="text-on-surface">Total</span>
              <span className="text-primary">${total.toLocaleString()}</span>
            </div>

            {/* Security note */}
            <div className="flex items-center gap-sm mb-lg bg-surface-container-low rounded-lg px-md py-sm">
              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">lock</span>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Pago seguro y encriptado</p>
            </div>

            <button
              onClick={placeOrder}
              disabled={placing || !selectedAddress || !selectedPayment || !cartItems.length}
              className="bg-primary text-on-primary w-full py-md rounded-lg font-label-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-sm"
            >
              {placing ? (
                <>
                  <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">shopping_cart_checkout</span>
                  Confirmar pedido
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
