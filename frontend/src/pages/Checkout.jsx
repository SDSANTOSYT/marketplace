import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'

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
  const [showNewAddress, setShowNewAddress] = useState(false)
  const [showNewPayment, setShowNewPayment] = useState(false)
  const [newAddr, setNewAddr] = useState({ name: '', phone: '', address: '' })
  const [newPay, setNewPay] = useState({ type: 'card', label: '', number: '', expiry: '', cvv: '' })

  useEffect(() => {
    if (!user) { navigate('/'); return }
    Promise.all([api.get('/users/me/addresses'), api.get('/users/me/payments'), api.get('/cart')]).then(([a, p, c]) => {
      setAddresses(a.data); setPayments(p.data); setCartItems(c.data)
      if (a.data[0]) setSelectedAddress(a.data[0].id)
      if (p.data[0]) setSelectedPayment(p.data[0].id)
    }).finally(() => setLoading(false))
  }, [user])

  const addAddress = async () => {
    const { data } = await api.post('/users/me/addresses', newAddr)
    setAddresses(prev => [...prev, data]); setSelectedAddress(data.id); setShowNewAddress(false); setNewAddr({ name: '', phone: '', address: '' })
  }

  const addPayment = async () => {
    const { data } = await api.post('/users/me/payments', { type: newPay.type, label: newPay.label || `${newPay.type} ****${newPay.number.slice(-4)}`, data: { number: newPay.number, expiry: newPay.expiry } })
    setPayments(prev => [...prev, data]); setSelectedPayment(data.id); setShowNewPayment(false)
  }

  const placeOrder = async () => {
    if (!selectedAddress || !selectedPayment) return alert('Selecciona dirección y método de pago')
    setPlacing(true)
    try {
      const { data } = await api.post('/orders', { address_id: selectedAddress, payment_id: selectedPayment })
      navigate(`/profile?tab=orders&order=${data.id}`)
    } catch (e) { alert(e.response?.data?.error || 'Error al realizar el pedido') }
    finally { setPlacing(false) }
  }

  const total = cartItems.reduce((s, i) => s + i.effectivePrice * i.quantity, 0)

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Finalizar compra</h1>
      <div className="grid md:grid-cols-5 gap-6">
        <div className="md:col-span-3 space-y-6">
          {/* Shipping address */}
          <div className="card p-5">
            <h2 className="font-semibold mb-4">Dirección de envío</h2>
            <div className="space-y-2">
              {addresses.map(a => (
                <label key={a.id} className={`flex gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${selectedAddress == a.id ? 'border-primary bg-primary-light' : 'hover:border-gray-300'}`}>
                  <input type="radio" name="address" value={a.id} checked={selectedAddress == a.id} onChange={() => setSelectedAddress(a.id)} className="mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{a.name}</p>
                    <p className="text-xs text-gray-500">{a.phone} · {a.address}</p>
                  </div>
                </label>
              ))}
              {!showNewAddress ? (
                <button onClick={() => setShowNewAddress(true)} className="w-full text-left text-sm text-primary hover:underline p-2">+ Agregar nueva dirección</button>
              ) : (
                <div className="border rounded-lg p-3 space-y-2">
                  <input placeholder="Nombre completo" value={newAddr.name} onChange={e => setNewAddr(p => ({ ...p, name: e.target.value }))} className="input text-sm" />
                  <input placeholder="Teléfono" value={newAddr.phone} onChange={e => setNewAddr(p => ({ ...p, phone: e.target.value }))} className="input text-sm" />
                  <input placeholder="Dirección completa" value={newAddr.address} onChange={e => setNewAddr(p => ({ ...p, address: e.target.value }))} className="input text-sm" />
                  <div className="flex gap-2">
                    <button onClick={() => setShowNewAddress(false)} className="btn-ghost text-sm flex-1">Cancelar</button>
                    <button onClick={addAddress} className="btn-primary text-sm flex-1">Guardar</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment */}
          <div className="card p-5">
            <h2 className="font-semibold mb-4">Método de pago</h2>
            <div className="space-y-2">
              {payments.map(p => (
                <label key={p.id} className={`flex gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${selectedPayment == p.id ? 'border-primary bg-primary-light' : 'hover:border-gray-300'}`}>
                  <input type="radio" name="payment" value={p.id} checked={selectedPayment == p.id} onChange={() => setSelectedPayment(p.id)} className="mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{p.label}</p>
                    <p className="text-xs text-gray-500 capitalize">{p.type}</p>
                  </div>
                </label>
              ))}
              {!showNewPayment ? (
                <button onClick={() => setShowNewPayment(true)} className="w-full text-left text-sm text-primary hover:underline p-2">+ Agregar método de pago</button>
              ) : (
                <div className="border rounded-lg p-3 space-y-2">
                  <select value={newPay.type} onChange={e => setNewPay(p => ({ ...p, type: e.target.value }))} className="input text-sm">
                    <option value="card">Tarjeta de crédito/débito</option>
                    <option value="paypal">PayPal</option>
                    <option value="transfer">Transferencia bancaria</option>
                    <option value="cash">Efectivo</option>
                  </select>
                  <input placeholder="Etiqueta (ej: Visa personal)" value={newPay.label} onChange={e => setNewPay(p => ({ ...p, label: e.target.value }))} className="input text-sm" />
                  {newPay.type === 'card' && <>
                    <input placeholder="Número de tarjeta" value={newPay.number} onChange={e => setNewPay(p => ({ ...p, number: e.target.value }))} className="input text-sm" maxLength={16} />
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="MM/AA" value={newPay.expiry} onChange={e => setNewPay(p => ({ ...p, expiry: e.target.value }))} className="input text-sm" />
                      <input placeholder="CVV" value={newPay.cvv} onChange={e => setNewPay(p => ({ ...p, cvv: e.target.value }))} className="input text-sm" maxLength={4} />
                    </div>
                  </>}
                  <div className="flex gap-2">
                    <button onClick={() => setShowNewPayment(false)} className="btn-ghost text-sm flex-1">Cancelar</button>
                    <button onClick={addPayment} className="btn-primary text-sm flex-1">Guardar</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Order summary */}
        <div className="md:col-span-2">
          <div className="card p-5 sticky top-20">
            <h2 className="font-semibold mb-4">Resumen del pedido</h2>
            <div className="space-y-2 text-sm mb-4">
              {cartItems.map(i => (
                <div key={i.id} className="flex justify-between">
                  <span className="text-gray-600 truncate flex-1 mr-2">{i.title} x{i.quantity}</span>
                  <span className="font-medium shrink-0">${(i.effectivePrice * i.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-primary">${total.toLocaleString()}</span>
            </div>
            <button onClick={placeOrder} disabled={placing || !selectedAddress || !selectedPayment}
              className="btn-primary w-full py-3 mt-4 text-base">
              {placing ? 'Procesando...' : 'Confirmar pedido'}
            </button>
            <p className="text-xs text-gray-400 text-center mt-2">Al confirmar, aceptas los términos de la plataforma</p>
          </div>
        </div>
      </div>
    </div>
  )
}
