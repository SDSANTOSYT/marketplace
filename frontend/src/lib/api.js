import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) {
    localStorage.removeItem('token')
    window.location.href = '/'
  }
  return Promise.reject(err)
})

export const imgUrl = (path) => {
  if (!path) return null
  const normalized = path.replace(/\\/g, '/')
  return normalized.startsWith('/') ? normalized : `/${normalized}`
}

/**
 * Formatea un precio numérico sin imprecisiones de punto flotante.
 * Ejemplo: 24999.9999... → "25,000"
 */
export const formatPrice = (price) => {
  if (price == null || price === '') return '0'
  const rounded = Math.round(Number(price) * 100) / 100
  return rounded.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

/**
 * Parsea una fecha devuelta por SQLite (formato "YYYY-MM-DD HH:MM:SS")
 * de forma robusta en todos los navegadores.
 */
export const parseDate = (dateStr) => {
  if (!dateStr) return null
  // SQLite devuelve "2024-01-15 10:30:00" — reemplazar espacio por T para ISO 8601
  const iso = String(dateStr).trim().replace(' ', 'T')
  const d = new Date(iso)
  return isNaN(d.getTime()) ? null : d
}

/**
 * Formatea una fecha SQLite como texto localizado en español.
 * Devuelve "Fecha no disponible" si la fecha es inválida.
 */
export const fmtDate = (dateStr, opts = {}) => {
  const d = parseDate(dateStr)
  if (!d) return 'Fecha no disponible'
  return d.toLocaleDateString('es', {
    day: 'numeric', month: 'short', year: 'numeric',
    ...opts,
  })
}

export default api
