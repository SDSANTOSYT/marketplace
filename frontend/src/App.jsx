import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import AIAssistant from './components/AIAssistant'
import Home from './pages/Home'
import Search from './pages/Search'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Profile from './pages/Profile'
import UserProfile from './pages/UserProfile'
import AddProduct from './pages/AddProduct'
import Outfits from './pages/Outfits'
import Negotiation from './pages/Negotiation'
import { useAuth } from './context/AuthContext'

export default function App() {
  const { loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/edit-product/:id" element={<AddProduct />} />
          <Route path="/users/:id" element={<UserProfile />} />
          <Route path="/sell" element={<AddProduct />} />
          <Route path="/outfits" element={<Outfits />} />
          <Route path="/negotiations/:id" element={<Negotiation />} />
        </Routes>
      </main>
      <AIAssistant />
    </div>
  )
}
