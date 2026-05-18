/**
 * ═══════════════════════════════════════════════════════════════════════════
 * COMPONENTE: ASISTENTE DE MODA CON IA
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Chat flotante (FAB) con IA que ayuda a usuarios a encontrar prendas
 * y armar outfits. Se conecta a la API /api/ai/chat del backend.
 * 
 * CARACTERÍSTICAS:
 * - FAB en esquina inferior derecha (posición fija)
 * - Panel chat deslizable con 520px de altura
 * - Soporte para markdown básico (**negrita**)
 * - IDs de productos convertidos a links clicables
 * - Sugerencias iniciales (chips clicables)
 * - Typing indicator (animación de puntos)
 * - Scroll automático al último mensaje
 * 
 * ESTILOS:
 * - Tema: Material Design 3
 * - Responsive: 80-96vw en móvil
 * - Animaciones suaves
 * 
 * INTEGRACIÓN:
 * - API: POST /api/ai/chat con history de mensajes
 * - React Router: Navegación a /products/:id
 */

import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api, { imgUrl } from '../lib/api'

/**
 * Mensaje inicial del asistente
 * Se muestra cada vez que se abre una nueva conversación
 */
const INITIAL_MESSAGE = {
  role: 'assistant',
  content: '¡Hola! Soy **Stella AI**, tu estilista personal. Puedo recomendarte prendas del catálogo, armar outfits completos y darte consejos de moda. ¿Qué look buscas hoy? 👗',
}

/**
 * Renderiza texto con soporte para markdown básico
 * 
 * FORMATOS SOPORTADOS:
 * - **texto** → <strong>texto</strong> (negrita)
 * - ID:123 → Link clicable al producto (abre /products/123)
 * - \n → <br> (saltos de línea)
 * 
 * @param {Object} props
 * @param {string} props.text - Texto con markdown a renderizar
 * @param {Function} props.onProductClick - Callback cuando hace click en ID
 * 
 * @example
 * <RichText 
 *   text="Me gusta este **vestido azul** ID:456"
 *   onProductClick={(id) => navigate(`/products/${id}`)}
 * />
 * // Renderiza: Me gusta este <strong>vestido azul</strong> [Link a 456]
 */
function RichText({ text, onProductClick }) {
  // Regex: Divide el texto por:
  // - ID:\d+ → IDs de producto (ID:123, ID:456, etc)
  // - \*\*[^*]+\*\* → Texto entre ** para negrita
  const parts = text.split(/(ID:\d+|\*\*[^*]+\*\*)/g)
  
  return (
    <>
      {parts.map((part, i) => {
        // Detectar si es un ID de producto
        const idMatch = part.match(/^ID:(\d+)$/)
        if (idMatch) {
          return (
            <button
              key={i}
              onClick={() => onProductClick(idMatch[1])}
              className="inline-flex items-center gap-0.5 text-primary underline underline-offset-2 font-medium hover:opacity-80 transition-opacity"
              title={`Ver producto ${idMatch[1]}`}
            >
              <span className="material-symbols-outlined text-[13px]">open_in_new</span>
              Ver producto
            </button>
          )
        }
        
        // Detectar si es texto en negrita
        const boldMatch = part.match(/^\*\*([^*]+)\*\*$/)
        if (boldMatch) {
          return <strong key={i} className="font-semibold text-on-surface">{boldMatch[1]}</strong>
        }
        
        // Renderizar saltos de línea
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

/**
 * ASISTENTE DE MODA - Componente principal
 * 
 * Estado:
 * - open: Boolean - Panel está abierto o cerrado
 * - messages: Array<{role, content}> - Historial de chat
 * - suggestions: Array<string> - Sugerencias iniciales
 * - input: string - Texto del input
 * - loading: boolean - Esperando respuesta de IA
 * 
 * Refs:
 * - bottomRef: Auto-scroll al último mensaje
 * - inputRef: Foco automático cuando se abre
 */
export default function AIAssistant() {
  // ─── Estado del componente ──────────────────────────────────────────────
  const [open, setOpen] = useState(false)                    // Panel abierto/cerrado
  const [messages, setMessages] = useState([INITIAL_MESSAGE]) // Historial chat
  const [suggestions, setSuggestions] = useState([])         // Sugerencias iniciales
  const [input, setInput] = useState('')                     // Texto a enviar
  const [loading, setLoading] = useState(false)              // Esperando IA
  
  // ─── Referencias DOM ────────────────────────────────────────────────────
  const bottomRef = useRef(null)  // Scroll automático
  const inputRef = useRef(null)   // Foco en input

  /**
   * EFECTO: Cargar sugerencias iniciales
   * 
   * Se ejecuta una sola vez al montar el componente.
   * Intenta obtener sugerencias del backend.
   * Si falla, usa sugerencias por defecto (fallback).
   */
  useEffect(() => {
    api.get('/ai/suggestions')
      .then(r => setSuggestions(r.data))
      .catch(() => {
        // Fallback si la API falla
        setSuggestions(['¿Qué hay disponible?', 'Arma un outfit para mí', 'Busco menos de $500'])
      })
  }, [])

  /**
   * EFECTO: Auto-scroll al último mensaje
   * 
   * Ejecuta cada vez que llega un nuevo mensaje o cambia loading.
   * Hace scroll suave hacia el bottom del chat.
   */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  /**
   * EFECTO: Auto-foco en input cuando se abre el panel
   * 
   * Ejecuta solo cuando cambia `open`.
   * Pequeño delay (150ms) para que la animación termine primero.
   */
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150)
  }, [open])

  /**
   * Envía mensaje a la IA
   * 
   * FLUJO:
   * 1. Limpia y valida el texto
   * 2. Agrega mensaje del usuario al historial
   * 3. Llama a POST /api/ai/chat con últimos 10 mensajes
   * 4. Agrega respuesta de IA al historial
   * 5. Si falla, muestra mensaje de error
   * 
   * @param {string} text - Texto a enviar (usa input si no se proporciona)
   */
  const send = async (text) => {
    const content = (text || input).trim()
    if (!content || loading) return
    
    // Limpiar input y agregar mensaje del usuario
    setInput('')
    const userMsg = { role: 'user', content }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    
    try {
      // Enviar a backend con historial de conversación
      const { data } = await api.post('/ai/chat', {
        message: content,
        history: messages.slice(-10), // Últimos 10 mensajes para contexto
      })
      
      // Agregar respuesta de IA
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      // Error: mostrar mensaje de fallback
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Lo siento, hubo un problema al conectarme. Inténtalo de nuevo. 😕',
      }])
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handler del formulario (cuando usuario presiona Enter)
   */
  const handleSubmit = (e) => {
    e.preventDefault()
    send()
  }

  /**
   * Handler: Click en ID de producto
   * Navega a la página de detalles del producto
   */
  const handleProductClick = (productId) => {
    window.location.href = `/products/${productId}`
  }

  /**
   * Handler: Click en sugerencia rápida
   * Envía la sugerencia como si el usuario la hubiese escrito
   */
  const handleSuggestion = (s) => {
    send(s)
  }

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* FAB (Floating Action Button) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-secondary text-on-secondary rounded-full shadow-lg hover:opacity-90 transition-all hover:scale-105 flex items-center justify-center z-40 active:scale-95"
        aria-label={open ? 'Cerrar asistente' : 'Abrir asistente de moda'}
      >
        <span className="material-symbols-outlined text-[24px]">
          {open ? 'close' : 'smart_toy'}
        </span>
      </button>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Panel de Chat */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed bottom-24 right-6 w-80 sm:w-96 bg-surface-container-lowest rounded-xl shadow-2xl border border-outline-variant/20 z-40 flex flex-col"
          style={{ height: '520px' }} // Altura fija
        >
          {/* ─── HEADER ────────────────────────────────────────────────────── */}
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
            
            {/* Botón: Nueva conversación */}
            <button
              onClick={() => { setMessages([INITIAL_MESSAGE]); }}
              className="text-white/60 hover:text-white transition-colors p-1"
              title="Nueva conversación"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
            </button>
          </div>

          {/* ─── ÁREA DE MENSAJES ──────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-md space-y-md">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                
                {/* Avatar de IA (solo para mensajes de asistente) */}
                {m.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-secondary text-on-secondary flex items-center justify-center shrink-0 mr-xs mt-0.5">
                    <span className="material-symbols-outlined text-[12px]">smart_toy</span>
                  </div>
                )}
                
                {/* Burbuja del mensaje */}
                <div className={`max-w-[85%] px-md py-sm rounded-xl text-body-md leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-primary-container text-on-primary-container rounded-tr-none'  // Usuario: derecha
                    : 'bg-surface-container-low text-on-surface rounded-tl-none border border-outline-variant/10' // IA: izquierda
                }`}>
                  <RichText text={m.content} onProductClick={handleProductClick} />
                </div>
              </div>
            ))}

            {/* ─── TYPING INDICATOR (animación mientras IA responde) ────────── */}
            {loading && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-secondary text-on-secondary flex items-center justify-center shrink-0 mr-xs mt-0.5">
                  <span className="material-symbols-outlined text-[12px]">smart_toy</span>
                </div>
                <div className="bg-surface-container-low rounded-xl rounded-tl-none px-md py-sm border border-outline-variant/10">
                  <div className="flex gap-1 items-center h-4">
                    {/* Tres puntitos que rebotan */}
                    <span className="w-2 h-2 bg-outline rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-outline rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-outline rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            
            {/* Referencia para auto-scroll */}
            <div ref={bottomRef} />
          </div>

          {/* ─── SUGERENCIAS RÁPIDAS (solo al inicio) ──────────────────────── */}
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

          {/* ─── INPUT + BOTÓN ENVIAR ──────────────────────────────────────── */}
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
