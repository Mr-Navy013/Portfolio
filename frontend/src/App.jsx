import React, { useState, useEffect, useRef, useCallback } from 'react';
import './index.css';
import WelcomePage from './pages/WelcomePage';
import PortfolioPage from './pages/PortfolioPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import { getApiBase } from './utils/api';

const API_BASE = getApiBase();

// Fallback data — shown only if backend is completely unreachable
const FALLBACK_PROFILE = {
  username: 'Navycut',
  email: 'navycutdehury@gmail.com',
  phone: '+91 9999999999',
  linkedin: '',
  github: '',
  instagram: '',
  facebook: '',
  bio: 'Welcome to my space! I create modular, fast-loading, state-of-the-art full-stack applications.',
  profile_picture: null,
  resume_url: null
};

function App() {
  const [currentPage, setCurrentPage] = useState(() => {
    const saved = localStorage.getItem('currentPage');
    const token = localStorage.getItem('ownerToken');
    if (saved === 'dashboard' && !token) return 'login';
    return saved || 'welcome';
  });
  const [previousPage, setPreviousPage] = useState('welcome');
  const [authToken, setAuthToken] = useState(localStorage.getItem('ownerToken') || null);
  const [profileData, setProfileData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Ref to track background polling interval so we can cancel it
  const bgPollRef = useRef(null);
  const fetchedRealData = useRef(false);

  // Single fetch attempt — returns true on success
  const tryFetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/profile`, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const data = await res.json();
        setProfileData(data);
        fetchedRealData.current = true;
        return true;
      }
    } catch (err) {
      // network error or timeout — ignore, keep retrying
    }
    return false;
  }, []);

  // Start background polling every `intervalMs` until real data is fetched
  const startBackgroundPolling = useCallback((intervalMs = 5000) => {
    if (bgPollRef.current) return; // already polling
    bgPollRef.current = setInterval(async () => {
      if (fetchedRealData.current) {
        clearInterval(bgPollRef.current);
        bgPollRef.current = null;
        return;
      }
      const ok = await tryFetchProfile();
      if (ok) {
        clearInterval(bgPollRef.current);
        bgPollRef.current = null;
      }
    }, intervalMs);
  }, [tryFetchProfile]);

  // Main profile loader: quick attempts first, then fallback + background poll
  const fetchProfile = useCallback(async (showLoader = false) => {
    if (showLoader) setLoadingProfile(true);
    fetchedRealData.current = false;

    // Quick burst: try 2 times × 2s (4s max) — covers fast backend
    for (let i = 0; i < 2; i++) {
      const ok = await tryFetchProfile();
      if (ok) {
        setLoadingProfile(false);
        return;
      }
      if (i < 1) await new Promise(r => setTimeout(r, 2000));
    }

    // Backend is slow (Render cold start) — show fallback immediately, keep polling in bg
    setProfileData(prev => prev || FALLBACK_PROFILE);
    setLoadingProfile(false);

    // Background poll every 6s until real data arrives (up to ~2 minutes)
    startBackgroundPolling(6000);
    setTimeout(() => {
      if (!fetchedRealData.current) {
        clearInterval(bgPollRef.current);
        bgPollRef.current = null;
      }
    }, 120000);
  }, [tryFetchProfile, startBackgroundPolling]);

  useEffect(() => {
    fetchProfile(true);
    return () => {
      if (bgPollRef.current) {
        clearInterval(bgPollRef.current);
        bgPollRef.current = null;
      }
    };
  }, []);

  const handleLoginSuccess = (token) => {
    setAuthToken(token);
    localStorage.setItem('ownerToken', token);
    setCurrentPage('dashboard');
    localStorage.setItem('currentPage', 'dashboard');
    sessionStorage.setItem('justLoggedIn', 'true');
    fetchProfile(false);
  };

  const handleLogout = () => {
    setAuthToken(null);
    localStorage.removeItem('ownerToken');
    setCurrentPage('welcome');
    localStorage.setItem('currentPage', 'welcome');
  };

  const navigateTo = (page) => {
    if (page === 'dashboard' && !authToken) {
      setCurrentPage('login');
      localStorage.setItem('currentPage', 'login');
    } else {
      setPreviousPage(currentPage);
      setCurrentPage(page);
      localStorage.setItem('currentPage', page);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loadingProfile) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100vw',
        height: '100vh',
        backgroundColor: '#020202',
        color: '#ffffff',
        fontFamily: 'Outfit, sans-serif'
      }}>
        <div className="premium-loader"></div>
        <div className="pulse-text" style={{
          marginTop: '1.5rem',
          fontSize: '1rem',
          fontWeight: '500',
          color: '#a0aec0',
          letterSpacing: '1px',
          textAlign: 'center',
          padding: '0 2rem'
        }}>
          Loading Portfolio...
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', minHeight: '100vh', backgroundColor: '#020202' }}>
      {currentPage === 'welcome' && (
        <WelcomePage navigateTo={navigateTo} />
      )}
      {currentPage === 'portfolio' && (
        <PortfolioPage
          navigateTo={navigateTo}
          profile={profileData}
          refreshProfile={() => fetchProfile(false)}
          cameFrom={previousPage}
        />
      )}
      {currentPage === 'login' && (
        <LoginPage navigateTo={navigateTo} onLoginSuccess={handleLoginSuccess} />
      )}
      {currentPage === 'dashboard' && (
        <DashboardPage
          navigateTo={navigateTo}
          authToken={authToken}
          onLogout={handleLogout}
          profile={profileData}
          refreshProfile={() => fetchProfile(false)}
        />
      )}
    </div>
  );
}

export default App;
