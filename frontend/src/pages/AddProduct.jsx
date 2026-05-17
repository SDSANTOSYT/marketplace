import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api, { imgUrl } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const CATEGORIES = ['Parte superior','Suéter','Parte inferior','Pantalón','Calzado','Accesorio','Vestido','Abrigo']
const SIZES = ['XS','S','M','L','XL','XXL','Único','35','36','37','38','39','40','41','42','43','44']
const COLORS = ['Negro','Blanco','Gris','Azul','Rojo','Verde','Amarillo','Rosa','Morado','Naranja','Beige','Café','Multicolor']

export default function AddProduct() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id
  const fileRef = useRef()

  const [form, setForm] = useState({ title: '', description: '', price: '', quantity: '1', category: '', condition: 'new', sizes: [], colors: [] })
  const [files, setFiles] = useState([])
  const [existingImages, setExistingImages] = useState([])
  const [keptExistingImages, setKeptExistingImages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const toggleArr = (k, val) => setForm(f => ({
    ...f, [k]: f[k].includes(val) ? f[k].filter(x => x !== val) : [...f[k], val]
  }))

  useEffect(() => {
    if (!user) { navigate('/'); return }
    if (isEdit) {
      api.get(`/products/${id}`).then(({ data }) => {
        setForm({ title: data.title, description: data.description || '', price: data.price, quantity: data.quantity, category: data.category, condition: data.condition, sizes: data.sizes || [], colors: data.colors || [] })
        setExistingImages(data.images || [])
        setKeptExistingImages(data.images || [])
      })
    }
  }, [user, id])

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => {
        if (Array.isArray(v)) fd.append(k, JSON.stringify(v))
        else fd.append(k, v)
      })
      files.forEach(f => fd.append('images', f))
      
      // Si estamos editando, enviar las imágenes que mantener
      if (isEdit) {
        fd.append('keepImages', JSON.stringify(keptExistingImages))
        await api.put(`/products/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        navigate(`/products/${id}`)
      } else {
        const { data } = await api.post('/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        navigate(`/products/${data.id}`)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar producto')
    } finally { setLoading(false) }
  }

  const previews = files.map(f => URL.createObjectURL(f))

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{isEdit ? 'Editar producto' : 'Publicar producto'}</h1>
      {error && <p className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Images */}
        <div className="card p-5">
          <label className="text-sm font-medium block mb-3">Imágenes *</label>
          <div className="flex gap-3 flex-wrap">
            {keptExistingImages.map((img, i) => (
              <div key={`existing-${i}`} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                <img src={imgUrl(img)} className="w-full h-full object-cover" alt="" />
                <button type="button" onClick={() => setKeptExistingImages(prev => prev.filter(x => x !== img))}
                  className="absolute top-0 right-0 bg-red-500 text-white w-6 h-6 flex items-center justify-center rounded-bl-lg opacity-0 hover:opacity-100 transition-opacity">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            {previews.map((url, i) => (
              <div key={`new-${i}`} className="relative w-20 h-20 rounded-lg overflow-hidden border border-primary">
                <img src={url} className="w-full h-full object-cover" alt="" />
                <button type="button" onClick={() => setFiles(prev => { prev.splice(i, 1); return [...prev] })}
                  className="absolute top-0 right-0 bg-red-500 text-white w-6 h-6 flex items-center justify-center rounded-bl-lg opacity-0 hover:opacity-100 transition-opacity">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            <button type="button" onClick={() => fileRef.current.click()}
              className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-primary hover:text-primary transition-colors">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={e => setFiles(prev => [...prev, ...Array.from(e.target.files)])} />
          <p className="text-xs text-gray-400 mt-2">Mínimo 1 imagen. Máx 5MB por imagen.</p>
        </div>

        {/* Basic info */}
        <div className="card p-5 space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Título *</label>
            <input className="input" required value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ej: Camiseta vintage azul marca X" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Descripción</label>
            <textarea className="input min-h-[80px] resize-y" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe el estado, materiales, medidas específicas..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Precio *</label>
              <input className="input" type="number" required min="0" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Cantidad *</label>
              <input className="input" type="number" required min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Categoría *</label>
              <select className="input" required value={form.category} onChange={e => set('category', e.target.value)}>
                <option value="">Seleccionar...</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Estado *</label>
              <select className="input" value={form.condition} onChange={e => set('condition', e.target.value)}>
                <option value="new">Nuevo</option>
                <option value="used">Usado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sizes */}
        <div className="card p-5">
          <label className="text-sm font-medium block mb-3">Tallas disponibles</label>
          <div className="flex flex-wrap gap-2">
            {SIZES.map(s => (
              <button type="button" key={s} onClick={() => toggleArr('sizes', s)}
                className={`px-3 py-1.5 border rounded-lg text-sm font-medium transition-colors ${form.sizes.includes(s) ? 'border-primary bg-primary-light text-primary' : 'hover:border-gray-400'}`}>{s}</button>
            ))}
          </div>
        </div>

        {/* Colors */}
        <div className="card p-5">
          <label className="text-sm font-medium block mb-3">Colores/Variantes</label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map(c => (
              <button type="button" key={c} onClick={() => toggleArr('colors', c)}
                className={`px-3 py-1.5 border rounded-lg text-sm font-medium transition-colors ${form.colors.includes(c) ? 'border-primary bg-primary-light text-primary' : 'hover:border-gray-400'}`}>{c}</button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-ghost flex-1">Cancelar</button>
          <button type="submit" className="btn-primary flex-1 py-3" disabled={loading}>
            {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Publicar producto'}
          </button>
        </div>
      </form>
    </div>
  )
}
