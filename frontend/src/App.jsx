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
import { authAPI, wakeBackend } from './services/api'
import './App.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const restoreSession = async () => {
      try {
        await authAPI.getMe()
        setIsAuthenticated(true)
      } catch (err) {
        setIsAuthenticated(false)
      } finally {
        setLoading(false)
      }
    }

    restoreSession()
    wakeBackend()
    const keepAlive = setInterval(wakeBackend, 10 * 60 * 1000)
    return () => clearInterval(keepAlive)
  }, [])

  const handleLogin = () => {
    setIsAuthenticated(true)
  }

  const handleLogout = async () => {
    try {
      await authAPI.logout()
    } catch (err) {
      console.log('Logout request failed:', err.message)
    }
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
