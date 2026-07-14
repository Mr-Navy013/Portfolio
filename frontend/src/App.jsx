import React, { useState, useEffect } from 'react';
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
    if (saved === 'dashboard' && !token) {
      return 'login';
    }
    return saved || 'welcome';
  });
  const [previousPage, setPreviousPage] = useState('welcome');
  const [authToken, setAuthToken] = useState(localStorage.getItem('ownerToken') || null);
  const [profileData, setProfileData] = useState(null);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/profile`);
      if (res.ok) {
        const data = await res.json();
        setProfileData(data);
      }
    } catch (err) {
      // Backend not running yet — use default data
      setProfileData({
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
      });
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleLoginSuccess = (token) => {
    setAuthToken(token);
    localStorage.setItem('ownerToken', token);
    setCurrentPage('dashboard');
    localStorage.setItem('currentPage', 'dashboard');
    sessionStorage.setItem('justLoggedIn', 'true');
    fetchProfile();
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

  return (
    <div style={{ width: '100%', minHeight: '100vh', backgroundColor: '#020202' }}>
      {currentPage === 'welcome' && (
        <WelcomePage navigateTo={navigateTo} />
      )}
      {currentPage === 'portfolio' && (
        <PortfolioPage
          navigateTo={navigateTo}
          profile={profileData}
          refreshProfile={fetchProfile}
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
          refreshProfile={fetchProfile}
        />
      )}
    </div>
  );
}

export default App;
