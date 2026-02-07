import React from 'react'

import Script from 'dangerous-html/react'

import './footer.css'

const Footer = (props) => {
  return (
    <div className="footer-container1">
      <footer className="footer-wrapper">
        <div className="footer-container">
          <div className="footer-top">
            <div className="footer-brand-column">
              <a href="#">
                <div className="footer-logo">
                  <div className="footer-logo-icon">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                    >
                      <path
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9"
                      ></path>
                    </svg>
                  </div>
                  <span className="footer-logo-text">NimbusVault</span>
                </div>
              </a>
              <p className="footer-description section-content">
                Secure, lightning-fast cloud storage for modern enterprises.
                Manage, share, and protect your digital assets with bank-grade
                encryption and seamless collaboration.
              </p>
              <div className="footer-social-links">
                <a href="#">
                  <div aria-label="LinkedIn" className="footer-social-icon">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                    >
                      <g
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      >
                        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2a2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6M2 9h4v12H2z"></path>
                        <circle cx="4" cy="4" r="2"></circle>
                      </g>
                    </svg>
                  </div>
                </a>
                <a href="#">
                  <div aria-label="Twitter" className="footer-social-icon">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                    >
                      <path
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6c2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4c-.9-4.2 4-6.6 7-3.8c1.1 0 3-1.2 3-1.2"
                      ></path>
                    </svg>
                  </div>
                </a>
                <a href="#">
                  <div aria-label="GitHub" className="footer-social-icon">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                    >
                      <g
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      >
                        <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5c.08-1.25-.27-2.48-1-3.5c.28-1.15.28-2.35 0-3.5c0 0-1 0-3 1.5c-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5c-.39.49-.68 1.05-.85 1.65S8.93 17.38 9 18v4"></path>
                        <path d="M9 18c-4.51 2-5-2-7-2"></path>
                      </g>
                    </svg>
                  </div>
                </a>
                <a href="#">
                  <div aria-label="Facebook" className="footer-social-icon">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                    >
                      <path
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"
                      ></path>
                    </svg>
                  </div>
                </a>
              </div>
            </div>
            
            <div className="footer-newsletter-column">
              <h3 className="footer-column-title">Stay Updated</h3>
              <p className="footer-newsletter-text section-content">
                Get the latest security updates and product features directly in
                your inbox.
              </p>
              <form
                action="/subscribe"
                method="POST"
                data-form-id="d53be525-7387-4142-9192-59f40fdd3633"
                className="footer-newsletter-form"
              >
                <div className="footer-input-group">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    required="true"
                    aria-label="Email address"
                    id="thq_textinput_Jk4T"
                    name="textinput"
                    data-form-field-id="thq_textinput_Jk4T"
                    className="footer-input"
                  />
                  <button
                    type="submit"
                    aria-label="Subscribe"
                    id="thq_button_zsJ6"
                    name="button"
                    data-form-field-id="thq_button_zsJ6"
                    className="footer-submit-btn"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                    >
                      <path
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 12h14m-7-7l7 7l-7 7"
                      ></path>
                    </svg>
                  </button>
                </div>
                <p className="footer-form-hint">
                  No spam, just the good stuff.
                </p>
              </form>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-bottom-inner">
              <div className="footer-copyright">
                <span>
                  &amp;copy; 2026 NimbusVault Inc. All rights reserved.
                </span>
              </div>
              <div className="footer-legal-links">
                <a href="#">
                  <div className="footer-legal-link">
                    <span>Privacy Policy</span>
                  </div>
                </a>
                <a href="#">
                  <div className="footer-legal-link">
                    <span>Terms of Service</span>
                  </div>
                </a>
                <a href="#">
                  <div className="footer-legal-link">
                    <span>Cookie Settings</span>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
      <div className="footer-container2">
        <div className="footer-container3">
          <Script
            html={`<script defer data-name="footer-logic">
(function(){
  const footerForm = document.querySelector(".footer-newsletter-form")
  const footerInput = document.querySelector(".footer-input")

  if (footerForm) {
    footerForm.addEventListener("submit", (e) => {
      // Native validation handles the required email check
      // We add a simple visual feedback for the user
      const btn = footerForm.querySelector(".footer-submit-btn")
      const originalIcon = btn.innerHTML

      // Temporary success state
      btn.style.backgroundColor = "#2ecc71"
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'

      setTimeout(() => {
        btn.style.backgroundColor = ""
        btn.innerHTML = originalIcon
        footerInput.value = ""
      }, 3000)
    })
  }

  // Animation for social icons on page scroll entrance
  const observerOptions = {
    threshold: 0.1,
  }

  const footerObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const links = entry.target.querySelectorAll(".footer-nav-link")
        links.forEach((link, index) => {
          link.style.opacity = "0"
          link.style.transform = "translateY(10px)"
          link.style.transition = \`all 0.4s cubic-bezier(0.4, 0, 0.2, 1) \${index * 0.05}s\`

          requestAnimationFrame(() => {
            link.style.opacity = "1"
            link.style.transform = "translateY(0)"
          })
        })
        footerObserver.unobserve(entry.target)
      }
    })
  }, observerOptions)

  const navGrid = document.querySelector(".footer-nav-grid")
  if (navGrid) {
    footerObserver.observe(navGrid)
  }
})()
</script>`}
          ></Script>
        </div>
      </div>
    </div>
  )
}

export default Footer
