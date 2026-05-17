import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api, { imgUrl } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'

export default function Outfits() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [outfits, setOutfits] = useState([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')

  useEffect(() => {
    if (!user) { navigate('/'); return }
    api.get('/outfits').then(r => setOutfits(r.data)).finally(() => setLoading(false))
  }, [user])

  const create = async () => {
    if (!newName.trim()) return
    await api.post('/outfits', { name: newName })
    const { data } = await api.get('/outfits')
    setOutfits(data); setCreateOpen(false); setNewName('')
  }

  const rename = async (id) => {
    if (!editName.trim()) return
    await api.put(`/outfits/${id}`, { name: editName })
    setOutfits(prev => prev.map(o => o.id === id ? { ...o, name: editName } : o))
    setEditId(null)
  }

  const deleteOutfit = async (id) => {
    if (!confirm('¿Eliminar outfit?')) return
    await api.delete(`/outfits/${id}`)
    setOutfits(prev => prev.filter(o => o.id !== id))
  }

  const removeItem = async (outfitId, productId) => {
    await api.delete(`/outfits/${outfitId}/items/${productId}`)
    setOutfits(prev => prev.map(o => o.id === outfitId ? { ...o, items: o.items.filter(i => i.id !== productId) } : o))
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="max-w-4xl mx-auto px-margin-desktop py-xl">
      <div className="flex items-center justify-between mb-xl">
        <h1 className="font-headline-md text-headline-md text-on-surface">Mis Outfits</h1>
        <button onClick={() => setCreateOpen(true)} className="bg-primary text-on-primary px-lg py-sm rounded-lg font-label-lg hover:opacity-90 active:scale-95 transition-all flex items-center gap-xs">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nuevo outfit
        </button>
      </div>

      {outfits.length === 0 ? (
        <div className="text-center py-20">
          <span className="material-symbols-outlined text-on-surface-variant/30 text-8xl">style</span>
          <h2 className="font-headline-md text-headline-md text-on-surface mt-lg mb-sm">No tienes outfits aún</h2>
          <p className="font-body-md text-on-surface-variant mb-xl">Crea outfits combinando prendas de la plataforma</p>
          <button onClick={() => setCreateOpen(true)} className="bg-primary text-on-primary px-lg py-md rounded-lg font-label-lg hover:opacity-90 active:scale-95 transition-all">Crear mi primer outfit</button>
        </div>
      ) : (
        <div className="space-y-lg">
          {outfits.map(outfit => (
            <div key={outfit.id} className="card p-xl">
              <div className="flex items-center justify-between mb-lg">
                {editId === outfit.id ? (
                  <div className="flex gap-sm flex-1">
                    <input value={editName} onChange={e => setEditName(e.target.value)} className="input flex-1" autoFocus onKeyDown={e => e.key === 'Enter' && rename(outfit.id)} />
                    <button onClick={() => rename(outfit.id)} className="bg-primary text-on-primary px-md py-xs rounded-lg font-label-lg hover:opacity-90 transition-all">Guardar</button>
                    <button onClick={() => setEditId(null)} className="border border-outline-variant text-on-surface-variant px-sm py-xs rounded-lg font-label-lg hover:bg-surface-container transition-all">
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-md">
                    <h2 className="font-headline-sm text-headline-sm text-on-surface">{outfit.name}</h2>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">{outfit.items?.length || 0} prendas</span>
                  </div>
                )}
                {editId !== outfit.id && (
                  <div className="flex gap-sm">
                    <button onClick={() => { setEditId(outfit.id); setEditName(outfit.name) }} className="font-label-lg text-label-lg text-on-surface-variant hover:text-primary transition-colors px-sm py-xs">Renombrar</button>
                    <button onClick={() => deleteOutfit(outfit.id)} className="font-label-lg text-label-lg text-error hover:underline px-sm py-xs">Eliminar</button>
                  </div>
                )}
              </div>

              {outfit.items?.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-md">
                    {outfit.items.map(item => (
                      <div key={item.id} className="relative group">
                        <Link to={`/products/${item.id}`} className="block">
                          <div className="aspect-square bg-surface-container rounded-lg overflow-hidden">
                            {item.images?.[0] ? <img src={imgUrl(item.images[0])} alt={item.title} className="w-full h-full object-cover" />
                              : <div className="w-full h-full bg-surface-container-high" />}
                          </div>
                          <p className="font-label-sm text-label-sm text-on-surface mt-xs line-clamp-2">{item.title}</p>
                          <p className="font-label-lg text-label-lg text-primary">${Number(item.price).toLocaleString()}</p>
                        </Link>
                        <button onClick={() => removeItem(outfit.id, item.id)}
                          className="absolute top-2 right-2 w-6 h-6 bg-error text-on-error rounded-full text-xs items-center justify-center hidden group-hover:flex">
                          <span className="material-symbols-outlined text-[12px]">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-lg pt-md border-t border-outline-variant/20 flex items-center justify-between">
                    <p className="font-body-md text-on-surface-variant">
                      Total: <span className="font-headline-sm text-headline-sm text-primary">${outfit.items.reduce((s, i) => s + i.price, 0).toLocaleString()}</span>
                    </p>
                    <button onClick={async () => {
                      for (const item of outfit.items) {
                        try { await api.post('/cart', { product_id: item.id }) } catch {}
                      }
                      navigate('/cart')
                    }} className="bg-primary text-on-primary px-lg py-sm rounded-lg font-label-lg hover:opacity-90 active:scale-95 transition-all">Agregar todo al carrito</button>
                  </div>
                </>
              ) : (
                <div className="text-center py-xl border-2 border-dashed border-outline-variant rounded-lg">
                  <span className="material-symbols-outlined text-on-surface-variant/40 text-4xl">style</span>
                  <p className="font-body-md text-on-surface-variant mt-sm mb-sm">Este outfit está vacío</p>
                  <Link to="/" className="font-label-lg text-label-lg text-primary hover:underline">Explorar productos para agregar</Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {createOpen && (
        <Modal onClose={() => setCreateOpen(false)} title="Crear outfit" size="sm">
          <div className="space-y-md">
            <div>
              <label className="font-label-lg text-label-lg text-on-surface block mb-xs">Nombre del outfit</label>
              <input className="input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ej: Look de verano, Casual Friday..." autoFocus onKeyDown={e => e.key === 'Enter' && create()} />
            </div>
            <div className="flex gap-sm">
              <button onClick={() => setCreateOpen(false)} className="border border-outline-variant text-on-surface-variant flex-1 py-sm rounded-lg font-label-lg hover:bg-surface-container transition-all">Cancelar</button>
              <button onClick={create} className="bg-primary text-on-primary flex-1 py-sm rounded-lg font-label-lg hover:opacity-90 active:scale-95 transition-all">Crear</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
