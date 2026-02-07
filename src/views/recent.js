import React from 'react'
import { Helmet } from 'react-helmet'

import Navigation from '../components/navigation'
import Footer from '../components/footer'
import './recent.css'

const Recent = () => {
  return (
    <div className="recent-page">
      <Helmet>
        <title>Recent Activity - Mock App</title>
        <meta property="og:title" content="Recent Activity - Mock App" />
        <link rel="canonical" href="/recent" />
      </Helmet>
      <Navigation />
      <main className="recent-main">
        <div className="recent-inner">
          <h1 className="section-title">Recent Activity</h1>
          <p className="section-subtitle">Recent uploads, renames, and shares.</p>

          <div className="recent-list">
            <div className="activity-item">
              <div className="activity-item__marker" />
              <div className="activity-item__content">
                <div className="activity-item__header">
                  <span className="activity-item__user">Sarah Jenkins</span>
                  <span className="activity-item__time">2 mins ago</span>
                </div>
                <p className="activity-item__text">Uploaded Project_Proposal_v2.pdf to Marketing Assets.</p>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-item__marker" />
              <div className="activity-item__content">
                <div className="activity-item__header">
                  <span className="activity-item__user">Mike Ross</span>
                  <span className="activity-item__time">1 hour ago</span>
                </div>
                <p className="activity-item__text">Renamed Old_Logo.svg to Legacy_Logo_2023.svg.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default Recent
