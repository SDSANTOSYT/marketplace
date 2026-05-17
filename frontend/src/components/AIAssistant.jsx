import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api, { imgUrl } from '../lib/api'

const INITIAL_MESSAGE = {
  role: 'assistant',
  content: '¡Hola! Soy **Stella AI**, tu estilista personal. Puedo recomendarte prendas del catálogo, armar outfits completos y darte consejos de moda. ¿Qué look buscas hoy? 👗',
}

/**
 * Renderiza texto con soporte básico de markdown:
 * **negrita**, ID:123 → link clicable al producto
 */
function RichText({ text, onProductClick }) {
  // Dividir por IDs de producto y texto en negrita
  const parts = text.split(/(ID:\d+|\*\*[^*]+\*\*)/g)
  return (
    <>
      {parts.map((part, i) => {
        const idMatch = part.match(/^ID:(\d+)$/)
        if (idMatch) {
          return (
            <button
              key={i}
              onClick={() => onProductClick(idMatch[1])}
              className="inline-flex items-center gap-0.5 text-primary underline underline-offset-2 font-medium hover:opacity-80 transition-opacity"
            >
              <span className="material-symbols-outlined text-[13px]">open_in_new</span>
              Ver producto
            </button>
          )
        }
        const boldMatch = part.match(/^\*\*([^*]+)\*\*$/)
        if (boldMatch) {
          return <strong key={i} className="font-semibold text-on-surface">{boldMatch[1]}</strong>
        }
        // Saltos de línea
        return part.split('\n').map((line, j) => (
          <span key={`${i}-${j}`}>
            {line}
            {j < part.split('\n').length - 1 && <br />}
          </span>
        ))
      })}
    </>
  )
}

export default function AIAssistant() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([INITIAL_MESSAGE])
  const [suggestions, setSuggestions] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // Cargar sugerencias iniciales
  useEffect(() => {
    api.get('/ai/suggestions').then(r => setSuggestions(r.data)).catch(() => {
      setSuggestions(['¿Qué hay disponible?', 'Arma un outfit para mí', 'Busco menos de $500'])
    })
  }, [])

  // Scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Foco en input cuando se abre
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150)
  }, [open])

  const send = async (text) => {
    const content = (text || input).trim()
    if (!content || loading) return
    setInput('')
    const userMsg = { role: 'user', content }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    try {
      const { data } = await api.post('/ai/chat', {
        message: content,
        history: messages.slice(-10),
      })
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Lo siento, hubo un problema al conectarme. Inténtalo de nuevo. 😕',
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    send()
  }

  const handleProductClick = (productId) => {
    window.location.href = `/products/${productId}`
  }

  const handleSuggestion = (s) => {
    send(s)
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-secondary text-on-secondary rounded-full shadow-lg hover:opacity-90 transition-all hover:scale-105 flex items-center justify-center z-40 active:scale-95"
        aria-label={open ? 'Cerrar asistente' : 'Abrir asistente de moda'}
      >
        <span className="material-symbols-outlined text-[24px]">
          {open ? 'close' : 'smart_toy'}
        </span>
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-24 right-6 w-80 sm:w-96 bg-surface-container-lowest rounded-xl shadow-2xl border border-outline-variant/20 z-40 flex flex-col"
          style={{ height: '520px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-sm p-md border-b border-outline-variant/20 bg-secondary text-on-secondary rounded-t-xl shrink-0">
            <div className="flex items-center gap-sm">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">smart_toy</span>
              </div>
              <div>
                <p className="font-label-lg text-label-lg leading-tight">Stella AI</p>
                <p className="text-[11px] opacity-80 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" />
                  Tu estilista personal
                </p>
              </div>
            </div>
            <button
              onClick={() => { setMessages([INITIAL_MESSAGE]); }}
              className="text-white/60 hover:text-white transition-colors p-1"
              title="Nueva conversación"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-md space-y-md">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-secondary text-on-secondary flex items-center justify-center shrink-0 mr-xs mt-0.5">
                    <span className="material-symbols-outlined text-[12px]">smart_toy</span>
                  </div>
                )}
                <div className={`max-w-[85%] px-md py-sm rounded-xl text-body-md leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-primary-container text-on-primary-container rounded-tr-none'
                    : 'bg-surface-container-low text-on-surface rounded-tl-none border border-outline-variant/10'
                }`}>
                  <RichText text={m.content} onProductClick={handleProductClick} />
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-secondary text-on-secondary flex items-center justify-center shrink-0 mr-xs mt-0.5">
                  <span className="material-symbols-outlined text-[12px]">smart_toy</span>
                </div>
                <div className="bg-surface-container-low rounded-xl rounded-tl-none px-md py-sm border border-outline-variant/10">
                  <div className="flex gap-1 items-center h-4">
                    <span className="w-2 h-2 bg-outline rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-outline rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-outline rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick suggestion chips (solo al inicio) */}
          {messages.length === 1 && suggestions.length > 0 && (
            <div className="px-md pb-sm flex flex-wrap gap-xs shrink-0">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestion(s)}
                  disabled={loading}
                  className="bg-secondary-fixed text-secondary px-sm py-xs rounded-full font-label-sm text-label-sm hover:bg-secondary hover:text-on-secondary transition-colors active:scale-95 disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-md border-t border-outline-variant/20 flex gap-sm bg-surface-container-lowest rounded-b-xl shrink-0">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="¿Qué look buscas hoy?"
              className="input flex-1 text-sm"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-secondary text-on-secondary rounded-full p-2 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]">send</span>
            </button>
          </form>
        </div>
      )}
    </>
  )
}
