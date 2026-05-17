import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import api, { imgUrl } from '../lib/api'
import { useAuth } from '../context/AuthContext'

export default function Negotiation() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [neg, setNeg] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [proposedPrice, setProposedPrice] = useState('')
  const [agreePrice, setAgreePrice] = useState('')
  const [showAgree, setShowAgree] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef()
  const socketRef = useRef()

  useEffect(() => {
    if (!user) { navigate('/'); return }
    api.get(`/negotiations/${id}`).then(({ data }) => {
      setNeg(data); setMessages(data.messages || [])
    }).catch(() => navigate('/profile?tab=negotiations'))
      .finally(() => setLoading(false))

    const socket = io('/', { path: '/socket.io' })
    socketRef.current = socket
    socket.emit('join-negotiation', id)
    socket.on('message', (msg) => setMessages(prev => [...prev, msg]))
    socket.on('prices-updated', (data) => {
      setNeg(prev => prev ? { 
        ...prev, 
        buyer_proposed_price: data.buyer_proposed_price,
        seller_proposed_price: data.seller_proposed_price
      } : prev)
    })
    socket.on('agreed', ({ price, expires_at }) => {
      setNeg(prev => prev ? { ...prev, status: 'agreed', agreed_price: price, expires_at } : prev)
    })
    socket.on('rejected', () => {
      setNeg(prev => prev ? { ...prev, status: 'rejected' } : prev)
    })
    return () => { socket.emit('leave-negotiation', id); socket.disconnect() }
  }, [id, user])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() && !proposedPrice) return
    
    if (proposedPrice) {
      // Si se propone un precio, enviarlo sin mensaje
      const payload = { message: null, proposed_price: Number(proposedPrice) }
      await api.post(`/negotiations/${id}/messages`, payload)
      setProposedPrice('')
    } else if (input.trim()) {
      // Si solo hay mensaje
      const payload = { message: input, proposed_price: null }
      await api.post(`/negotiations/${id}/messages`, payload)
      setInput('')
    }
  }

  const agree = async () => {
    const priceToAccept = agreePrice || latestOtherProposal;
    if (!priceToAccept || Number(priceToAccept) <= 0) return
    await api.post(`/negotiations/${id}/agree`, { price: Number(priceToAccept) })
    setShowAgree(false)
  }

  const reject = async () => {
    if (!confirm('¿Rechazar esta negociación?')) return
    await api.post(`/negotiations/${id}/reject`)
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
  if (!neg) return null

  const isBuyer = user?.id === neg.buyer_id
  const isSeller = user?.id === neg.seller_id
  const isOpen = neg.status === 'open'
  const buyerProposedPrice = neg.buyer_proposed_price
  const sellerProposedPrice = neg.seller_proposed_price
  const latestOtherProposal = isBuyer ? sellerProposedPrice : buyerProposedPrice

  return (
    <div className="max-w-2xl mx-auto">
      {/* Product header */}
      <div className="card p-4 mb-4 flex gap-4">
        <Link to={`/products/${neg.product_id}`} className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
          {neg.product_images?.[0] && (
              <img src={imgUrl(neg.product_images[0])} alt="" className="w-full h-full object-cover"
                onError={e => { e.target.style.display = 'none' }} />
            )}
        </Link>
        <div className="flex-1">
          <Link to={`/products/${neg.product_id}`} className="font-semibold hover:text-primary">{neg.product_title}</Link>
          <p className="text-sm text-gray-500">Precio original: <span className="font-medium">${Number(neg.original_price).toLocaleString()}</span></p>
           {neg.status === 'agreed' && (
             <div className="mt-1">
               <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                 ✓ Precio acordado: ${Number(neg.agreed_price).toLocaleString()} · expira {new Date(neg.expires_at).toLocaleDateString('es')}
               </span>
             </div>
           )}
           {isOpen && (buyerProposedPrice || sellerProposedPrice) && (
             <div className="mt-2 space-y-1">
               {buyerProposedPrice && (
                 <p className="text-xs text-gray-600">Comprador propone: <span className="font-semibold text-primary">${Number(buyerProposedPrice).toLocaleString()}</span></p>
               )}
               {sellerProposedPrice && (
                 <p className="text-xs text-gray-600">Vendedor propone: <span className="font-semibold text-primary">${Number(sellerProposedPrice).toLocaleString()}</span></p>
               )}
             </div>
           )}
          {neg.status === 'rejected' && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full mt-1 inline-block">Negociación rechazada</span>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-gray-400">{isBuyer ? 'Vendedor' : 'Comprador'}</p>
          <p className="font-medium text-sm">@{isBuyer ? neg.seller_username : neg.buyer_username}</p>
          <p className="text-xs text-gray-400 mt-1">{isSeller ? 'Tú vendes' : 'Tú compras'}</p>
        </div>
      </div>

      {/* Chat */}
      <div className="card flex flex-col" style={{ height: '500px' }}>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => {
            const isMe = msg.sender_id === user?.id
            return (
              <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                  {!isMe && <span className="text-xs text-gray-400 ml-1">@{msg.username}</span>}
                  <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-primary text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'}`}>
                    {msg.message && <p>{msg.message}</p>}
                    {msg.proposed_price && (
                      <div className={`mt-1 px-3 py-1.5 rounded-lg text-sm font-semibold ${isMe ? 'bg-white/20' : 'bg-primary-light text-primary'}`}>
                        💰 Precio propuesto: ${Number(msg.proposed_price).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 px-1">{new Date(msg.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            )
          })}
          {messages.length === 0 && (
            <div className="text-center text-gray-400 text-sm py-8">
              {isBuyer ? 'Inicia la conversación para negociar el precio' : 'El comprador aún no ha enviado mensajes'}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {isOpen ? (
          <div className="border-t p-4 space-y-3">
            {/* Current proposals - with explicit accept buttons */}
            {(buyerProposedPrice || sellerProposedPrice) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-gray-700 mb-2">Propuestas actuales:</p>
                {buyerProposedPrice && (
                  <div className="bg-white p-2 rounded border border-blue-200 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-600">Comprador propone:</p>
                      <p className="text-lg font-bold text-primary">${Number(buyerProposedPrice).toLocaleString()}</p>
                    </div>
                    {isSeller && !showAgree && (
                      <button 
                        onClick={() => { setAgreePrice(buyerProposedPrice); setShowAgree(true); }} 
                        className="btn-primary text-xs px-3 py-2 whitespace-nowrap"
                      >
                        ✓ Aceptar
                      </button>
                    )}
                  </div>
                )}
                {sellerProposedPrice && (
                  <div className="bg-white p-2 rounded border border-blue-200 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-600">Vendedor propone:</p>
                      <p className="text-lg font-bold text-primary">${Number(sellerProposedPrice).toLocaleString()}</p>
                    </div>
                    {isBuyer && !showAgree && (
                      <button 
                        onClick={() => { setAgreePrice(sellerProposedPrice); setShowAgree(true); }} 
                        className="btn-primary text-xs px-3 py-2 whitespace-nowrap"
                      >
                        ✓ Aceptar
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Confirmation dialog */}
            {showAgree && (
              <div className="bg-green-50 border border-green-300 rounded-lg p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-800">Confirmar aceptación:</p>
                <div className="bg-white p-4 rounded border-2 border-green-300 text-center">
                  <p className="text-gray-600 text-xs mb-1">Precio acordado:</p>
                  <p className="text-3xl font-bold text-primary">${Number(agreePrice).toLocaleString()}</p>
                </div>
                <div className="text-xs text-gray-600 bg-white p-2 rounded">
                  Ambos están de acuerdo con este precio y la compra se completará.
                </div>
                <div className="flex gap-2">
                  <button onClick={agree} className="btn-primary flex-1 py-2">✓ Confirmar y Acordar</button>
                  <button onClick={() => setShowAgree(false)} className="btn-ghost flex-1">Cancelar</button>
                </div>
              </div>
            )}

            {/* Propose new price */}
            {!showAgree && (
              <div className="space-y-2 border-t pt-3">
                <p className="text-xs font-semibold text-gray-700">Proponer precio:</p>
                <form onSubmit={sendMessage} className="flex gap-2">
                  <input 
                    type="number" 
                    value={proposedPrice} 
                    onChange={e => setProposedPrice(e.target.value)} 
                    placeholder="Mi propuesta" 
                    className="input text-sm flex-1" 
                  />
                  <button type="submit" className="btn-primary px-3 py-2" disabled={!proposedPrice}>
                    📤 Proponer
                  </button>
                </form>
              </div>
            )}

            {/* Messages */}
            {!showAgree && (
              <form onSubmit={sendMessage} className="border-t pt-3">
                <div className="flex gap-2">
                  <input 
                    value={input} 
                    onChange={e => setInput(e.target.value)} 
                    placeholder="Escribe un mensaje..." 
                    className="input flex-1 text-sm" 
                  />
                  <button type="submit" className="btn-primary px-3" disabled={!input.trim()}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  </button>
                </div>
              </form>
            )}

            {/* Reject button */}
            {!showAgree && (
              <div className="border-t pt-2 mt-2">
                <button onClick={reject} className="btn-ghost text-sm text-red-500 w-full">✕ Rechazar negociación</button>
              </div>
            )}
          </div>
        ) : (
          <div className="border-t p-4 text-center text-sm text-gray-500">
            {neg.status === 'agreed' ? (
              <div>
                <p className="mb-2">Precio acordado: <strong>${Number(neg.agreed_price).toLocaleString()}</strong></p>
                {isBuyer && <Link to="/cart" className="btn-primary">Ir al carrito</Link>}
                {isSeller && <p className="text-green-600 font-medium">El comprador tiene el precio en su carrito</p>}
              </div>
            ) : 'Negociación cerrada'}
          </div>
        )}
      </div>
    </div>
  )
}
