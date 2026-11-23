export default function Home() {
  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="wordmark" href="#top" aria-label="FSD Sim home">FSD<span> / </span>SIM</a>
        <div className="topbar-meta"><span className="status-dot" /> MODEL LIBRARY <span className="topbar-divider">/</span> 001</div>
        <a className="top-link" href="#about">ABOUT THE MODEL <span aria-hidden="true">↗</span></a>
      </header>

      <section className="hero" id="top" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow"><span>01</span> VEHICLE STUDY <i /></p>
          <h1 id="hero-title">Model <span>3</span></h1>
          <p className="hero-description">A closer look at the form behind the drive. Explore the vehicle asset used in the FSD simulation project.</p>
          <a className="download-button" href="/models/tesla-model-3.glb" download>
            <span className="download-icon" aria-hidden="true">↓</span>
            <span><strong>DOWNLOAD 3D MODEL</strong><small>GLB FORMAT · 22.7 MB</small></span>
            <span className="button-arrow" aria-hidden="true">↗</span>
          </a>
          <p className="file-note">Optimized for real-time viewing and simulation workflows.</p>
        </div>
        <div className="vehicle-stage" aria-label="Model 3 vehicle showcase">
          <div className="stage-grid" />
          <div className="stage-glow" />
          <div className="model-card">
            <span className="model-number">01 — 03</span>
            <span className="model-crosshair" aria-hidden="true">+</span>
            <div className="vehicle-image" role="img" aria-label="Pearl-white electric sedan in a dark studio" />
            <span className="model-label">EXTERIOR / ALPINE WHITE</span>
          </div>
          <div className="stage-caption"><span>TESLA</span><span>MODEL 3</span></div>
          <div className="stage-axis"><span>FRONT</span><i /> <span>REAR</span></div>
        </div>
        <div className="vertical-index" aria-hidden="true">FSD SIMULATION / VEHICLE ASSET</div>
      </section>

      <section className="details" id="about" aria-label="Model details">
        <div className="detail-intro"><span className="section-index">01 / OVERVIEW</span><p>Built for simulation.<br />Ready to explore.</p></div>
        <div className="detail-item"><span>ASSET TYPE</span><strong>3D VEHICLE MODEL</strong></div>
        <div className="detail-item"><span>FILE FORMAT</span><strong>GLB / GL TRANSMISSION</strong></div>
        <div className="detail-item"><span>PROJECT</span><strong>FSD-SIM</strong></div>
        <div className="detail-end" aria-hidden="true">↘</div>
      </section>
      <footer className="footer"><span>FSD SIMULATION PROJECT</span><span>VEHICLE STUDY NO. 001</span><span>MODEL 3 <i /></span></footer>
    </main>
  )
}
