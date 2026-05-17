import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Modal from './Modal'

export default function AuthModal({ onClose }) {
  const { login, register } = useAuth()
  const [tab, setTab] = useState('login')
  const [form, setForm] = useState({ username: '', email: '', password: '', name: '', phone: '', address: '' })
  const [step, setStep] = useState(1) // register step 1=credentials, 2=optional contact
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleLogin = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try { await login(form.email, form.password); onClose() }
    catch (err) { setError(err.response?.data?.error || 'Error al iniciar sesión') }
    finally { setLoading(false) }
  }

  const handleRegister = async (e) => {
    e.preventDefault(); setError('')
    if (step === 1) { setStep(2); return }
    setLoading(true)
    try { await register(form); onClose() }
    catch (err) { setError(err.response?.data?.error || 'Error al registrarse') }
    finally { setLoading(false) }
  }

  return (
    <Modal onClose={onClose} title={tab === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}>
      {/* Brand header */}
      <div className="text-center mb-4">
        <span className="font-headline-md text-headline-md font-bold text-primary">Stella</span>
      </div>

      <div className="flex border-b border-outline-variant mb-6">
        {['login','register'].map(t => (
          <button key={t} onClick={() => { setTab(t); setStep(1); setError('') }}
            className={`flex-1 py-2 font-label-lg transition-colors ${tab === t ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>
            {t === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 text-body-md text-error bg-error-container px-3 py-2 rounded-lg">{error}</p>}

      {tab === 'login' ? (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block font-label-lg text-label-lg text-on-surface mb-1">Correo electrónico</label>
            <input className="input" type="email" required value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div>
            <label className="block font-label-lg text-label-lg text-on-surface mb-1">Contraseña</label>
            <input className="input" type="password" required value={form.password} onChange={e => set('password', e.target.value)} />
          </div>
          <button type="submit" className="bg-primary text-on-primary w-full px-lg py-sm rounded-lg font-label-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed" disabled={loading}>
            {loading ? 'Entrando...' : 'Iniciar sesión'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="space-y-4">
          {step === 1 ? (
            <>
              <div>
                <label className="block font-label-lg text-label-lg text-on-surface mb-1">Nombre de usuario</label>
                <input className="input" required value={form.username} onChange={e => set('username', e.target.value)} />
              </div>
              <div>
                <label className="block font-label-lg text-label-lg text-on-surface mb-1">Correo electrónico</label>
                <input className="input" type="email" required value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div>
                <label className="block font-label-lg text-label-lg text-on-surface mb-1">Contraseña</label>
                <input className="input" type="password" required minLength={6} value={form.password} onChange={e => set('password', e.target.value)} />
              </div>
              <button type="submit" className="bg-primary text-on-primary w-full px-lg py-sm rounded-lg font-label-lg hover:opacity-90 active:scale-95 transition-all">Continuar</button>
            </>
          ) : (
            <>
              <p className="font-body-md text-on-surface-variant">Datos de contacto y envío (opcional)</p>
              <div>
                <label className="block font-label-lg text-label-lg text-on-surface mb-1">Nombre completo</label>
                <input className="input" value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div>
                <label className="block font-label-lg text-label-lg text-on-surface mb-1">Teléfono</label>
                <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
              <div>
                <label className="block font-label-lg text-label-lg text-on-surface mb-1">Dirección</label>
                <input className="input" value={form.address} onChange={e => set('address', e.target.value)} />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep(1)} className="border border-outline-variant text-on-surface flex-1 px-lg py-sm rounded-lg font-label-lg hover:bg-surface-container transition-all">Atrás</button>
                <button type="submit" className="bg-primary text-on-primary flex-1 px-lg py-sm rounded-lg font-label-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-50" disabled={loading}>
                  {loading ? 'Creando...' : 'Crear cuenta'}
                </button>
              </div>
              <button type="submit" onClick={async e => { e.preventDefault(); setLoading(true); try { await register({ ...form, name: '', phone: '', address: '' }); onClose() } catch(err) { setError(err.response?.data?.error || 'Error') } finally { setLoading(false) }}} className="w-full text-on-surface-variant font-label-lg text-label-lg hover:text-on-surface transition-colors py-2">Omitir este paso</button>
            </>
          )}
        </form>
      )}
    </Modal>
  )
}
