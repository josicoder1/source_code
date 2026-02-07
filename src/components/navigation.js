import React from 'react'

import Script from 'dangerous-html/react'

import './navigation.css'

const Navigation = (props) => {
  return (
    <div className="navigation-container1">
      <nav className="navigation-root">
        <div className="navigation-container">
          <div className="navigation-left">
            <a href="/">
              <div aria-label="NimbusVault Home" className="navigation-brand">
                <div className="navigation-logo-icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9"></path>
                  </svg>
                </div>
                <span className="section-title">NimbusVault</span>
              </div>
            </a>
            <div className="navigation-desktop-links">
              <a href="/file-manager">
                <div className="navigation-link">
                  <span>My Files</span>
                </div>
              </a>
              <a href="/shared">
                <div className="navigation-link">
                  <span>Shared</span>
                </div>
              </a>
              <a href="/trash">
                <div className="navigation-link">
                  <span>Trash</span>
                </div>
              </a>
              <a href="#recent-activity">
                <div className="navigation-link">
                  <span>Recent</span>
                </div>
              </a>
            </div>
          </div>
          <div className="navigation-center">
            <div className="navigation-search-bar">
              <div className="navigation-search-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21l-4.3-4.3"></path>
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search files, folders..."
                aria-label="Search"
                className="navigation-search-input"
              />
            </div>
          </div>
          <div className="navigation-right">
            <button aria-label="Notifications" className="navigation-icon-btn">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.268 21a2 2 0 0 0 3.464 0m-10.47-5.674A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"></path>
              </svg>
              <span className="navigation-thq-navigation-notification-dot-elm"></span>
            </button>
            <div className="navigation-user-profile">
              <button
                id="userMenuToggle"
                aria-expanded="false"
                aria-haspopup="true"
                className="navigation-avatar-btn"
              >
                <img
                  src="/assets/profile.jpg"
                  alt="User Avatar"
                  className="navigation-thq-navigation-avatar-elm"
                />
              </button>
            </div>
            <button
              id="mobileMenuOpen"
              aria-label="Open Menu"
              className="navigation-mobile-toggle"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </button>
          </div>
        </div>
        <div id="mobileOverlay" className="navigation-mobile-overlay">
          <div className="navigation-mobile-header">
            <div className="navigation-brand">
              <div className="navigation-logo-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9"></path>
                </svg>
              </div>
              <span className="section-title">NimbusVault</span>
            </div>
            <button
              id="mobileMenuClose"
              aria-label="Close Menu"
              className="navigation-mobile-close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6L6 18M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <div className="navigation-mobile-content">
            <div className="navigation-mobile-search">
              <div className="navigation-search-bar">
                <div className="navigation-search-icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21l-4.3-4.3"></path>
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search files..."
                  className="navigation-search-input"
                />
              </div>
            </div>
            <div className="navigation-mobile-links">
              <a href="/file-manager">
                <div className="navigation-mobile-link">
                  <span>My Files</span>
                </div>
              </a>
              <a href="/shared">
                <div className="navigation-mobile-link">
                  <span>Shared with me</span>
                </div>
              </a>
              <a href="#recent-activity">
                <div className="navigation-mobile-link">
                  <span>Recent Activity</span>
                </div>
              </a>
              <a href="/starred">
                <div className="navigation-mobile-link">
                  <span>Starred</span>
                </div>
              </a>
              <a href="/trash">
                <div className="navigation-mobile-link">
                  <span>Trash Bin</span>
                </div>
              </a>
            </div>
            <div className="navigation-mobile-footer">
              <div className="navigation-storage-card">
                <div className="navigation-storage-info">
                  <span className="section-content">Storage Usage</span>
                  <span className="section-content">75%</span>
                </div>
                <div className="navigation-progress-bg">
                  <div className="navigation-thq-navigation-progress-fill-elm navigation-progress-fill"></div>
                </div>
                <p className="navigation-storage-text">11.2 GB of 15 GB used</p>
              </div>
              <button className="navigation-upgrade-btn btn btn-primary btn-lg">
                Upgrade Plan
              </button>
            </div>
          </div>
        </div>
      </nav>
      <div className="navigation-container2">
        <div className="navigation-container3">
          <Script
            html={`<style>
@media (prefers-reduced-motion: reduce) {
.navigation-mobile-link, .navigation-mobile-overlay, .navigation-search-bar {
  transition: none;
}
}
</style>`}
          ></Script>
        </div>
      </div>
      <div className="navigation-container4">
        <div className="navigation-container5">
          <Script
            html={`<script defer data-name="navigation-logic">
(function(){
  const mobileMenuOpen = document.getElementById("mobileMenuOpen")
  const mobileMenuClose = document.getElementById("mobileMenuClose")
  const mobileOverlay = document.getElementById("mobileOverlay")
  const body = document.body

  function toggleMenu(isOpen) {
    if (isOpen) {
      mobileOverlay.style.display = "flex"
      body.style.overflow = "hidden"

      // Staggered animation for links
      const links = mobileOverlay.querySelectorAll(".navigation-mobile-link")
      links.forEach((link, index) => {
        link.style.opacity = "0"
        link.style.transform = "translateY(20px)"
        setTimeout(() => {
          link.style.transition = "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
          link.style.opacity = "1"
          link.style.transform = "translateY(0)"
        }, 100 + index * 50)
      })
    } else {
      mobileOverlay.style.display = "none"
      body.style.overflow = ""
    }
  }

  mobileMenuOpen.addEventListener("click", () => toggleMenu(true))
  mobileMenuClose.addEventListener("click", () => toggleMenu(false))

  // Close menu on link click
  const mobileLinks = document.querySelectorAll(".navigation-mobile-link")
  mobileLinks.forEach((link) => {
    link.addEventListener("click", () => toggleMenu(false))
  })

  // Handle scroll effect on navbar
  window.addEventListener("scroll", () => {
    const nav = document.querySelector(".navigation-root")
    if (window.scrollY > 20) {
      nav.style.backgroundColor = "color-mix(in srgb, var(--color-surface) 95%, transparent)"
      nav.style.backdropFilter = "blur(12px)"
    } else {
      nav.style.backgroundColor = "var(--color-surface)"
      nav.style.backdropFilter = "none"
    }
  })

  // Smooth-scroll handler for "Recent" links (anchor target: #recent-activity)
  function smoothToRecent(e) {
    try {
      e && e.preventDefault && e.preventDefault()
      const el = document.getElementById('recent-activity')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      // close mobile menu if open
      toggleMenu(false)
    } catch (err) { /* ignore */ }
  }

  // attach to all links that reference #recent-activity
  const recentLinks = document.querySelectorAll('a[href="#recent-activity"]')
  recentLinks.forEach((ln) => ln.addEventListener('click', smoothToRecent))
})()
</script>`}
          ></Script>
        </div>
      </div>
    </div>
  )
}

export default Navigation
