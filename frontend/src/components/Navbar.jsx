import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthModal from './AuthModal'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [authOpen, setAuthOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const search = (e) => {
    e.preventDefault()
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`)
  }

  return (
    <>
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-center h-16 gap-4">
            <Link to="/" className="text-xl font-bold text-primary shrink-0">StyleSwap</Link>

            <form onSubmit={search} className="flex-1 max-w-lg">
              <div className="relative">
                <input
                  value={q} onChange={e => setQ(e.target.value)}
                  placeholder="Buscar ropa, marcas, estilos..."
                  className="input pl-10 pr-4 py-2 text-sm"
                />
                <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </form>

            <div className="flex items-center gap-2 ml-auto">
              {user ? (
                <>
                  <Link to="/sell" className="btn-primary text-sm hidden sm:flex">+ Vender</Link>
                  <Link to="/cart" className="btn-ghost relative">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-10H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </Link>
                  <div className="relative">
                    <button onClick={() => setMenuOpen(!menuOpen)} className="btn-ghost flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                        {user.username[0].toUpperCase()}
                      </div>
                      <span className="hidden sm:block text-sm font-medium">{user.username}</span>
                    </button>
                    {menuOpen && (
                      <div className="absolute right-0 mt-1 w-48 card shadow-lg py-1 z-50" onClick={() => setMenuOpen(false)}>
                        <Link to="/profile" className="block px-4 py-2 text-sm hover:bg-gray-50">Mi perfil</Link>
                        <Link to="/outfits" className="block px-4 py-2 text-sm hover:bg-gray-50">Mis outfits</Link>
                        <Link to="/sell" className="block px-4 py-2 text-sm hover:bg-gray-50 sm:hidden">+ Vender</Link>
                        <hr className="my-1" />
                        <button onClick={logout} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50">Cerrar sesión</button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <button onClick={() => setAuthOpen(true)} className="btn-primary text-sm">Iniciar sesión</button>
              )}
            </div>
          </div>

          {/* Category bar */}
          <div className="flex gap-4 pb-3 overflow-x-auto scrollbar-hide text-sm">
            {['Parte superior','Suéter','Parte inferior','Pantalón','Calzado','Accesorio','Vestido','Abrigo'].map(cat => (
              <Link key={cat} to={`/search?category=${encodeURIComponent(cat)}`}
                className="shrink-0 text-gray-500 hover:text-primary font-medium transition-colors">
                {cat}
              </Link>
            ))}
          </div>
        </div>
      </nav>
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </>
  )
}
