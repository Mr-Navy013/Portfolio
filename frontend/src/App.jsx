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

  // Default fallback profile so application renders instantly without spinning loader
  const DEFAULT_PROFILE = {
    id: 1,
    username: "Navycut",
    display_name: "Navy",
    bio: "I am a Frontend Developer and aspiring Data Analyst passionate about building responsive, user-friendly web applications and turning data into meaningful insights. I work with HTML, CSS, JavaScript, React, Node.js, Express.js, MySQL, Git, and GitHub, while also using Excel, SQL, Python, Power BI, and Tableau for data analysis and visualization. I enjoy creating clean, efficient, and scalable solutions that combine modern design with functionality. I am committed to continuous learning, improving my technical skills, and building impactful projects that solve real-world problems through technology and data-driven decision-making.",
    profile_picture: "/uploads/profile_picture-1782366940013-212164627.jpg",
    availability: "Available for Work",
    linkedin: "https://www.linkedin.com/in/navycut",
    github: "https://github.com/Mr-Navy013",
    instagram: "",
    facebook: "",
    resume_url: null
  };

  // SWR: load profile from cache instantly — no spinner on return visits
  const getCachedProfile = () => {
    try { const v = localStorage.getItem('cache_profile'); return v ? JSON.parse(v) : null; } catch { return null; }
  };
  const cachedProfile = getCachedProfile();
  const [profileData, setProfileData] = useState(cachedProfile || DEFAULT_PROFILE);
  const [loadingProfile, setLoadingProfile] = useState(false); // false = never block page rendering with spinner
  const [warmingUp, setWarmingUp] = useState(false);

  const retryTimerRef = useRef(null);
  const fallbackTimerRef = useRef(null);
  const gotRealData = useRef(false);

  const clearTimers = () => {
    if (retryTimerRef.current) { clearInterval(retryTimerRef.current); retryTimerRef.current = null; }
    if (fallbackTimerRef.current) { clearTimeout(fallbackTimerRef.current); fallbackTimerRef.current = null; }
  };

  const attemptFetch = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/profile`, { signal: AbortSignal.timeout(30000) });
      if (res.ok) {
        const data = await res.json();
        setProfileData(data);
        // Cache profile for SWR on next visit
        try { localStorage.setItem('cache_profile', JSON.stringify(data)); } catch {}
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
    if (showLoader && !profileData) setLoadingProfile(true);
    gotRealData.current = false;
    clearTimers();

    const ok = await attemptFetch();
    if (ok) return;

    // Retry quietly in background every 5s if backend is cold-starting
    retryTimerRef.current = setInterval(async () => {
      if (gotRealData.current) { clearTimers(); return; }
      await attemptFetch();
    }, 5000);

    fallbackTimerRef.current = setTimeout(() => {
      clearTimers();
      setLoadingProfile(false);
      setWarmingUp(false);
    }, 60000);
  }, [attemptFetch, profileData]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pageParam = params.get('page');
    if (pageParam === 'login') {
      setCurrentPage('login');
      localStorage.setItem('currentPage', 'login');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    fetchProfile(false);
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
          onLogout={handleLogout}
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
