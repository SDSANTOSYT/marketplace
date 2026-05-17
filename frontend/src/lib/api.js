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

export default api
