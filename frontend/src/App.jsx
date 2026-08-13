import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import OrderDetail from './pages/OrderDetail'
import CreateOrder from './pages/CreateOrder'
import Navbar from './components/Navbar'
import PageLoader from './components/PageLoader'
import { wakeBackend } from './services/api'
import './App.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      setIsAuthenticated(true)
    }
    setLoading(false)
    wakeBackend()
    const keepAlive = setInterval(wakeBackend, 10 * 60 * 1000)
    return () => clearInterval(keepAlive)
  }, [])

  const handleLogin = (token) => {
    localStorage.setItem('token', token)
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setIsAuthenticated(false)
  }

  if (loading) {
    return <PageLoader title="Settlements" message="Opening the workspace…" />
  }

  return (
    <Router>
      <div className="App">
        <Navbar onLogout={handleLogout} isAuthenticated={isAuthenticated} />
        <Routes>
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" />
              ) : (
                <Landing />
              )
            }
          />
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" />
              ) : (
                <Login onLogin={handleLogin} />
              )
            }
          />
          <Route
            path="/signup"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" />
              ) : (
                <Signup onLogin={handleLogin} />
              )
            }
          />
          <Route
            path="/dashboard"
            element={
              isAuthenticated ? (
                <Dashboard />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/orders/create"
            element={
              isAuthenticated ? (
                <CreateOrder />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/orders/:id"
            element={
              isAuthenticated ? (
                <OrderDetail />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
        </Routes>
      </div>
    </Router>
  )
}

export default App
