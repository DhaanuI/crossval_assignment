function PageLoader({ title = 'Loading', message = 'Fetching the latest data…' }) {
  return (
    <div className="page-loader" role="status" aria-live="polite">
      <div className="page-loader-card">
        <div className="page-loader-spinner" aria-hidden="true" />
        <p className="eyebrow">{title}</p>
        <h2>{message}</h2>
        <p>The server may take a few seconds to wake up on the free plan.</p>
      </div>
    </div>
  )
}

export default PageLoader
