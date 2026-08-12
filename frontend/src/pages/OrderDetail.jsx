import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ordersAPI, paymentsAPI } from '../services/api'
import './OrderDetail.css'

function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    note: '',
  })
  const [paymentError, setPaymentError] = useState('')
  const [paymentLoading, setPaymentLoading] = useState(false)

  useEffect(() => {
    fetchOrderDetails()
  }, [id])

  const fetchOrderDetails = async () => {
    try {
      setLoading(true)
      const response = await ordersAPI.getById(id)
      setOrder(response.data.data.order)
      setPayments(response.data.data.payments)
      setError('')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch order details')
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentInputChange = (e) => {
    setPaymentData({
      ...paymentData,
      [e.target.name]: e.target.value,
    })
  }

  const handleRecordPayment = async (e) => {
    e.preventDefault()
    setPaymentError('')

    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      setPaymentError('Please enter a valid payment amount')
      return
    }

    setPaymentLoading(true)

    try {
      await paymentsAPI.create({
        orderId: id,
        amount: parseFloat(paymentData.amount),
        paymentDate: paymentData.paymentDate,
        note: paymentData.note,
      })

      await fetchOrderDetails()

      setPaymentData({
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        note: '',
      })
      setShowPaymentModal(false)
    } catch (err) {
      setPaymentError(err.response?.data?.message || 'Failed to record payment')
    } finally {
      setPaymentLoading(false)
    }
  }

  const handleDeleteOrder = async () => {
    if (!window.confirm('Are you sure you want to delete this order?')) {
      return
    }

    try {
      await ordersAPI.delete(id)
      navigate('/dashboard')
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete order')
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
    return <div className="loading">Loading order details...</div>
  }

  if (error) {
    return (
      <div className="container">
        <div className="alert alert-error">{error}</div>
        <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
          Back to Dashboard
        </button>
      </div>
    )
  }

  if (!order) {
    return <div className="loading">Order not found</div>
  }

  return (
    <div className="container">
      <div className="order-detail-header">
        <h1>Order Details</h1>
        <div className="header-actions">
          <button onClick={() => navigate('/dashboard')} className="btn btn-outline">
            Back to Dashboard
          </button>
          {order.status !== 'paid' && (
            <button onClick={() => setShowPaymentModal(true)} className="btn btn-primary">
              Record Payment
            </button>
          )}
          {!order.hasPayments && (
            <button onClick={handleDeleteOrder} className="btn btn-danger">
              Delete Order
            </button>
          )}
        </div>
      </div>

      <div className="order-info-grid">
        <div className="card">
          <h2>Order Information</h2>
          <div className="info-row">
            <span className="info-label">Customer:</span>
            <span className="info-value">{order.customer}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Status:</span>
            <span className={getStatusBadgeClass(order.status)}>
              {formatStatus(order.status)}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Due Date:</span>
            <span className="info-value">{formatDate(order.dueDate)}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Order Total:</span>
            <span className="info-value">{formatCurrency(order.orderTotal)}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Total Paid:</span>
            <span className="info-value">{formatCurrency(order.totalPaid)}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Amount Due:</span>
            <span className="info-value" style={{ fontWeight: 'bold', color: order.amountDue > 0 ? '#e74c3c' : '#27ae60' }}>
              {formatCurrency(order.amountDue)}
            </span>
          </div>
        </div>

        <div className="card">
          <h2>Line Items</h2>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.lineItems.map((item, index) => (
                <tr key={index}>
                  <td>{item.description}</td>
                  <td>{item.quantity}</td>
                  <td>{formatCurrency(item.unitPrice)}</td>
                  <td>{formatCurrency(item.quantity * item.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="3" style={{ textAlign: 'right', fontWeight: 'bold' }}>Subtotal:</td>
                <td style={{ fontWeight: 'bold' }}>{formatCurrency(order.subtotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>Payment History</h2>
        {payments.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
            No payments recorded yet.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment._id}>
                  <td>{formatDate(payment.paymentDate)}</td>
                  <td>{formatCurrency(payment.amount)}</td>
                  <td>{payment.note || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Record Payment</h2>
              <button onClick={() => setShowPaymentModal(false)} className="modal-close">
                &times;
              </button>
            </div>

            {paymentError && <div className="alert alert-error">{paymentError}</div>}

            <form onSubmit={handleRecordPayment}>
              <div className="form-group">
                <label htmlFor="amount">Payment Amount *</label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  value={paymentData.amount}
                  onChange={handlePaymentInputChange}
                  min="0.01"
                  step="0.01"
                  max={order.amountDue}
                  required
                  placeholder={`Max: ${formatCurrency(order.amountDue)}`}
                />
              </div>
              <div className="form-group">
                <label htmlFor="paymentDate">Payment Date *</label>
                <input
                  type="date"
                  id="paymentDate"
                  name="paymentDate"
                  value={paymentData.paymentDate}
                  onChange={handlePaymentInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="note">Note (Optional)</label>
                <textarea
                  id="note"
                  name="note"
                  value={paymentData.note}
                  onChange={handlePaymentInputChange}
                  rows="3"
                  placeholder="Add payment notes..."
                />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={paymentLoading}>
                  {paymentLoading ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrderDetail
