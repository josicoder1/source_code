import React from 'react'
import { Helmet } from 'react-helmet'

import Navigation from '../components/navigation'
import Footer from '../components/footer'
import './shared.css'

const Shared = (props) => {
  return (
    <div className="shared-container">
      <Helmet>
        <title>Shared - Mock App</title>
        <meta property="og:title" content="Shared - Mock App" />
        <link rel="canonical" href="/shared" />
      </Helmet>
      <Navigation />
      <main className="shared-main">
        <div className="shared-inner">
          <h1 className="shared-title">Shared with me</h1>
          <p className="shared-subtitle">Files and folders others shared with you will appear here.</p>

          <div className="shared-list">
            <div className="shared-card">
              <div className="shared-card__meta">
                <span className="shared-card__name">Project_Brief.pdf</span>
                <span className="shared-card__by">Shared by: Alice</span>
              </div>
            </div>
            <div className="shared-card">
              <div className="shared-card__meta">
                <span className="shared-card__name">Campaign_Images.zip</span>
                <span className="shared-card__by">Shared by: Design Team</span>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default Shared
