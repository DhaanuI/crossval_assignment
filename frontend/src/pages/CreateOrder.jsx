import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ordersAPI } from '../services/api'
import './CreateOrder.css'

function CreateOrder() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    customer: '',
    dueDate: '',
  })
  const [lineItems, setLineItems] = useState([
    { description: '', quantity: 1, unitPrice: 0 },
  ])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleLineItemChange = (index, field, value) => {
    const newLineItems = [...lineItems]
    newLineItems[index][field] = value
    setLineItems(newLineItems)
  }

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: 0 }])
  }

  const removeLineItem = (index) => {
    if (lineItems.length > 1) {
      const newLineItems = lineItems.filter((_, i) => i !== index)
      setLineItems(newLineItems)
    }
  }

  const calculateSubtotal = () => {
    return lineItems.reduce(
      (sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0),
      0
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.customer || !formData.dueDate) {
      setError('Please fill in all required fields')
      return
    }

    const validLineItems = lineItems.filter(
      (item) => item.description && item.quantity > 0 && item.unitPrice >= 0
    )

    if (validLineItems.length === 0) {
      setError('Please add at least one valid line item')
      return
    }

    setLoading(true)

    try {
      const orderData = {
        customer: formData.customer,
        dueDate: formData.dueDate,
        lineItems: validLineItems.map((item) => ({
          description: item.description,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
        })),
      }

      await ordersAPI.create(orderData)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create order')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="create-order-header">
        <h1>Create New Order</h1>
        <button onClick={() => navigate('/dashboard')} className="btn btn-outline">
          Cancel
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="create-order-form">
        <div className="card">
          <h2>Order Information</h2>
          <div className="form-group">
            <label htmlFor="customer">Customer Name *</label>
            <input
              type="text"
              id="customer"
              name="customer"
              value={formData.customer}
              onChange={handleInputChange}
              required
              placeholder="Enter customer name"
            />
          </div>
          <div className="form-group">
            <label htmlFor="dueDate">Due Date *</label>
            <input
              type="date"
              id="dueDate"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleInputChange}
              required
            />
          </div>
        </div>

        <div className="card">
          <div className="line-items-header">
            <h2>Line Items</h2>
            <button type="button" onClick={addLineItem} className="btn btn-secondary btn-sm">
              + Add Line Item
            </button>
          </div>

          {lineItems.map((item, index) => (
            <div key={index} className="line-item">
              <div className="line-item-fields">
                <div className="form-group" style={{ flex: 2 }}>
                  <label>Description *</label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                    placeholder="Item description"
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Quantity *</label>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                    min="1"
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Unit Price *</label>
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => handleLineItemChange(index, 'unitPrice', e.target.value)}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Subtotal</label>
                  <input
                    type="text"
                    value={`$${((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}`}
                    disabled
                    style={{ backgroundColor: '#f5f5f5' }}
                  />
                </div>
              </div>
              {lineItems.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLineItem(index)}
                  className="btn btn-danger btn-sm"
                >
                  Remove
                </button>
              )}
            </div>
          ))}

          <div className="order-total">
            <strong>Order Total: ${calculateSubtotal().toFixed(2)}</strong>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating Order...' : 'Create Order'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreateOrder
