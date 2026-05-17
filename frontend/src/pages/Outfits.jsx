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
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Mis Outfits</h1>
        <button onClick={() => setCreateOpen(true)} className="btn-primary">+ Nuevo outfit</button>
      </div>

      {outfits.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-5xl mb-4">👗</p>
          <h2 className="text-xl font-semibold mb-2">No tienes outfits aún</h2>
          <p className="text-sm mb-6">Crea outfits combinando prendas de la plataforma</p>
          <button onClick={() => setCreateOpen(true)} className="btn-primary">Crear mi primer outfit</button>
        </div>
      ) : (
        <div className="space-y-6">
          {outfits.map(outfit => (
            <div key={outfit.id} className="card p-5">
              <div className="flex items-center justify-between mb-4">
                {editId === outfit.id ? (
                  <div className="flex gap-2 flex-1">
                    <input value={editName} onChange={e => setEditName(e.target.value)} className="input text-sm flex-1" autoFocus onKeyDown={e => e.key === 'Enter' && rename(outfit.id)} />
                    <button onClick={() => rename(outfit.id)} className="btn-primary text-sm px-3">Guardar</button>
                    <button onClick={() => setEditId(null)} className="btn-ghost text-sm">✕</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <h2 className="font-semibold text-lg">{outfit.name}</h2>
                    <span className="text-xs text-gray-400">{outfit.items?.length || 0} prendas</span>
                  </div>
                )}
                {editId !== outfit.id && (
                  <div className="flex gap-2">
                    <button onClick={() => { setEditId(outfit.id); setEditName(outfit.name) }} className="btn-ghost text-sm py-1">Renombrar</button>
                    <button onClick={() => deleteOutfit(outfit.id)} className="btn-ghost text-sm py-1 text-red-500">Eliminar</button>
                  </div>
                )}
              </div>

              {outfit.items?.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {outfit.items.map(item => (
                      <div key={item.id} className="relative group">
                        <Link to={`/products/${item.id}`} className="block">
                          <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden">
                            {item.images?.[0] ? <img src={imgUrl(item.images[0])} alt={item.title} className="w-full h-full object-cover" />
                              : <div className="w-full h-full bg-gray-200" />}
                          </div>
                          <p className="text-xs font-medium mt-1.5 line-clamp-2">{item.title}</p>
                          <p className="text-xs text-primary font-bold">${Number(item.price).toLocaleString()}</p>
                        </Link>
                        <button onClick={() => removeItem(outfit.id, item.id)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs items-center justify-center hidden group-hover:flex">✕</button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      Total: <span className="font-bold text-primary">${outfit.items.reduce((s, i) => s + i.price, 0).toLocaleString()}</span>
                    </p>
                    <div className="flex gap-2">
                      {outfit.items.map(item => (
                        <button key={item.id} onClick={async () => { try { await api.post('/cart', { product_id: item.id }); alert('Agregado al carrito') } catch(e) { alert(e.response?.data?.error) } }}
                          className="hidden">add</button>
                      ))}
                      <button onClick={async () => {
                        for (const item of outfit.items) {
                          try { await api.post('/cart', { product_id: item.id }) } catch {}
                        }
                        navigate('/cart')
                      }} className="btn-primary text-sm">Agregar todo al carrito</button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                  <p className="text-gray-400 text-sm mb-2">Este outfit está vacío</p>
                  <Link to="/" className="text-sm text-primary hover:underline">Explorar productos para agregar</Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {createOpen && (
        <Modal onClose={() => setCreateOpen(false)} title="Crear outfit" size="sm">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Nombre del outfit</label>
              <input className="input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ej: Look de verano, Casual Friday..." autoFocus onKeyDown={e => e.key === 'Enter' && create()} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setCreateOpen(false)} className="btn-ghost flex-1">Cancelar</button>
              <button onClick={create} className="btn-primary flex-1">Crear</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
