import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import api, { imgUrl, formatPrice } from '../lib/api'
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

    const socket = io(import.meta.env.VITE_API_URL, { path: '/socket.io' })
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
  const counterpartName = isBuyer ? neg.seller_username : neg.buyer_username

  return (
    <div className="max-w-[1440px] mx-auto px-margin-desktop py-lg">
      <div className="flex flex-col md:flex-row gap-lg h-[calc(100vh-140px)]">
        {/* LEFT: Chat window */}
        <div className="flex-grow flex flex-col bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-sm overflow-hidden">
          {/* Chat Header */}
          <div className="flex items-center justify-between px-lg py-md border-b border-outline-variant/20">
            <div className="flex items-center gap-md">
              <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-sm shrink-0">
                {counterpartName?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-label-lg text-label-lg text-on-surface">@{counterpartName}</p>
                <p className="font-label-sm text-label-sm text-on-surface-variant">{isBuyer ? 'Vendedor' : 'Comprador'}</p>
              </div>
            </div>
            <Link to={`/products/${neg.product_id}`} className="font-label-sm text-label-sm text-primary hover:underline">
              Ver producto
            </Link>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-lg space-y-lg bg-surface-container-low/30">
            {messages.map((msg, i) => {
              const isMe = msg.sender_id === user?.id
              return (
                <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                    {!isMe && <span className="font-label-sm text-label-sm text-on-surface-variant ml-1">@{msg.username}</span>}
                    <div className={`px-md py-sm rounded-xl font-body-md ${
                      isMe
                        ? 'bg-primary-container text-on-primary-container rounded-tr-none'
                        : 'bg-white text-on-surface rounded-tl-none shadow-sm border border-outline-variant/20'
                    }`}>
                      {msg.message && <p>{msg.message}</p>}
                      {msg.proposed_price && (
                        <div className={`mt-1 px-sm py-1 rounded-lg font-label-lg flex items-center gap-1 ${isMe ? 'bg-white/20' : 'bg-primary-fixed text-on-primary-fixed'}`}>
                          <span className="material-symbols-outlined text-[16px]">payments</span>
                          Precio propuesto: ${formatPrice(msg.proposed_price)}
                        </div>
                      )}
                    </div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant px-1">
                      {new Date(msg.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              )
            })}
            {messages.length === 0 && (
              <div className="text-center font-body-md text-on-surface-variant py-8">
                {isBuyer ? 'Inicia la conversación para negociar el precio' : 'El comprador aún no ha enviado mensajes'}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          {isOpen ? (
            <div className="bg-surface-container-lowest border-t border-outline-variant/20 p-md space-y-md">
              {/* Current proposals */}
              {(buyerProposedPrice || sellerProposedPrice) && (
                <div className="bg-primary-fixed/30 border border-primary/20 rounded-lg p-md space-y-sm">
                  <p className="font-label-lg text-label-lg text-on-surface">Propuestas actuales:</p>
                  {buyerProposedPrice && (
                    <div className="bg-white p-sm rounded-lg border border-outline-variant/20 flex justify-between items-center">
                      <div>
                        <p className="font-label-sm text-label-sm text-on-surface-variant">Comprador propone:</p>
                        <p className="font-headline-sm text-headline-sm text-primary">${formatPrice(buyerProposedPrice)}</p>
                      </div>
                      {isSeller && !showAgree && (
                        <button onClick={() => { setAgreePrice(buyerProposedPrice); setShowAgree(true); }}
                          className="bg-primary text-on-primary px-md py-xs rounded-lg font-label-lg text-label-lg hover:opacity-90 active:scale-95 transition-all whitespace-nowrap">
                          Aceptar
                        </button>
                      )}
                    </div>
                  )}
                  {sellerProposedPrice && (
                    <div className="bg-white p-sm rounded-lg border border-outline-variant/20 flex justify-between items-center">
                      <div>
                        <p className="font-label-sm text-label-sm text-on-surface-variant">Vendedor propone:</p>
                        <p className="font-headline-sm text-headline-sm text-primary">${formatPrice(sellerProposedPrice)}</p>
                      </div>
                      {isBuyer && !showAgree && (
                        <button onClick={() => { setAgreePrice(sellerProposedPrice); setShowAgree(true); }}
                          className="bg-primary text-on-primary px-md py-xs rounded-lg font-label-lg text-label-lg hover:opacity-90 active:scale-95 transition-all whitespace-nowrap">
                          Aceptar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Confirmation dialog */}
              {showAgree && (
                <div className="bg-surface-container-low border-2 border-primary/20 rounded-lg p-md space-y-md">
                  <p className="font-label-lg text-label-lg text-on-surface">Confirmar aceptación:</p>
                  <div className="bg-white p-md rounded-lg border-2 border-primary/20 text-center">
                    <p className="font-label-sm text-label-sm text-on-surface-variant mb-1">Precio acordado:</p>
                    <p className="font-display-lg text-display-lg text-primary">${formatPrice(agreePrice)}</p>
                  </div>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">Ambos están de acuerdo con este precio y la compra se completará.</p>
                  <div className="flex gap-sm">
                    <button onClick={agree} className="bg-primary text-on-primary flex-1 py-sm rounded-lg font-label-lg hover:opacity-90 active:scale-95 transition-all">Confirmar y Acordar</button>
                    <button onClick={() => setShowAgree(false)} className="border border-outline-variant text-on-surface-variant flex-1 py-sm rounded-lg font-label-lg hover:bg-surface-container transition-all">Cancelar</button>
                  </div>
                </div>
              )}

              {/* Propose new price */}
              {!showAgree && (
                <div className="space-y-xs">
                  <p className="font-label-sm text-label-sm text-on-surface-variant">Proponer precio:</p>
                  <form onSubmit={sendMessage} className="flex gap-sm">
                    <input type="number" value={proposedPrice} onChange={e => setProposedPrice(e.target.value)}
                      placeholder="Mi propuesta" className="input flex-1" />
                    <button type="submit" className="bg-secondary text-on-secondary px-md py-sm rounded-lg font-label-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-50" disabled={!proposedPrice}>
                      Proponer
                    </button>
                  </form>
                </div>
              )}

              {/* Messages input */}
              {!showAgree && (
                <form onSubmit={sendMessage} className="flex gap-sm">
                  <input value={input} onChange={e => setInput(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    className="pl-lg pr-4 py-sm bg-surface-container-low border border-outline-variant/30 rounded-full flex-1 font-body-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" />
                  <button type="submit" className="bg-primary text-on-primary rounded-full p-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50" disabled={!input.trim()}>
                    <span className="material-symbols-outlined text-[20px]">send</span>
                  </button>
                </form>
              )}

              {!showAgree && (
                <div className="border-t border-outline-variant/20 pt-sm">
                  <button onClick={reject} className="w-full font-label-lg text-label-lg text-error hover:bg-error-container transition-colors py-sm rounded-lg">
                    Rechazar negociación
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="border-t border-outline-variant/20 p-md text-center">
              {neg.status === 'agreed' ? (
                <div>
                  <p className="font-body-md text-on-surface mb-sm">Precio acordado: <strong className="text-primary">${formatPrice(neg.agreed_price)}</strong></p>
                  {isBuyer && <Link to="/cart" className="bg-primary text-on-primary px-lg py-sm rounded-lg font-label-lg hover:opacity-90 transition-all inline-block">Ir al carrito</Link>}
                  {isSeller && <p className="font-body-md text-on-surface-variant">El comprador tiene el precio en su carrito</p>}
                </div>
              ) : <p className="font-body-md text-on-surface-variant">Negociación cerrada</p>}
            </div>
          )}
        </div>

        {/* RIGHT sidebar */}
        <div className="w-full md:w-[380px] shrink-0 flex flex-col gap-lg">
          {/* Product card */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 overflow-hidden">
            <Link to={`/products/${neg.product_id}`} className="block h-48 overflow-hidden bg-surface-container">
              {neg.product_images?.[0] && (
                <img src={imgUrl(neg.product_images[0])} alt="" className="w-full h-full object-cover"
                  onError={e => { e.target.style.display = 'none' }} />
              )}
            </Link>
            <div className="p-md">
              <Link to={`/products/${neg.product_id}`} className="font-label-lg text-label-lg text-on-surface hover:text-primary transition-colors block mb-xs">{neg.product_title}</Link>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Precio original: <span className="font-label-lg text-on-surface">${formatPrice(neg.original_price)}</span></p>
              {neg.status === 'agreed' && (
                <span className="inline-block mt-sm bg-primary-fixed text-on-primary-fixed px-sm py-1 rounded-full font-label-sm text-label-sm">
                  Acordado: ${formatPrice(neg.agreed_price)} · expira {new Date(neg.expires_at).toLocaleDateString('es')}
                </span>
              )}
              {neg.status === 'rejected' && (
                <span className="inline-block mt-sm bg-error-container text-on-error-container px-sm py-1 rounded-full font-label-sm text-label-sm">Negociación rechazada</span>
              )}
            </div>
          </div>

          {/* Offer card */}
          {isOpen && (buyerProposedPrice || sellerProposedPrice) && (
            <div className="bg-white rounded-xl border-2 border-primary/20 p-lg">
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-sm">OFERTA ACTUAL</p>
              {buyerProposedPrice && (
                <div className="mb-sm">
                  <p className="font-label-sm text-label-sm text-on-surface-variant">Comprador</p>
                  <p className="font-display-lg text-display-lg text-primary">${formatPrice(buyerProposedPrice)}</p>
                </div>
              )}
              {sellerProposedPrice && (
                <div>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">Vendedor</p>
                  <p className="font-display-lg text-display-lg text-secondary">${formatPrice(sellerProposedPrice)}</p>
                </div>
              )}
              <span className="inline-block mt-md bg-surface-container text-on-surface-variant px-sm py-1 rounded-full font-label-sm text-label-sm">Negociando</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
