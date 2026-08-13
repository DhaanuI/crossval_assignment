import { useState, useEffect } from 'react'
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
  const [summary, setSummary] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    collected: 0,
    outstanding: 0,
  })
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    hasNext: false,
    hasPrev: false,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [exportFrom, setExportFrom] = useState('')
  const [exportTo, setExportTo] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetchOrders(orders.length === 0)
  }, [statusFilter, page])

  const fetchOrders = async (isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }
      const response = await ordersAPI.getAll({
        status: statusFilter || undefined,
        page,
        limit: 10,
      })
      setOrders(response.data.data.orders)
      setSummary(response.data.data.summary || {
        totalOrders: response.data.pagination?.total || 0,
        totalRevenue: 0,
        collected: 0,
        outstanding: 0,
      })
      setPagination(response.data.pagination || { page: 1, pages: 1, total: 0 })
      setError('')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch orders')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const changeFilter = (value) => {
    setStatusFilter(value)
    setPage(1)
  }

  const handleExport = async (e) => {
    e.preventDefault()
    if (!exportFrom || !exportTo) {
      setError('Choose a from and to date to export orders')
      return
    }
    if (exportFrom > exportTo) {
      setError('From date cannot be after to date')
      return
    }

    try {
      setExporting(true)
      const response = await ordersAPI.exportCsv(exportFrom, exportTo)
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `orders-${exportFrom}-to-${exportTo}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      setError('')
    } catch (err) {
      let message = 'Failed to export orders'
      const data = err.response?.data
      if (data instanceof Blob) {
        try {
          const parsed = JSON.parse(await data.text())
          message = parsed.message || message
        } catch (parseErr) {
          message = 'Failed to export orders'
        }
      } else if (data?.message) {
        message = data.message
      }
      setError(message)
    } finally {
      setExporting(false)
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
          <p className="stat-value">{summary.totalOrders}</p>
        </div>
        <div className="stat-card">
          <h3>Total revenue</h3>
          <p className="stat-value">{formatCurrency(summary.totalRevenue)}</p>
        </div>
        <div className="stat-card">
          <h3>Collected</h3>
          <p className="stat-value">{formatCurrency(summary.collected)}</p>
        </div>
        <div className="stat-card">
          <h3>Outstanding</h3>
          <p className="stat-value">{formatCurrency(summary.outstanding)}</p>
        </div>
      </div>

      {refreshing && <p className="page-kicker">Updating list…</p>}

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
              onClick={() => changeFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <form className="export-bar" onSubmit={handleExport}>
        <div className="export-copy">
          <span className="filters-label">Export CSV</span>
          <p>Orders created in this date range. Max 90 days or 1000 rows.</p>
        </div>
        <label className="export-field">
          From
          <input
            type="date"
            value={exportFrom}
            max={exportTo || undefined}
            onChange={(e) => setExportFrom(e.target.value)}
            required
          />
        </label>
        <label className="export-field">
          To
          <input
            type="date"
            value={exportTo}
            min={exportFrom || undefined}
            onChange={(e) => setExportTo(e.target.value)}
            required
          />
        </label>
        <button type="submit" className="btn btn-outline btn-sm" disabled={exporting}>
          {exporting ? 'Exporting…' : 'Download CSV'}
        </button>
      </form>

      {orders.length === 0 ? (
        <div className="card empty-state">
          <p>
            {statusFilter
              ? `No ${formatStatus(statusFilter).toLowerCase()} orders found.`
              : 'No orders yet. Create your first order to start tracking settlements.'}
          </p>
        </div>
      ) : (
        <>
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
                {orders.map((order) => (
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
          {pagination.pages > 1 && (
            <div className="pagination">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={!pagination.hasPrev}
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
              >
                Previous
              </button>
              <span>
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={!pagination.hasNext}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Dashboard
