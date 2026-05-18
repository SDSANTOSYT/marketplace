import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import AuthModal from "./AuthModal";
import { imgUrl } from "../lib/api";

// Categorías limpias: sin duplicados, sin "Nuevos" ni "Ofertas"
const CATEGORIES = [
  { label: "Tops", path: "Parte superior" },
  { label: "Suéteres", path: "Suéter" },
  { label: "Pantalones", path: "Pantalón" },
  { label: "Calzado", path: "Calzado" },
  { label: "Accesorios", path: "Accesorio" },
  { label: "Vestidos", path: "Vestido" },
  { label: "Abrigos", path: "Abrigo" },
];

const NOTIF_ICONS = {
  new_message: "chat",
  new_comment: "comment",
  comment_reply: "reply",
  new_review: "star",
  new_sale: "sell",
  out_of_stock: "inventory_2",
  order_shipped: "local_shipping",
};

function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead, dismiss } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 hover:bg-surface-container-low rounded-full transition-all active:scale-95"
        aria-label="Notificaciones"
      >
        <span className="material-symbols-outlined text-on-surface-variant">
          notifications
        </span>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-primary text-on-primary text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/20 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-md py-sm border-b border-outline-variant/20">
            <span className="font-label-lg text-label-lg text-on-surface">
              Notificaciones
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="font-label-sm text-label-sm text-primary hover:underline"
              >
                Marcar todas como leídas
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <span className="material-symbols-outlined text-on-surface-variant/30 text-4xl">
                  notifications_off
                </span>
                <p className="font-body-md text-on-surface-variant mt-2">
                  Sin notificaciones
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex gap-sm px-md py-sm border-b border-outline-variant/10 transition-colors ${!n.is_read ? "bg-primary-fixed/10" : "hover:bg-surface-container-low"}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${!n.is_read ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"}`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {NOTIF_ICONS[n.type] || "notifications"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-label-lg text-label-lg text-on-surface leading-snug">
                      {n.title}
                    </p>
                    <p className="font-body-md text-on-surface-variant text-[12px] leading-snug mt-0.5 line-clamp-2">
                      {n.body}
                    </p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant/60 mt-0.5">
                      {new Date(n.created_at).toLocaleString("es", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex flex-col gap-0.5 shrink-0">
                    {!n.is_read && (
                      <button
                        onClick={() => markRead(n.id)}
                        className="p-1 hover:bg-surface-container rounded transition-colors"
                        title="Marcar como leída"
                      >
                        <span className="material-symbols-outlined text-primary text-[16px]">
                          done
                        </span>
                      </button>
                    )}
                    <button
                      onClick={() => dismiss(n.id)}
                      className="p-1 hover:bg-surface-container rounded transition-colors"
                      title="Eliminar"
                    >
                      <span className="material-symbols-outlined text-on-surface-variant text-[16px]">
                        close
                      </span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const search = (e) => {
    e.preventDefault();
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-surface-container-lowest shadow-sm">
        <div className="flex justify-between items-center px-margin-desktop py-4 w-full">
          {/* Logo */}
          <div className="flex items-center gap-xl">
            <Link
              to="/"
              className="font-headline-md text-headline-md font-bold tracking-tighter text-primary"
            >
              Stella
            </Link>
            <nav className="hidden md:flex items-center gap-lg">
              {CATEGORIES.map((c) => (
                <Link
                  key={c.path}
                  to={`/search?category=${encodeURIComponent(c.path)}`}
                  className="font-label-lg text-label-lg text-on-surface-variant hover:text-primary transition-colors"
                >
                  {c.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-md">
            {/* Search */}
            <form onSubmit={search} className="relative hidden lg:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                search
              </span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar prendas, marcas..."
                className="pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant/30 rounded-full w-64 text-body-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              />
            </form>

            <div className="flex items-center gap-xs">
              {user ? (
                <>
                  {/* Wishlist heart */}
                  <Link
                    to="/profile?tab=wishlist"
                    className="p-2 hover:bg-surface-container-low rounded-full transition-all active:scale-95"
                    title="Lista de deseos"
                  >
                    <span className="material-symbols-outlined text-on-surface-variant">
                      favorite
                    </span>
                  </Link>

                  {/* Cart */}
                  <Link
                    to="/cart"
                    className="p-2 hover:bg-surface-container-low rounded-full transition-all active:scale-95"
                    title="Carrito"
                  >
                    <span className="material-symbols-outlined text-on-surface-variant">
                      shopping_bag
                    </span>
                  </Link>

                  {/* Notifications */}
                  <NotificationBell />

                  {/* Sell */}
                  <Link
                    to="/sell"
                    className="hidden sm:flex items-center gap-xs bg-primary text-on-primary px-md py-xs rounded-lg font-label-lg shadow-sm hover:opacity-90 active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      add_circle
                    </span>
                    Vender
                  </Link>

                   {/* User menu */}
                   <div className="relative" ref={menuRef}>
                     <button
                       onClick={() => setMenuOpen(!menuOpen)}
                       className="flex items-center gap-xs p-xs hover:bg-surface-container-low rounded-full transition-all active:scale-95"
                     >
                       {user.avatar ? (
                         <img src={imgUrl(user.avatar)} alt={user.username} className="w-8 h-8 rounded-full object-cover border border-primary-fixed" />
                       ) : (
                         <div className="w-8 h-8 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold text-sm">
                           {user.username[0].toUpperCase()}
                         </div>
                       )}
                       <span className="hidden sm:block font-label-lg text-label-lg text-on-surface">
                         {user.username}
                       </span>
                     </button>
                    {menuOpen && (
                      <div
                        className="absolute right-0 mt-2 w-52 bg-surface-container-lowest rounded-lg shadow-lg border border-outline-variant/20 py-1 z-50"
                        onClick={() => setMenuOpen(false)}
                      >
                        <Link
                          to="/profile"
                          className="flex items-center gap-sm px-md py-sm font-label-lg text-on-surface hover:bg-surface-container transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
                            account_circle
                          </span>
                          Mi perfil
                        </Link>
                        <Link
                          to="/profile?tab=negotiations"
                          className="flex items-center gap-sm px-md py-sm font-label-lg text-on-surface hover:bg-surface-container transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
                            chat
                          </span>
                          Mis chats
                        </Link>
                        <Link
                          to="/profile?tab=wishlist"
                          className="flex items-center gap-sm px-md py-sm font-label-lg text-on-surface hover:bg-surface-container transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
                            favorite
                          </span>
                          Lista de deseos
                        </Link>
                        <Link
                          to="/outfits"
                          className="flex items-center gap-sm px-md py-sm font-label-lg text-on-surface hover:bg-surface-container transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
                            style
                          </span>
                          Mis outfits
                        </Link>
                        <Link
                          to="/sell"
                          className="flex items-center gap-sm px-md py-sm font-label-lg text-on-surface hover:bg-surface-container transition-colors sm:hidden"
                        >
                          <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
                            sell
                          </span>
                          Vender
                        </Link>
                        <hr className="my-1 border-outline-variant/30" />
                        <button
                          onClick={logout}
                          className="w-full flex items-center gap-sm px-md py-sm font-label-lg text-error hover:bg-surface-container transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            logout
                          </span>
                          Cerrar sesión
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Link
                    to="/cart"
                    className="p-2 hover:bg-surface-container-low rounded-full transition-all"
                  >
                    <span className="material-symbols-outlined text-on-surface-variant">
                      shopping_bag
                    </span>
                  </Link>
                  <button
                    onClick={() => setAuthOpen(true)}
                    className="bg-primary text-on-primary px-md py-xs rounded-lg font-label-lg shadow-sm hover:opacity-90 active:scale-95 transition-all"
                  >
                    Iniciar sesión
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </>
  );
}
