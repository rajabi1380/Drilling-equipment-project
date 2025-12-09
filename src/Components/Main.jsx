import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Main.css';

// Navbar Component
function Navbar() {
  return (
    <nav className="nav">
      <a href="#home" className="nav-link active">
        HOME
      </a>
      <a href="#about" className="nav-link">
        ABOUT ME
      </a>
      <a href="#services" className="nav-link">
        OUR SERVICES
      </a>
      <a href="#products" className="nav-link">
        OUR PRODUCTS
      </a>
      <a href="#companies" className="nav-link">
        COMPANIES
      </a>
      <a href="#contact" className="nav-link">
        CONTACT US
      </a>
      <a href="#facebook" className="nav-link facebook">
        f
      </a>
    </nav>
  );
}

// HeroSection Component
function HeroSection() {
  const navigate = useNavigate();

  return (
    <main className="hero">
      <div className="hero-overlay"></div>
      <div className="hero-content">
        <div className="hero-dots">
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
        <h1 className="hero-title">
          YOUR <span className="highlight">PARTNER</span>
        </h1>
        <p className="hero-subtitle">IN OIL AND GAS ENGINEERING</p>
        <button className="cta-button" onClick={() => navigate('/login')}>
          LEARN MORE
        </button>
      </div>
    </main>
  );
}

// FeatureCard Component
function FeatureCard({ icon, title, text }) {
  return (
    <div className="feature-card">
      <div className="feature-icon">
        {icon}
      </div>
      <h3 className="feature-title">{title}</h3>
      <p className="feature-text">{text}</p>
    </div>
  );
}

// Footer Component
function Footer() {
  return (
    <footer className="footer">
      <p>
        Copyright © 2016 | GE Oilfield Services Pte Ltd. All rights reserved.
        Web developed by <span className="footer-highlight">Izzaz</span>
      </p>
    </footer>
  );
}

// Main Component
export default function Main() {
  return (
    <div className="container">
      <header className="header">
        <div className="header-content">
          <div className="logo-section">
            <div className="logo">TEG</div>
            <div className="logo-text">
              <div>UPSTREAM</div>
              <div>DOWNSTREAM</div>
              <div>ENGINEERING</div>
              <div>MANUFACTURING</div>
            </div>
          </div>

          <Navbar />
        </div>
      </header>

      <HeroSection />

      <section className="features">
        <FeatureCard
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="3" y1="9" x2="21" y2="9"></line>
            <line x1="9" y1="21" x2="9" y2="9"></line>
          </svg>}
          title="RUTRUM CONGUE"
          text="Leo eget malesuada proin"
        />
        <FeatureCard
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>}
          title="QUAM VEHICULA"
          text="Leo eget malesuada proin"
        />
        <FeatureCard
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>}
          title="PORTA DAPIBUS"
          text="Leo eget malesuada proin"
        />
        <FeatureCard
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
          </svg>}
          title="ARCU ERAT SEM"
          text="Leo eget malesuada proin"
        />
      </section>

      <Footer />
    </div>
  );
}
