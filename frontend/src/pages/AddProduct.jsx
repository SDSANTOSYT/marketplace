import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api, { imgUrl } from '../lib/api'
import { useAuth } from '../context/AuthContext'

// Categorías canónicas — sin duplicados
const CATEGORIES = ['Parte superior', 'Suéter', 'Pantalón', 'Calzado', 'Accesorio', 'Vestido', 'Abrigo']
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
    <div className="max-w-2xl mx-auto px-margin-desktop py-xl">
      <h1 className="font-headline-md text-headline-md text-on-surface mb-xl">{isEdit ? 'Editar producto' : 'Publicar producto'}</h1>
      {error && <p className="mb-lg font-body-md text-error bg-error-container px-md py-sm rounded-lg">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-lg">
        {/* Images */}
        <div className="card p-xl">
          <label className="font-label-lg text-label-lg text-on-surface block mb-md">Imágenes *</label>
          <div className="border-2 border-dashed border-outline-variant rounded-lg p-md">
            <div className="flex gap-md flex-wrap">
              {keptExistingImages.map((img, i) => (
                <div key={`existing-${i}`} className="relative w-20 h-20 rounded-lg overflow-hidden border border-outline-variant/30">
                  <img src={imgUrl(img)} className="w-full h-full object-cover" alt="" />
                  <button type="button" onClick={() => setKeptExistingImages(prev => prev.filter(x => x !== img))}
                    className="absolute top-0 right-0 bg-error text-on-error w-6 h-6 flex items-center justify-center rounded-bl-lg opacity-0 hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              ))}
              {previews.map((url, i) => (
                <div key={`new-${i}`} className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-primary">
                  <img src={url} className="w-full h-full object-cover" alt="" />
                  <button type="button" onClick={() => setFiles(prev => { prev.splice(i, 1); return [...prev] })}
                    className="absolute top-0 right-0 bg-error text-on-error w-6 h-6 flex items-center justify-center rounded-bl-lg opacity-0 hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => fileRef.current.click()}
                className="w-20 h-20 rounded-lg border-2 border-dashed border-outline-variant flex items-center justify-center text-on-surface-variant hover:border-primary hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
              </button>
            </div>
          </div>
          <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={e => setFiles(prev => [...prev, ...Array.from(e.target.files)])} />
          <p className="font-label-sm text-label-sm text-on-surface-variant mt-sm">Mínimo 1 imagen. Máx 5MB por imagen.</p>
        </div>

        {/* Basic info */}
        <div className="card p-xl space-y-md">
          <div>
            <label className="font-label-lg text-label-lg text-on-surface block mb-xs">Título *</label>
            <input className="input" required value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ej: Camiseta vintage azul marca X" />
          </div>
          <div>
            <label className="font-label-lg text-label-lg text-on-surface block mb-xs">Descripción</label>
            <textarea className="input min-h-[80px] resize-y" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe el estado, materiales, medidas específicas..." />
          </div>
          <div className="grid grid-cols-2 gap-md">
            <div>
              <label className="font-label-lg text-label-lg text-on-surface block mb-xs">Precio *</label>
              <input className="input" type="number" required min="0" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} />
            </div>
            <div>
              <label className="font-label-lg text-label-lg text-on-surface block mb-xs">Cantidad *</label>
              <input className="input" type="number" required min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-md">
            <div>
              <label className="font-label-lg text-label-lg text-on-surface block mb-xs">Categoría *</label>
              <select className="input" required value={form.category} onChange={e => set('category', e.target.value)}>
                <option value="">Seleccionar...</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="font-label-lg text-label-lg text-on-surface block mb-xs">Estado *</label>
              <select className="input" value={form.condition} onChange={e => set('condition', e.target.value)}>
                <option value="new">Nuevo</option>
                <option value="used">Usado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sizes */}
        <div className="card p-xl">
          <label className="font-label-lg text-label-lg text-on-surface block mb-md">Tallas disponibles</label>
          <div className="flex flex-wrap gap-sm">
            {SIZES.map(s => (
              <button type="button" key={s} onClick={() => toggleArr('sizes', s)}
                className={`px-md py-xs border rounded-lg font-label-lg text-label-lg transition-colors ${
                  form.sizes.includes(s) ? 'border-2 border-secondary bg-secondary-fixed text-secondary' : 'border-outline-variant text-on-surface-variant hover:border-outline'
                }`}>{s}</button>
            ))}
          </div>
        </div>

        {/* Colors */}
        <div className="card p-xl">
          <label className="font-label-lg text-label-lg text-on-surface block mb-md">Colores/Variantes</label>
          <div className="flex flex-wrap gap-sm">
            {COLORS.map(c => (
              <button type="button" key={c} onClick={() => toggleArr('colors', c)}
                className={`px-md py-xs border rounded-lg font-label-lg text-label-lg transition-colors ${
                  form.colors.includes(c) ? 'border-2 border-secondary bg-secondary-fixed text-secondary' : 'border-outline-variant text-on-surface-variant hover:border-outline'
                }`}>{c}</button>
            ))}
          </div>
        </div>

        <div className="flex gap-md">
          <button type="button" onClick={() => navigate(-1)} className="border border-outline-variant text-on-surface-variant flex-1 py-sm rounded-lg font-label-lg hover:bg-surface-container transition-all">Cancelar</button>
          <button type="submit" className="bg-primary text-on-primary flex-1 py-md rounded-lg font-label-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-50" disabled={loading}>
            {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Publicar producto'}
          </button>
        </div>
      </form>
    </div>
  )
}
