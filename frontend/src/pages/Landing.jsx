import { Link } from 'react-router-dom'
import './Landing.css'

function Landing() {
  return (
    <div className="landing-page">
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <p className="eyebrow">B2B finance, simplified</p>
            <h1>Orders and settlements that stay in sync.</h1>
            <p className="hero-subtitle">
              Create invoices, record partial payments, and watch statuses update automatically —
              from pending to paid, without the spreadsheet chaos.
            </p>
            <div className="hero-buttons">
              <Link to="/signup" className="btn btn-primary btn-large">Start for free</Link>
              <Link to="/login" className="btn btn-ghost btn-large">I already have an account</Link>
            </div>
            <div className="hero-meta">
              <span>Track every unpaid invoice</span>
              <span>Record payments as they come in</span>
              <span>See what's overdue at a glance</span>
            </div>
          </div>

          <div className="hero-panel">
            <div className="preview-card">
              <div className="preview-top">
                <span className="preview-dot" />
                <span>Settlement ledger</span>
              </div>
              <div className="preview-row">
                <div>
                  <p>Northwind Goods</p>
                  <small>Due 18 Apr</small>
                </div>
                <span className="badge badge-partially-paid">Partially paid</span>
              </div>
              <div className="preview-row">
                <div>
                  <p>Harbor Supplies</p>
                  <small>Due 22 Apr</small>
                </div>
                <span className="badge badge-pending">Pending</span>
              </div>
              <div className="preview-row">
                <div>
                  <p>Lumen Studio</p>
                  <small>Paid today</small>
                </div>
                <span className="badge badge-paid">Paid</span>
              </div>
              <div className="preview-total">
                <span>Outstanding</span>
                <strong>$4,820.00</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="container">
          <div className="section-heading">
            <p className="eyebrow">Why teams use it</p>
            <h2>A clean operating system for receivables.</h2>
          </div>
          <div className="features-grid">
            <article className="feature-card">
              <div className="feature-icon">01</div>
              <h3>Order management</h3>
              <p>Build orders with multiple line items, due dates, and customer details in one place.</p>
            </article>
            <article className="feature-card">
              <div className="feature-icon">02</div>
              <h3>Payment tracking</h3>
              <p>Record full or partial payments. Amount due and status stay accurate automatically.</p>
            </article>
            <article className="feature-card">
              <div className="feature-icon">03</div>
              <h3>Live dashboard</h3>
              <p>Filter by pending, paid, or overdue and see revenue and outstanding balances at a glance.</p>
            </article>
            <article className="feature-card">
              <div className="feature-icon">04</div>
              <h3>Your data stays yours</h3>
              <p>Each account is private. Only you can see your customers, invoices, and payments.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="how-it-works">
        <div className="container">
          <div className="section-heading">
            <p className="eyebrow">Four steps</p>
            <h2>From new order to settled invoice.</h2>
          </div>
          <div className="steps">
            <div className="step"><span>01</span><h3>Create an account</h3><p>Sign up and start with a private workspace instantly.</p></div>
            <div className="step"><span>02</span><h3>Add an order</h3><p>Capture the customer, line items, and due date.</p></div>
            <div className="step"><span>03</span><h3>Record payments</h3><p>Log settlements as they come in — partial or full.</p></div>
            <div className="step"><span>04</span><h3>Watch status move</h3><p>Pending, partially paid, paid, or overdue — always current.</p></div>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="cta-card">
          <div>
            <p className="eyebrow">Ready when you are</p>
            <h2>Start tracking orders without the spreadsheet mess.</h2>
          </div>
          <Link to="/signup" className="btn btn-primary btn-large">Create free account</Link>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-row">
          <p>Orders & Settlements</p>
          <p>Created by Dhaanu with atmost care</p>
        </div>
      </footer>
    </div>
  )
}

export default Landing
