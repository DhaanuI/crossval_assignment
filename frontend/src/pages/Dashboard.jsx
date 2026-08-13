import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ordersAPI } from '../services/api'
import PageLoader from '../components/PageLoader'
import './Dashboard.css'

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'partially_paid', label: 'Partially paid' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
]

function Dashboard() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    fetchOrders()
  }, [])

  const filteredOrders = useMemo(() => {
    if (!statusFilter) return orders
    return orders.filter((order) => order.status === statusFilter)
  }, [orders, statusFilter])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await ordersAPI.getAll()
      setOrders(response.data.data.orders)
      setError('')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch orders')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      pending: 'badge-pending',
      partially_paid: 'badge-partially-paid',
      paid: 'badge-paid',
      overdue: 'badge-overdue',
    }
    return `badge ${statusMap[status] || ''}`
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatCurrency = (amount) => {
    return `$${amount.toFixed(2)}`
  }

  const formatStatus = (status) => {
    return status.replace('_', ' ').toUpperCase()
  }

  if (loading) {
    return <PageLoader title="Workspace" message="Loading orders…" />
  }

  return (
    <div className="container">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Orders dashboard</h1>
          <p className="page-kicker">Review balances, filter by status, and keep settlements moving.</p>
        </div>
        <Link to="/orders/create" className="btn btn-primary">
          Create new order
        </Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Total orders</h3>
          <p className="stat-value">{orders.length}</p>
        </div>
        <div className="stat-card">
          <h3>Total revenue</h3>
          <p className="stat-value">
            {formatCurrency(orders.reduce((sum, order) => sum + order.orderTotal, 0))}
          </p>
        </div>
        <div className="stat-card">
          <h3>Collected</h3>
          <p className="stat-value">
            {formatCurrency(orders.reduce((sum, order) => sum + order.totalPaid, 0))}
          </p>
        </div>
        <div className="stat-card">
          <h3>Outstanding</h3>
          <p className="stat-value">
            {formatCurrency(orders.reduce((sum, order) => sum + order.amountDue, 0))}
          </p>
        </div>
      </div>

      <div className="filters">
        <span className="filters-label">Filter by status</span>
        <div className="filter-chips" role="tablist" aria-label="Filter orders by status">
          {FILTERS.map((filter) => (
            <button
              key={filter.value || 'all'}
              type="button"
              role="tab"
              aria-selected={statusFilter === filter.value}
              className={`filter-chip${statusFilter === filter.value ? ' active' : ''}`}
              onClick={() => setStatusFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="card empty-state">
          <p>
            {statusFilter
              ? `No ${formatStatus(statusFilter).toLowerCase()} orders found.`
              : 'No orders yet. Create your first order to start tracking settlements.'}
          </p>
        </div>
      ) : (
        <div className="orders-table-container">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Status</th>
                <th>Order Total</th>
                <th>Amount Paid</th>
                <th>Amount Due</th>
                <th>Due Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order._id}>
                  <td>{order.customer}</td>
                  <td>
                    <span className={getStatusBadgeClass(order.status)}>
                      {formatStatus(order.status)}
                    </span>
                  </td>
                  <td>{formatCurrency(order.orderTotal)}</td>
                  <td>{formatCurrency(order.totalPaid)}</td>
                  <td>{formatCurrency(order.amountDue)}</td>
                  <td>{formatDate(order.dueDate)}</td>
                  <td>
                    <Link
                      to={`/orders/${order._id}`}
                      className="btn btn-secondary btn-sm"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default Dashboard
