import React, { useState, useEffect } from 'react';
import { Eye, ShieldAlert, Sparkles } from 'lucide-react';
import '../styles/welcome.css';

function WelcomePage({ navigateTo }) {
  const [showThankYou, setShowThankYou] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowThankYou(true), 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="welcome-container">
      {/* Decorative background orbs */}
      <div className="portfolio-orb portfolio-orb-1" />
      <div className="portfolio-orb portfolio-orb-2" />
      <div className="portfolio-orb portfolio-orb-3" />
      {/* Header text */}
      <div className="welcome-header">
        <h1 className="welcome-title">
          WELCOME
        </h1>

        <div className={`welcome-thankyou-wrap ${showThankYou ? 'show' : ''}`}>
          <p className="welcome-thankyou-text" style={{ textTransform: 'none', letterSpacing: '1px' }}>
            Let's dive into my projects! and explore what's inside! 
          </p>
        </div>
      </div>

      {/* Welcome Card */}
      <div className="glass-panel welcome-card">
        <p className="welcome-card-desc">
          Choose your perspective to explore projects, experience, and premium design.
        </p>

        <div className="welcome-btn-group">
          <button
            id="btn-enter-viewer"
            onClick={() => navigateTo('portfolio')}
            className="glass-btn welcome-action-btn"
          >
            <Eye size={20} />
            Enter as Viewer or recruiter
          </button>

          <div className="welcome-divider">
            <hr className="welcome-divider-line" />
            <span className="welcome-divider-text">OR</span>
            <hr className="welcome-divider-line" />
          </div>

          <button
            id="btn-access-owner"
            onClick={() => navigateTo('login')}
            className="glass-btn welcome-action-btn"
          >
            <ShieldAlert size={20} className="text-green" />
            Access as Owner
          </button>
        </div>
      </div>
    </div>
  );
}

export default WelcomePage;
