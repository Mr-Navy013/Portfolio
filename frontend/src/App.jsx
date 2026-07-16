import React, { useState, useEffect, useRef, useCallback } from 'react';
import './index.css';
import WelcomePage from './pages/WelcomePage';
import PortfolioPage from './pages/PortfolioPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import { getApiBase } from './utils/api';

const API_BASE = getApiBase();

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
  const [warmingUp, setWarmingUp] = useState(false); // shows "warming up" message after first fail

  const retryTimerRef = useRef(null);
  const fallbackTimerRef = useRef(null);
  const gotRealData = useRef(false);

  const clearTimers = () => {
    if (retryTimerRef.current) { clearInterval(retryTimerRef.current); retryTimerRef.current = null; }
    if (fallbackTimerRef.current) { clearTimeout(fallbackTimerRef.current); fallbackTimerRef.current = null; }
  };

  const attemptFetch = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/profile`, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const data = await res.json();
        setProfileData(data);
        gotRealData.current = true;
        setLoadingProfile(false);
        setWarmingUp(false);
        clearTimers();
        return true;
      }
    } catch (_) {}
    return false;
  }, []);

  const fetchProfile = useCallback(async (showLoader = false) => {
    if (showLoader) setLoadingProfile(true);
    gotRealData.current = false;
    clearTimers();

    // First attempt — fast (backend should be awake via UptimeRobot)
    const ok = await attemptFetch();
    if (ok) return;

    // Backend is cold-starting — show spinner + "warming up" text, retry every 3s
    setWarmingUp(true);
    retryTimerRef.current = setInterval(async () => {
      if (gotRealData.current) { clearTimers(); return; }
      await attemptFetch();
    }, 3000);

    // After 2 minutes, give up — show empty state (backend is genuinely down)
    fallbackTimerRef.current = setTimeout(() => {
      clearTimers();
      if (!gotRealData.current) {
        setProfileData({ username: '', bio: '', linkedin: '', github: '', instagram: '', facebook: '', profile_picture: null, resume_url: null });
        setLoadingProfile(false);
        setWarmingUp(false);
      }
    }, 120000);
  }, [attemptFetch]);

  useEffect(() => {
    fetchProfile(true);
    return clearTimers;
  }, []);

  // Keep-alive ping every 9 min — prevents Render free-tier 15-min sleep
  useEffect(() => {
    const ping = () => fetch(`${API_BASE}/health`).catch(() => {});
    ping();
    const id = setInterval(ping, 9 * 60 * 1000);
    return () => clearInterval(id);
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
        fontFamily: 'Outfit, sans-serif',
        gap: '1.5rem'
      }}>
        <div className="premium-loader" />
        <div style={{ textAlign: 'center' }}>
          <div className="pulse-text" style={{ fontSize: '1rem', fontWeight: 500, color: '#a0aec0', letterSpacing: '1px' }}>
            {warmingUp ? 'Server warming up, please wait...' : 'Loading Portfolio...'}
          </div>
          {warmingUp && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#4a5568' }}>
              This may take up to 30 seconds on first visit
            </div>
          )}
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
