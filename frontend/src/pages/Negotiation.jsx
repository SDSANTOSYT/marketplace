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
    const payload = { message: input || null, proposed_price: proposedPrice ? Number(proposedPrice) : null }
    await api.post(`/negotiations/${id}/messages`, payload)
    setInput(''); setProposedPrice('')
  }

  const agree = async () => {
    if (!agreePrice || Number(agreePrice) <= 0) return
    await api.post(`/negotiations/${id}/agree`, { price: Number(agreePrice) })
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
            {showAgree ? (
              <div className="flex gap-2">
                <input type="number" placeholder="Precio acordado" value={agreePrice} onChange={e => setAgreePrice(e.target.value)} className="input flex-1" />
                <button onClick={agree} className="btn-primary">Aceptar</button>
                <button onClick={() => setShowAgree(false)} className="btn-ghost">✕</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setShowAgree(true)} className="btn-outline text-sm">✓ Acordar precio</button>
                <button onClick={reject} className="btn-ghost text-sm text-red-500">✕ Rechazar</button>
              </div>
            )}
            <form onSubmit={sendMessage} className="space-y-2">
              <div className="flex gap-2">
                <input value={input} onChange={e => setInput(e.target.value)} placeholder="Escribe un mensaje..." className="input flex-1 text-sm" />
                <button type="submit" className="btn-primary px-3" disabled={!input.trim() && !proposedPrice}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                </button>
              </div>
              <div className="flex gap-2 items-center">
                <span className="text-xs text-gray-500 shrink-0">Proponer precio:</span>
                <input type="number" value={proposedPrice} onChange={e => setProposedPrice(e.target.value)} placeholder="$0.00" className="input text-sm flex-1" />
              </div>
            </form>
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
