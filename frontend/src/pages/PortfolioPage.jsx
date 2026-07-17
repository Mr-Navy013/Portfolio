import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Menu, X, Mail, Phone,
  ExternalLink, Code, GraduationCap, Briefcase, Award, Send,
  Download, FileText, CheckCircle, LogOut, User, Lock, ShieldCheck, Eye, EyeOff
} from 'lucide-react';
import { Linkedin, Github, Instagram, Facebook } from '../components/BrandIcons';
import '../styles/portfolio.css';
import { getApiBase } from '../utils/api';

const API_BASE = getApiBase();
const BACKEND_BASE = API_BASE.replace('/api', '');

const resolveFileUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('http')) return url;
  return `${BACKEND_BASE}${url}`;
};

const formatDateStr = (str) => {
  if (!str) return '';
  if (/^\d{4}-\d{2}(-\d{2})?$/.test(str)) {
    const parts = str.split('-');
    const date = new Date(parts[0], parts[1] - 1, parts[2] ? parts[2] : 1);
    if (!isNaN(date.getTime())) {
      const options = parts[2] ? { day: 'numeric', month: 'short', year: 'numeric' } : { month: 'short', year: 'numeric' };
      return date.toLocaleDateString('en-US', options);
    }
  }
  return str;
};

function PortfolioPage({ navigateTo, profile, refreshProfile, cameFrom }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      const preventDefault = (e) => {
        if (!e.target.closest('.slide-in-left')) {
          e.preventDefault();
        }
      };
      document.addEventListener('touchmove', preventDefault, { passive: false });
      return () => {
        document.body.style.overflow = 'unset';
        document.removeEventListener('touchmove', preventDefault);
      };
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [mobileMenuOpen]);

  // SWR: load data instantly from localStorage cache, then update from server in background
  const getCached = (key, fallback) => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  };

  const [showHireModal, setShowHireModal] = useState(false);
  const [loadingData, setLoadingData] = useState(() => {
    // If we have cached data, don't show the loading spinner
    try { return !localStorage.getItem('cache_projects'); } catch { return true; }
  });
  const [projects, setProjects] = useState(() => getCached('cache_projects', []));
  const [education, setEducation] = useState(() => getCached('cache_education', []));
  const [skills, setSkills] = useState(() => getCached('cache_skills', []));
  const [experience, setExperience] = useState(() => getCached('cache_experience', []));
  const [certificates, setCertificates] = useState(() => getCached('cache_certificates', []));
  const [courses, setCourses] = useState(() => getCached('cache_courses', []));
  const [selectedExperience, setSelectedExperience] = useState(null);

  // Document Access Permission and Viewer states
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showSecureDocModal, setShowSecureDocModal] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [selectedDocName, setSelectedDocName] = useState('');
  const [viewerName, setViewerName] = useState('');
  const [viewerRequestEmail, setViewerRequestEmail] = useState('');
  const [requestPurpose, setRequestPurpose] = useState('');
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [secureDocUrl, setSecureDocUrl] = useState('');
  const [secureDocDisplayUrl, setSecureDocDisplayUrl] = useState('');

  useEffect(() => {
    if (secureDocUrl && secureDocUrl.startsWith('data:')) {
      try {
        const parts = secureDocUrl.split(',');
        const mime = parts[0].match(/:(.*?);/)[1];
        const b64 = parts[1];
        
        const byteCharacters = atob(b64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        
        setSecureDocDisplayUrl(blobUrl);
        
        return () => {
          URL.revokeObjectURL(blobUrl);
        };
      } catch (err) {
        console.error("Error creating blob URL from base64:", err);
        setSecureDocDisplayUrl(secureDocUrl);
      }
    } else {
      setSecureDocDisplayUrl(secureDocUrl);
    }
  }, [secureDocUrl]);
  const [secureDocName, setSecureDocName] = useState('');

  // Projects Slider and View Mode states
  const [projectSliderActiveIndex, setProjectSliderActiveIndex] = useState(0);
  const [projectMode, setProjectMode] = useState('slider'); // 'slider' | 'all'

  useEffect(() => {
    if (projects.length > 1) {
      setProjectSliderActiveIndex(1);
    } else {
      setProjectSliderActiveIndex(0);
    }
  }, [projects]);

  // Swipe & Drag gesture handlers
  const swipeStartX = useRef(0);
  const isDraggingMouse = useRef(false);
  const lastWheelTime = useRef(0);

  const handleTouchStart = (e) => {
    swipeStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    const diffX = e.changedTouches[0].clientX - swipeStartX.current;
    if (Math.abs(diffX) > 50) {
      if (diffX < 0) {
        setProjectSliderActiveIndex((prevVal) => (prevVal + 1) % projects.length);
      } else {
        setProjectSliderActiveIndex((prevVal) => (prevVal - 1 + projects.length) % projects.length);
      }
    }
  };

  const handleMouseDown = (e) => {
    // Only drag with primary mouse button click
    if (e.button !== 0) return;
    swipeStartX.current = e.clientX;
    isDraggingMouse.current = true;
  };

  const handleMouseUp = (e) => {
    if (!isDraggingMouse.current) return;
    isDraggingMouse.current = false;
    const diffX = e.clientX - swipeStartX.current;
    if (Math.abs(diffX) > 50) {
      if (diffX < 0) {
        setProjectSliderActiveIndex((prevVal) => (prevVal + 1) % projects.length);
      } else {
        setProjectSliderActiveIndex((prevVal) => (prevVal - 1 + projects.length) % projects.length);
      }
    }
  };

  const handleMouseLeave = () => {
    isDraggingMouse.current = false;
  };

  const handleWheel = (e) => {
    if (Math.abs(e.deltaX) > 8) {
      // Prevent browser default back/forward swiping if needed
      e.preventDefault();
      const now = Date.now();
      if (now - lastWheelTime.current > 600) {
        if (e.deltaX > 0) {
          setProjectSliderActiveIndex((prevVal) => (prevVal + 1) % projects.length);
        } else {
          setProjectSliderActiveIndex((prevVal) => (prevVal - 1 + projects.length) % projects.length);
        }
        lastWheelTime.current = now;
      }
    }
  };

  const [viewerEmail, setViewerEmail] = useState('');
  const [purpose, setPurpose] = useState('hire');
  const [description, setDescription] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [contactEmail, setContactEmail] = useState('');
  const [contactPurpose, setContactPurpose] = useState('hire');
  const [contactDesc, setContactDesc] = useState('');
  const [contactSuccess, setContactSuccess] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    setAvatarError(false);
  }, [profile?.profile_picture]);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!showSecureDocModal) return;

    const handleKeyDown = (e) => {
      // Clear clipboard on Print Screen key
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        try {
          navigator.clipboard.writeText('');
        } catch (err) {}
        setToast({ show: true, message: 'Screenshots are disabled for this confidential document.', type: 'error' });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 2000);
      }
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
      }
      // Ctrl+Shift+I
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
      }
      // Ctrl+P (Print)
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        setToast({ show: true, message: 'Printing is disabled.', type: 'error' });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 2000);
      }
      // Ctrl+S (Save)
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [showSecureDocModal]);

  const sectionPollRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const t = Date.now();
      const [pRes, eRes, sRes, expRes, cRes, courseRes] = await Promise.all([
        fetch(`${API_BASE}/projects?t=${t}`,      { signal: AbortSignal.timeout(6000) }),
        fetch(`${API_BASE}/education?t=${t}`,     { signal: AbortSignal.timeout(6000) }),
        fetch(`${API_BASE}/skills?t=${t}`,        { signal: AbortSignal.timeout(6000) }),
        fetch(`${API_BASE}/experience?t=${t}`,    { signal: AbortSignal.timeout(6000) }),
        fetch(`${API_BASE}/certificates?t=${t}`,  { signal: AbortSignal.timeout(6000) }),
        fetch(`${API_BASE}/courses?t=${t}`,       { signal: AbortSignal.timeout(6000) })
      ]);
      if (pRes.ok)      { const d = await pRes.json(); setProjects(d); try { localStorage.setItem('cache_projects', JSON.stringify(d)); } catch {} }
      if (eRes.ok)      { const d = await eRes.json(); setEducation(d); try { localStorage.setItem('cache_education', JSON.stringify(d)); } catch {} }
      if (sRes.ok)      { const d = await sRes.json(); setSkills(d); try { localStorage.setItem('cache_skills', JSON.stringify(d)); } catch {} }
      if (expRes.ok)    { const d = await expRes.json(); setExperience(d); try { localStorage.setItem('cache_experience', JSON.stringify(d)); } catch {} }
      if (cRes.ok)      { const d = await cRes.json(); setCertificates(d); try { localStorage.setItem('cache_certificates', JSON.stringify(d)); } catch {} }
      if (courseRes.ok) { const d = await courseRes.json(); setCourses(d); try { localStorage.setItem('cache_courses', JSON.stringify(d)); } catch {} }
      setLoadingData(false);
      // Clear any retry polling on success
      if (sectionPollRef.current) { clearInterval(sectionPollRef.current); sectionPollRef.current = null; }
      return true;
    } catch (_) {
      // Backend unreachable — keep loadingData=true, retry every 3s
      if (!sectionPollRef.current) {
        sectionPollRef.current = setInterval(async () => {
          const ok = await fetchData();
          if (ok && sectionPollRef.current) { clearInterval(sectionPollRef.current); sectionPollRef.current = null; }
        }, 3000);
        // Stop polling after 2 min (show empty sections as last resort)
        setTimeout(() => {
          if (sectionPollRef.current) { clearInterval(sectionPollRef.current); sectionPollRef.current = null; }
          setLoadingData(false);
        }, 120000);
      }
      return false;
    }
  }, []);

  const handleOpenPermissionRequest = (docId, docName) => {
    setSelectedDocId(docId);
    setSelectedDocName(docName);
    setRequestSubmitted(false);
    setShowRequestModal(true);
  };

  const handleSendPermissionRequest = async (e) => {
    e.preventDefault();
    if (!viewerName || !viewerRequestEmail) {
      setToast({ show: true, message: 'Name and Email are required.', type: 'error' });
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/document-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          viewer_name: viewerName,
          viewer_email: viewerRequestEmail,
          purpose: requestPurpose,
          document_id: selectedDocId,
          document_name: selectedDocName
        })
      });

      if (res.ok) {
        setRequestSubmitted(true);
        setToast({ show: true, message: 'Request sent successfully!', type: 'success' });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 2000);
      } else {
        const data = await res.json();
        setToast({ show: true, message: data.message || 'Request failed.', type: 'error' });
      }
    } catch (err) {
      setToast({ show: true, message: 'Connection error.', type: 'error' });
    }
  };

  const handleVerifyAccessToken = async (e) => {
    e.preventDefault();
    setVerifyError('');
    if (!verifyEmail || !verifyToken) {
      setVerifyError('Email and Verification Token are required.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/document-requests/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: verifyEmail,
          token: verifyToken,
          document_id: selectedDocId
        })
      });

      const data = await res.json();

      if (res.ok) {
        setToast({ show: true, message: 'Access verification successful!', type: 'success' });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 2000);
        setShowVerifyModal(false);

        // Open secure document viewer modal!
        const fullUrl = resolveFileUrl(data.document_url);
        setSecureDocUrl(fullUrl);
        setSecureDocName(selectedDocName);
        setShowSecureDocModal(true);
      } else {
        setVerifyError(data.message || 'Invalid email or token.');
      }
    } catch (err) {
      setVerifyError('Connection error verifying token.');
    }
  };

  const handleHireSubmit = async (e) => {
    e.preventDefault();
    if (!viewerEmail || !description) { setErrorMsg('Email and description are required.'); return; }
    setIsSending(true); setErrorMsg('');
    try {
      // 0.5 seconds delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const res = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_email: viewerEmail, purpose, description })
      });
      if (res.ok) {
        setToast({ show: true, message: "Message sent successfully! Navy will get back to you soon.", type: 'success' });
        setViewerEmail(''); setDescription('');
        setShowHireModal(false);
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 1500);
      } else {
        const err = await res.json();
        setErrorMsg(err.message || 'Failed to send message.');
      }
    } catch {
      setToast({ show: true, message: 'Message sent successfully! Navy will get back to you soon.', type: 'success' });
      setViewerEmail(''); setDescription('');
      setShowHireModal(false);
      setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 1500);
    } finally { setIsSending(false); }
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactEmail || !contactDesc) return;
    try {
      // 0.5 seconds delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_email: contactEmail, purpose: contactPurpose, description: contactDesc })
      });
      setToast({ show: true, message: 'Message sent successfully! Thank you for reaching out.', type: 'success' });
      setContactEmail(''); setContactDesc('');
      setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 1500);
    } catch {
      setToast({ show: true, message: 'Message sent successfully! Thank you for reaching out.', type: 'success' });
      setContactEmail(''); setContactDesc('');
      setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 1500);
    }
  };

  const groupedSkills = skills.reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  const BACKEND_BASE = API_BASE.replace('/api', '');
  const name = profile?.display_name || profile?.username || 'Navy';
  const email = profile?.email || 'navycutdehury@gmail.com';
  const phone = profile?.phone || '+91 9999999999';
  const bio = profile?.bio || 'I craft modular, fast-loading, state-of-the-art full-stack applications with clean code and premium UI/UX.';
  const isAvatarPublic = profile?.is_avatar_public !== 0 && profile?.is_avatar_public !== false;
  const avatar = (profile?.profile_picture && isAvatarPublic) ? resolveFileUrl(profile.profile_picture) : null;
  const linkedin = profile?.linkedin || '';
  const github = profile?.github || '';
  const instagram = profile?.instagram || '';
  const facebook = profile?.facebook || '';
  const isResumePublic = profile?.is_resume_public !== 0 && profile?.is_resume_public !== false;
  const resumeUrl = (profile?.resume_url && isResumePublic) ? resolveFileUrl(profile.resume_url) : null;
  const resumeExistsButPrivate = profile?.resume_url && !isResumePublic;

  const navLinks = [
    { href: '#about', label: 'About' },
    { href: '#skills', label: 'Skills' },
    { href: '#education', label: 'Education' },
    { href: '#courses', label: 'Courses' },
    { href: '#projects', label: 'Projects' },
    { href: '#experience', label: 'Experience' },
    { href: '#certificates', label: 'Certifications' },
    { href: '#contact', label: 'Contact' }
  ];

  return (
    <div className="portfolio-page">

      {/* Decorative background */}
      <div className="portfolio-grid-bg" />
      <div className="portfolio-orb portfolio-orb-1" />
      <div className="portfolio-orb portfolio-orb-2" />
      <div className="portfolio-orb portfolio-orb-3" />

      {/* ── FIXED NAVBAR ── */}
      <nav className="pf-navbar glass-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            className="pf-menu-btn-left"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          {/* Logo */}
          <div className="pf-logo" onClick={() => navigateTo('welcome')}>
            <span className="pf-logo-dot" />
            <span className="pf-logo-text">
              {(name.toLowerCase().includes('portfolio') ? name : `${name}'s Portfolio`).toUpperCase()}<span className="text-green">.</span>
            </span>
          </div>
        </div>

        {/* Desktop nav links — center */}
        <div className="pf-nav-links">
          {navLinks.map(l => (
            <a key={l.href} href={l.href} className="pf-nav-link">{l.label}</a>
          ))}
        </div>

        {/* Right actions */}
        <div className="pf-nav-actions">
          <button id="hire-me-nav" onClick={() => setShowHireModal(true)} className="glass-btn pf-hire-btn">
            Hire Me
          </button>
          <button id="exit-viewer-nav" onClick={() => navigateTo(cameFrom === 'dashboard' ? 'dashboard' : 'welcome')} className="glass-btn-danger pf-exit-btn">
            <LogOut size={15} /> Back
          </button>
        </div>
      </nav>

      {/* ── Mobile Sidebar ── */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1000 }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="glass-panel slide-in-left" 
            style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              width: '280px', 
              height: '100vh', 
              background: 'rgba(10, 15, 12, 0.98)', 
              borderRight: '1px solid rgba(0, 255, 136, 0.15)', 
              zIndex: 1001, 
              padding: '2rem 1.5rem 4.5rem 1.5rem', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.5rem', 
              boxShadow: '12px 0 40px rgba(0, 0, 0, 0.6)', 
              overflowY: 'auto',
              boxSizing: 'border-box',
              overscrollBehavior: 'contain'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(0, 255, 136, 0.1)' }}>
              <span style={{ fontWeight: 800, color: '#00ff88', fontSize: '0.85rem', letterSpacing: '3px' }}>MENU</span>
              <button 
                type="button"
                onClick={() => setMobileMenuOpen(false)} 
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#00ff88', cursor: 'pointer', borderRadius: '8px', padding: '0.3rem', display: 'flex', alignItems: 'center' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Profile Avatar Section at top of mobile menu */}
            <div style={{ textAlign: 'center', paddingBottom: '1.25rem', borderBottom: '1px solid rgba(0, 255, 136, 0.1)', marginBottom: '0.5rem' }}>
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  margin: '0 auto 0.6rem',
                  border: '2px solid var(--accent-green)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255,255,255,0.02)'
                }}
              >
                {avatar ? (
                  <img
                    src={avatar}
                    alt="Avatar"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <User size={30} className="text-green" style={{ opacity: 0.8 }} />
                )}
              </div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>{name}</h4>
            </div>

            <nav className="pf-mobile-nav" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
              {navLinks.map(l => (
                <a
                  key={l.href}
                  href={l.href}
                  className="glass-btn-secondary"
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.8rem', 
                    color: '#fff', 
                    textDecoration: 'none', 
                    padding: '0.8rem 1rem', 
                    borderRadius: '12px',
                    width: '100%',
                    boxSizing: 'border-box',
                    transition: 'all 0.3s ease',
                    justifyContent: 'flex-start'
                  }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {l.href === '#about' && <User size={18} className="text-green" />}
                  {l.href === '#skills' && <CheckCircle size={18} className="text-green" />}
                  {l.href === '#education' && <GraduationCap size={18} className="text-green" />}
                  {l.href === '#courses' && <GraduationCap size={18} className="text-green" />}
                  {l.href === '#projects' && <Code size={18} className="text-green" />}
                  {l.href === '#experience' && <Briefcase size={18} className="text-green" />}
                  {l.href === '#certs' && <Award size={18} className="text-green" />}
                  {l.href === '#contact' && <Mail size={18} className="text-green" />}
                  {l.label}
                </a>
              ))}
            </nav>

            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={() => { setMobileMenuOpen(false); setShowHireModal(true); }}
                className="glass-btn"
                style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Send size={16} /> Hire Me
              </button>
              <button
                onClick={() => navigateTo(cameFrom === 'dashboard' ? 'dashboard' : 'welcome')}
                className="glass-btn-secondary"
                style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {cameFrom === 'dashboard' ? '← Back' : '← Back to Home'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HERO / ABOUT ── */}
      <section id="about" className="section-wrapper pf-hero-section">
        <div className="pf-hero-grid">

          {/* Left: Info card */}
          <div className="glass-panel pf-hero-card">
            <div className="pf-hero-card-glow" />
            <p className="pf-hero-badge">✦ Creative Developer</p>
            <h1 className="pf-hero-title">
              I'm <span className="portfolio-owner-name">{name}</span>
            </h1>
            <p className="pf-hero-bio">{bio}</p>

            {/* Social links */}
            <div className="pf-socials">
              {linkedin && (
                <a href={linkedin} target="_blank" rel="noreferrer" className="glass-btn-secondary pf-social-btn">
                  <Linkedin size={16} style={{ color: '#00ff88' }} /> LinkedIn
                </a>
              )}
              {github && (
                <a href={github} target="_blank" rel="noreferrer" className="glass-btn-secondary pf-social-btn">
                  <Github size={16} style={{ color: '#00ff88' }} /> GitHub
                </a>
              )}
              {profile?.instagram && (
                <a href={profile.instagram} target="_blank" rel="noreferrer" className="glass-btn-secondary pf-social-btn">
                  <Instagram size={16} style={{ color: '#00ff88' }} /> Instagram
                </a>
              )}
              {profile?.facebook && (
                <a href={profile.facebook} target="_blank" rel="noreferrer" className="glass-btn-secondary pf-social-btn">
                  <Facebook size={16} style={{ color: '#00ff88' }} /> Facebook
                </a>
              )}
            </div>

            {/* CTA buttons */}
            <div className="pf-hero-cta">
              <button id="hire-me-hero" onClick={() => setShowHireModal(true)} className="glass-btn pf-cta-btn">
                <Send size={17} /> Hire Me
              </button>
              {resumeUrl ? (
                <a href={resumeUrl} target="_blank" rel="noreferrer" className="glass-btn-secondary pf-cta-btn">
                  <Download size={17} style={{ color: '#00ff88' }} /> View Resume
                </a>
              ) : (
                <button
                  className="glass-btn-secondary pf-cta-btn"
                  onClick={() => {
                    if (resumeExistsButPrivate) {
                      handleOpenPermissionRequest('resume', 'Resume/CV');
                    } else {
                      setToast({ show: true, message: 'Resume not uploaded yet by the owner.', type: 'warning' });
                      setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 2000);
                    }
                  }}
                >
                  <FileText size={17} style={{ color: '#00ff88' }} /> View Resume
                </button>
              )}
            </div>
          </div>

          {/* Right: Avatar */}
          <div className="pf-avatar-col">
            <div className="pf-avatar-border">
              {avatar && !avatarError ? (
                <img 
                  src={avatar} 
                  alt={name} 
                  className="pf-avatar-img" 
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div className="pf-avatar-placeholder">
                  NA
                </div>
              )}
            </div>
            {/* Floating badge */}
            <div className="pf-avatar-badge">
              <span className="pf-avatar-badge-dot" />
              {profile?.availability || 'Available for Work'}
            </div>
          </div>

        </div>
      </section>

      {/* ── SKILLS ── */}
      <section id="skills" className="section-wrapper">
        <h2 className="section-title"><span className="text-green">Skills</span></h2>
        {Object.keys(groupedSkills).length > 0 ? (
          <div className="grid-2">
            {Object.entries(groupedSkills).map(([cat, list]) => (
              <div key={cat} className="glass-panel pf-skill-card">
                <h3 className="pf-skill-cat-title">{cat}</h3>
                <div className="pf-skill-list">
                  {list.map(skill => (
                    <div key={skill.id} className="pf-skill-item" style={{ marginBottom: '0.5rem' }}>
                      <div className="pf-skill-item-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{skill.name}</span>
                        <span className="text-green pf-skill-level" style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(0, 255, 136, 0.08)', border: '1px solid rgba(0, 255, 136, 0.2)' }}>
                          {skill.knowledge_level || 'basic'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : loadingData ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2.5rem' }}>
            <div className="premium-loader" style={{ width: '36px', height: '36px' }} />
          </div>
        ) : (
          <div className="glass-card pf-empty-state">No skills data yet.</div>
        )}
      </section>

      {/* ── EDUCATION ── */}
      <section id="education" className="section-wrapper">
        <h2 className="section-title"><span className="text-green">Education</span></h2>
        <div className="pf-timeline-list">
          {education.length > 0 ? education.map(edu => (
            <div key={edu.id} className="glass-card pf-timeline-card">
              <div className="pf-timeline-icon">
                <GraduationCap size={26} />
              </div>
              <div className="pf-timeline-content">
                <div className="pf-timeline-header" style={{ display: 'block', marginBottom: '0.4rem' }}>
                  <h3 className="pf-timeline-title">{edu.school}</h3>
                  <div className="text-green pf-timeline-date" style={{ marginTop: '0.2rem', fontSize: '0.85rem' }}>{formatDateStr(edu.end_date)}</div>
                </div>
                <p className="pf-timeline-sub">
                  {edu.degree === '10th' ? '10th (Secondary School - SSC)' : 
                   edu.degree === '12th' ? '12th (Intermediate)' : 
                   `${edu.degree}${edu.field_of_study ? ` in ${edu.field_of_study}` : ''}`}
                </p>
                {edu.description && <p className="pf-timeline-desc">{edu.description}</p>}

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.8rem', flexWrap: 'wrap' }}>
                  {edu.degree === '10th' && edu.certificate_10th && (
                    edu.access_cert10 === 1 || edu.access_cert10 === 'true' || edu.access_cert10 === true ? (
                      <a 
                        href={resolveFileUrl(edu.certificate_10th)}
                        target="_blank"
                        rel="noreferrer"
                        className="glass-btn" 
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', gap: '0.4rem', height: 'auto', display: 'flex', alignItems: 'center', textDecoration: 'none' }}
                      >
                        <Eye size={12} /> View 10th Certificate
                      </a>
                    ) : (
                      <button 
                        onClick={() => handleOpenPermissionRequest(`edu_${edu.id}_cert10`, '10th Certificate')} 
                        className="glass-btn" 
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', gap: '0.4rem', height: 'auto' }}
                      >
                        <Lock size={12} /> View 10th Certificate
                      </button>
                    )
                  )}
                  {edu.degree === '12th' && edu.certificate_12th && (
                    edu.access_cert12 === 1 || edu.access_cert12 === 'true' || edu.access_cert12 === true ? (
                      <a 
                        href={resolveFileUrl(edu.certificate_12th)}
                        target="_blank"
                        rel="noreferrer"
                        className="glass-btn" 
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', gap: '0.4rem', height: 'auto', display: 'flex', alignItems: 'center', textDecoration: 'none' }}
                      >
                        <Eye size={12} /> View 12th Certificate
                      </a>
                    ) : (
                      <button 
                        onClick={() => handleOpenPermissionRequest(`edu_${edu.id}_cert12`, '12th Certificate')} 
                        className="glass-btn" 
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', gap: '0.4rem', height: 'auto' }}
                      >
                        <Lock size={12} /> View 12th Certificate
                      </button>
                    )
                  )}
                  {edu.degree === 'Bachelor' && edu.certificate_bachelor && (
                    edu.access_certbach === 1 || edu.access_certbach === 'true' || edu.access_certbach === true ? (
                      <a 
                        href={resolveFileUrl(edu.certificate_bachelor)}
                        target="_blank"
                        rel="noreferrer"
                        className="glass-btn" 
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', gap: '0.4rem', height: 'auto', display: 'flex', alignItems: 'center', textDecoration: 'none' }}
                      >
                        <Eye size={12} /> View Degree Certificate
                      </a>
                    ) : (
                      <button 
                        onClick={() => handleOpenPermissionRequest(`edu_${edu.id}_certbach`, 'Consolidated Degree Certificate')} 
                        className="glass-btn" 
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', gap: '0.4rem', height: 'auto' }}
                      >
                        <Lock size={12} /> View Degree Certificate
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          )) : loadingData ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2.5rem' }}>
              <div className="premium-loader" style={{ width: '36px', height: '36px' }} />
            </div>
          ) : <div className="glass-card pf-empty-state">No education data yet.</div>}
        </div>
      </section>

      {/* ── COURSES ── */}
      <section id="courses" className="section-wrapper">
        <h2 className="section-title"><span className="text-green">Courses</span></h2>
        {courses.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {courses.map(course => (
              <div key={course.id} className="glass-panel pf-course-card" style={{ padding: '1.5rem', borderLeft: '3px solid var(--accent-green)', display: 'flex', flexDirection: 'column', gap: '0.5rem', transition: 'transform 0.25s ease' }}>
                <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: '#fff' }}>{course.name}</h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{course.description}</p>
              </div>
            ))}
          </div>
        ) : loadingData ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2.5rem' }}>
            <div className="premium-loader" style={{ width: '36px', height: '36px' }} />
          </div>
        ) : (
          <div className="glass-card pf-empty-state">No courses added yet.</div>
        )}
      </section>

      {/* ── PROJECTS ── */}
      <section id="projects" className="section-wrapper">
        <style>{`
          .pf-project-card {
            max-height: 380px !important;
          }
          .pf-project-card .pf-project-thumb {
            height: 140px !important;
          }
          .pf-project-card .pf-project-thumb-placeholder {
            height: 120px !important;
          }
          .pf-project-card .pf-project-body {
            padding: 1rem !important;
            gap: 0.6rem !important;
          }
          .pf-project-card .pf-project-summary {
            font-size: 0.82rem !important;
            line-height: 1.35 !important;
            height: 52px !important;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
          }
          .pf-projects-all-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 1.25rem;
            margin-top: 1.5rem;
          }
          @media (min-width: 576px) {
            .pf-projects-all-grid { grid-template-columns: 1fr 1fr; }
          }
          @media (min-width: 992px) {
            .pf-projects-all-grid { grid-template-columns: repeat(3, 1fr); }
          }
          @media (min-width: 1200px) {
            .pf-projects-all-grid { grid-template-columns: repeat(5, 1fr); }
          }
          .pf-project-card-small {
            transform: none !important;
            box-shadow: none !important;
            border: 1px solid var(--glass-border) !important;
            transition: border-color 0.25s ease !important;
          }
          .pf-project-card-small:hover {
            border-color: rgba(0, 255, 136, 0.35) !important;
            transform: translateY(-2px) !important;
            box-shadow: 0 8px 24px rgba(0, 255, 136, 0.08) !important;
          }
          .pf-project-card-small .pf-project-image-wrap {
            height: 110px !important;
          }
          .pf-project-card-small .pf-project-title {
            font-size: 0.9rem !important;
          }
          .pf-project-card-small .pf-project-summary {
            font-size: 0.72rem !important;
            line-height: 1.3 !important;
            height: 48px !important;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
          }
          .pf-project-card-small .pf-project-body {
            padding: 0.75rem !important;
            gap: 0.5rem !important;
          }
          .pf-project-card-small .pf-project-link-btn {
            padding: 0.35rem 0.6rem !important;
            font-size: 0.7rem !important;
            gap: 0.25rem !important;
          }
          .pf-project-card-small .pf-project-undeployed {
            font-size: 0.7rem !important;
            padding: 0.35rem 0.6rem !important;
          }
          /* Certificate smaller styling */
          .pf-cert-card {
            padding: 0.75rem 1rem !important;
            gap: 0.8rem !important;
          }
          .pf-cert-title {
            font-size: 0.9rem !important;
          }
          .pf-cert-meta {
            font-size: 0.75rem !important;
          }
        `}</style>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 className="section-title" style={{ margin: 0 }}><span className="text-green">Projects</span></h2>
          {projects.length > 0 && (
            <button 
              onClick={() => setProjectMode(projectMode === 'slider' ? 'all' : 'slider')}
              className="glass-btn"
              style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
            >
              {projectMode === 'slider' ? 'View All Projects' : 'View Slider'}
            </button>
          )}
        </div>

        {projects.length > 0 ? (
          projectMode === 'slider' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
              <div 
                className="pf-projects-slider-container" 
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onWheel={handleWheel}
                style={{ 
                  position: 'relative',
                  width: '100%', 
                  overflow: 'hidden', 
                  margin: '1.5rem 0', 
                  minHeight: '390px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  userSelect: 'none'
                }}
              >
                {(() => {
                  const items = [];
                  if (projects.length === 1) {
                    items.push({ idx: 0, position: 'center' });
                  } else if (projects.length === 2) {
                    items.push(
                      { idx: 0, position: 'left' },
                      { idx: 1, position: 'center' }
                    );
                  } else {
                    const prevIdx = (projectSliderActiveIndex - 1 + projects.length) % projects.length;
                    const currIdx = projectSliderActiveIndex;
                    const nextIdx = (projectSliderActiveIndex + 1) % projects.length;
                    items.push(
                      { idx: prevIdx, position: 'left' },
                      { idx: currIdx, position: 'center' },
                      { idx: nextIdx, position: 'right' }
                    );
                  }

                  return (
                    <div 
                      className="pf-projects-track"
                      style={{
                        display: 'flex',
                        gap: 'var(--proj-card-gap)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%'
                      }}
                    >
                      {items.map((item) => {
                        const proj = projects[item.idx];
                        if (!proj) return null;
                        const isActive = item.position === 'center';
                        return (
                          <div 
                            key={proj.id} 
                            className={`glass-panel pf-project-card ${isActive ? 'pf-active-card' : ''}`} 
                            onClick={() => {
                              if (item.position === 'left') {
                                setProjectSliderActiveIndex((prevVal) => (prevVal - 1 + projects.length) % projects.length);
                              } else if (item.position === 'right') {
                                setProjectSliderActiveIndex((prevVal) => (prevVal + 1) % projects.length);
                              }
                            }}
                            style={{
                              width: 'var(--proj-card-width)',
                              minWidth: 'var(--proj-card-width)',
                              maxWidth: 'var(--proj-card-width)',
                              height: '345px',
                              transform: isActive ? 'scale(1.06)' : 'scale(0.92)',
                              border: isActive ? '1px solid var(--accent-green)' : '1px solid var(--glass-border)',
                              boxShadow: isActive ? '0 10px 30px rgba(0, 255, 136, 0.15)' : 'none',
                              transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                              opacity: isActive ? 1 : 0.45,
                              zIndex: isActive ? 10 : 1,
                              display: 'flex',
                              flexDirection: 'column',
                              cursor: isActive ? 'default' : 'pointer',
                              flexShrink: 0
                            }}
                          >
                            <div className="pf-project-image-wrap">
                              {proj.thumbnail ? (
                                <img
                                  src={resolveFileUrl(proj.thumbnail)}
                                  alt={proj.title}
                                  className="pf-project-thumb"
                                />
                              ) : (
                                <div className="pf-project-thumb-placeholder">
                                  <Code size={40} style={{ color: 'rgba(0,255,136,0.35)' }} />
                                  <span className="pf-project-thumb-label">Preview Unavailable</span>
                                </div>
                              )}
                            </div>
                            <div className="pf-project-body" style={{ padding: '1.2rem' }}>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <h3 className="pf-project-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '0 0 0.4rem 0', fontSize: '1.1rem' }}>{proj.title}</h3>
                                <p className="pf-project-summary" style={{ height: '3em', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', fontSize: '0.82rem', lineHeight: '1.5', margin: 0 }}>{proj.summary}</p>
                              </div>
                              <div className="pf-project-links" style={{ gap: '0.6rem' }}>
                                <a 
                                  href={proj.repo_link} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="glass-btn-secondary pf-project-link-btn"
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ padding: '0.4rem', fontSize: '0.78rem' }}
                                >
                                  <Github size={15} /> Source
                                </a>
                                {proj.is_deployed && proj.live_link ? (
                                  <a 
                                    href={proj.live_link} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="glass-btn pf-project-link-btn"
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ padding: '0.4rem', fontSize: '0.78rem' }}
                                  >
                                    <ExternalLink size={15} /> Live
                                  </a>
                                ) : (
                                  <div className="pf-project-undeployed" style={{ padding: '0.4rem', fontSize: '0.78rem' }}>Undeployed</div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {projects.length > 1 && (
                <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', alignItems: 'center', marginTop: '1rem' }}>
                  <button 
                    onClick={() => setProjectSliderActiveIndex((prevVal) => (prevVal - 1 + projects.length) % projects.length)}
                    className="glass-btn-secondary"
                    style={{ padding: '0.45rem 1.2rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    ◀ Prev
                  </button>
                  <button 
                    onClick={() => setProjectSliderActiveIndex((prevVal) => (prevVal + 1) % projects.length)}
                    className="glass-btn-secondary"
                    style={{ padding: '0.45rem 1.2rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    Next ▶
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="pf-projects-all-grid">
              {projects.map(proj => (
                <div key={proj.id} className="glass-panel pf-project-card pf-project-card-small" style={{ display: 'flex', flexDirection: 'column', height: '390px' }}>
                  <div className="pf-project-image-wrap">
                    {proj.thumbnail ? (
                      <img
                        src={resolveFileUrl(proj.thumbnail)}
                        alt={proj.title}
                        className="pf-project-thumb"
                      />
                    ) : (
                      <div className="pf-project-thumb-placeholder">
                        <Code size={30} style={{ color: 'rgba(0,255,136,0.35)' }} />
                        <span className="pf-project-thumb-label">Preview Unavailable</span>
                      </div>
                    )}
                  </div>
                  <div className="pf-project-body">
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <h3 className="pf-project-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '0 0 0.5rem 0' }}>{proj.title}</h3>
                      <p className="pf-project-summary" style={{ height: '4.5em', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', fontSize: '0.88rem', lineHeight: '1.5', margin: 0 }}>{proj.summary}</p>
                    </div>
                    <div className="pf-project-links">
                      <a href={proj.repo_link} target="_blank" rel="noreferrer" className="glass-btn-secondary pf-project-link-btn">
                        <Github size={14} /> Source
                      </a>
                      {proj.is_deployed && proj.live_link ? (
                        <a href={proj.live_link} target="_blank" rel="noreferrer" className="glass-btn pf-project-link-btn">
                          <ExternalLink size={14} /> Live
                        </a>
                      ) : (
                        <div className="pf-project-undeployed">Undeployed</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : loadingData ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2.5rem' }}>
            <div className="premium-loader" style={{ width: '36px', height: '36px' }} />
          </div>
        ) : (
          <div className="glass-card pf-empty-state">No projects uploaded yet.</div>
        )}
      </section>

      {/* ── EXPERIENCE ── */}
      <section id="experience" className="section-wrapper">
        <h2 className="section-title"><span className="text-green">Experience</span></h2>
        <div className="pf-timeline-list">
          {experience.length > 0 ? experience.map(exp => (
            <div 
              key={exp.id} 
              className="glass-card pf-timeline-card"
              onClick={() => setSelectedExperience(exp)}
              style={{ cursor: 'pointer', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 10px 20px rgba(0, 255, 136, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div className="pf-timeline-icon">
                <Briefcase size={26} />
              </div>
              <div className="pf-timeline-content">
                <div className="pf-timeline-header">
                  <h3 className="pf-timeline-title" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                    {exp.exp_type === 'internship' ? `Ex-intern at ${exp.org_name || exp.company}` : exp.company}
                  </h3>
                  <span className="text-green pf-timeline-date">{formatDateStr(exp.start_date)} — {formatDateStr(exp.end_date)}</span>
                </div>
                <p className="pf-timeline-sub pf-timeline-role">
                  {exp.exp_type === 'internship' ? `Domain: ${exp.role}` : exp.role}
                </p>
                {exp.description && <p className="pf-timeline-desc">{exp.description}</p>}
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '0.25rem', opacity: 0.8 }}>
                    Click to view details ➜
                  </span>
                </div>
              </div>
            </div>
          )) : loadingData ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2.5rem' }}>
              <div className="premium-loader" style={{ width: '36px', height: '36px' }} />
            </div>
          ) : <div className="glass-card pf-empty-state">No experience data yet.</div>}
        </div>
      </section>

      {/* ── CERTIFICATIONS (always shown) ── */}
      <section id="certificates" className="section-wrapper">
        <h2 className="section-title"><span className="text-green">Certifications</span></h2>
        {certificates.length > 0 ? (
          <div className="grid-2">
            {certificates.map(cert => (
              <div key={cert.id} className="glass-card pf-cert-card">
                <div className="pf-cert-icon">
                  <Award size={28} />
                </div>
                <div className="pf-cert-body">
                  <h3 className="pf-cert-title">{cert.name}</h3>
                  <p className="pf-cert-meta">{cert.organization} · {formatDateStr(cert.issue_date)}</p>
                </div>
                {cert.credential_url && (
                  cert.access_cert === 1 || cert.access_cert === 'true' || cert.access_cert === true ? (
                    <a 
                      href={cert.credential_url}
                      target="_blank"
                      rel="noreferrer"
                      className="pf-cert-link" 
                      title="View Certificate"
                      style={{ background: 'none', border: 'none', color: 'var(--accent-green)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Eye size={18} />
                    </a>
                  ) : (
                    <button 
                      onClick={() => handleOpenPermissionRequest(`cert_${cert.id}`, cert.name)} 
                      className="pf-cert-link" 
                      title="Request Access to view"
                      style={{ background: 'none', border: 'none', color: 'var(--accent-green)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Lock size={18} />
                    </button>
                  )
                )}
              </div>
            ))}
          </div>
        ) : loadingData ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2.5rem' }}>
            <div className="premium-loader" style={{ width: '36px', height: '36px' }} />
          </div>
        ) : (
          <div className="glass-card pf-empty-state">No certifications added yet.</div>
        )}
      </section>

      {/* ── CONTACT ── */}
      <section id="contact" className="section-wrapper pf-contact-section">
        <h2 className="section-title pf-contact-title">Let's <span className="text-green">Connect</span></h2>
        <div className="grid-contact">

          <div className="pf-contact-info">
            <a href={`mailto:${email}`} className="glass-card pf-contact-card">
              <div className="pf-contact-card-icon"><Mail size={24} /></div>
              <div>
                <p className="pf-contact-card-label">Email</p>
                <p className="pf-contact-card-value">{email}</p>
              </div>
            </a>
            <a href={`tel:${phone}`} className="glass-card pf-contact-card">
              <div className="pf-contact-card-icon"><Phone size={24} /></div>
              <div>
                <p className="pf-contact-card-label">Phone</p>
                <p className="pf-contact-card-value">{phone}</p>
              </div>
            </a>
          </div>

          <form onSubmit={handleContactSubmit} className="glass-panel pf-contact-form">
            <h3 className="pf-contact-form-title">Send a Message</h3>
            <input
              type="email"
              required
              className="glass-input"
              placeholder="Enter your email"
              value={contactEmail}
              onChange={e => setContactEmail(e.target.value)}
            />
            <div className="pf-contact-radio-group">
              {['hire', 'review'].map(p => (
                <label key={p} className="pf-contact-radio-label">
                  <input
                    type="radio"
                    name="cpurp"
                    checked={contactPurpose === p}
                    onChange={() => setContactPurpose(p)}
                    style={{ accentColor: '#00ff88' }}
                  />
                  {p === 'hire' ? 'Hire for Project' : 'Send Review'}
                </label>
              ))}
            </div>
            <textarea
              rows={3}
              required
              className="glass-input"
              placeholder="Your message..."
              value={contactDesc}
              onChange={e => setContactDesc(e.target.value)}
            />
            <button type="submit" className="glass-btn pf-contact-submit-btn">
              <Send size={17} /> Send Message
            </button>
            {contactSuccess && <p className="pf-contact-success">{contactSuccess}</p>}
          </form>

        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="pf-footer-premium">
        <div className="pf-footer-content">
          <div className="pf-footer-section" style={{ width: '100%' }}>
            <h4 className="pf-footer-title">Help, Support & Recruitment</h4>
            <p className="pf-footer-text">
              For project collaborations, consulting, general technical support, or recruitment, hiring, and employment inquiries, please feel free to reach out. I am fully available for both freelance contracts and full-time positions.
            </p>
            <div className="pf-footer-details" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginTop: '1rem' }}>
              <div>
                <p className="pf-footer-contact-info" style={{ margin: '0.3rem 0' }}>
                  <strong>Email:</strong> <a href={`mailto:${email}`} target="_blank" rel="noopener noreferrer">{email}</a>
                </p>
                {phone && (
                  <p className="pf-footer-contact-info" style={{ margin: '0.3rem 0' }}>
                    <strong>Phone:</strong> <a href={`tel:${phone}`}>{phone}</a>
                  </p>
                )}
              </div>
              <div className="pf-footer-socials" style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {linkedin && (
                  <a href={linkedin} target="_blank" rel="noopener noreferrer" title="LinkedIn" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#00ff88', textDecoration: 'none', fontSize: '0.85rem' }}>
                    <Linkedin size={18} /> LinkedIn
                  </a>
                )}
                {github && (
                  <a href={github} target="_blank" rel="noopener noreferrer" title="GitHub" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#00ff88', textDecoration: 'none', fontSize: '0.85rem' }}>
                    <Github size={18} /> GitHub
                  </a>
                )}
                {instagram && (
                  <a href={instagram} target="_blank" rel="noopener noreferrer" title="Instagram" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#00ff88', textDecoration: 'none', fontSize: '0.85rem' }}>
                    <Instagram size={18} /> Instagram
                  </a>
                )}
                {facebook && (
                  <a href={facebook} target="_blank" rel="noopener noreferrer" title="Facebook" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#00ff88', textDecoration: 'none', fontSize: '0.85rem' }}>
                    <Facebook size={18} /> Facebook
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="pf-footer-bottom" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span>&copy; {new Date().getFullYear()} {(name.toLowerCase() === 'navycut' ? "Navy's Portfolio" : name).toUpperCase()}. All Rights Reserved.</span>
          <button
            onClick={() => navigateTo('login')}
            style={{
              background: 'none',
              border: '1px solid rgba(0,255,136,0.2)',
              color: 'rgba(0,255,136,0.5)',
              cursor: 'pointer',
              fontSize: '0.7rem',
              padding: '0.2rem 0.6rem',
              borderRadius: '4px',
              letterSpacing: '0.5px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => { e.target.style.color = '#00ff88'; e.target.style.borderColor = '#00ff88'; }}
            onMouseLeave={e => { e.target.style.color = 'rgba(0,255,136,0.5)'; e.target.style.borderColor = 'rgba(0,255,136,0.2)'; }}
            title="Owner Login"
          >
            Owner Login
          </button>
        </div>
      </footer>

      {/* ── HIRE ME MODAL ── */}
      {showHireModal && (
        <div className="pf-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowHireModal(false); }}>
          <div className="glass-panel pf-modal-card">
            <button onClick={() => setShowHireModal(false)} className="pf-modal-close-btn">
              <X size={22} />
            </button>
            <h3 className="pf-modal-title">
              <Send size={22} className="text-green" /> Let's <span className="text-green">Connect</span>
            </h3>
            <form onSubmit={handleHireSubmit} className="pf-modal-form">
              <input
                type="email"
                required
                className="glass-input"
                placeholder="your@email.com"
                value={viewerEmail}
                onChange={e => setViewerEmail(e.target.value)}
              />
              <div className="pf-modal-radio-group">
                {['hire', 'review'].map(p => (
                  <label key={p} className="pf-modal-radio-label">
                    <input
                      type="radio"
                      name="hpurp"
                      checked={purpose === p}
                      onChange={() => setPurpose(p)}
                      style={{ accentColor: '#00ff88' }}
                    />
                    {p === 'hire' ? 'Hire for Project' : 'Send Review'}
                  </label>
                ))}
              </div>
              <textarea
                rows={4}
                required
                className="glass-input"
                placeholder="Describe your project or feedback..."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
              {errorMsg && <p className="pf-modal-error">{errorMsg}</p>}
              {successMsg && (
                <p className="pf-modal-success">
                  <CheckCircle size={16} /> {successMsg}
                </p>
              )}
              <div className="pf-modal-btn-group">
                <button
                  type="button"
                  onClick={() => setShowHireModal(false)}
                  className="glass-btn-secondary pf-modal-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="glass-btn pf-modal-btn"
                >
                  {isSending ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Experience Details Modal */}
      {selectedExperience && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99999,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(15px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            animation: 'fadeIn 0.25s ease'
          }}
          onClick={() => setSelectedExperience(null)}
        >
          <div 
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '650px',
              background: 'rgba(15, 23, 20, 0.98)',
              border: '1px solid rgba(0, 255, 136, 0.3)',
              borderRadius: '16px',
              padding: '2.5rem',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              color: '#eee',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button 
              onClick={() => setSelectedExperience(null)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'none',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                opacity: 0.7,
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.opacity = 1}
              onMouseLeave={(e) => e.target.style.opacity = 0.7}
            >
              <X size={24} />
            </button>

            {/* Header / Type */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{
                alignSelf: 'flex-start',
                padding: '0.25rem 0.6rem',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                background: selectedExperience.exp_type === 'project' ? 'rgba(0, 188, 255, 0.15)' : selectedExperience.exp_type === 'internship' ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255, 165, 0, 0.15)',
                color: selectedExperience.exp_type === 'project' ? '#00bcff' : selectedExperience.exp_type === 'internship' ? 'var(--accent-green)' : '#ffa500',
                border: selectedExperience.exp_type === 'project' ? '1px solid rgba(0, 188, 255, 0.3)' : selectedExperience.exp_type === 'internship' ? '1px solid rgba(0, 255, 136, 0.3)' : '1px solid rgba(255, 165, 0, 0.3)'
              }}>
                {selectedExperience.exp_type === 'project' ? 'Group Project' : selectedExperience.exp_type === 'internship' ? 'Internship' : 'Program Participation'}
              </span>
              
              <h3 style={{ fontSize: '1.8rem', color: '#fff', fontWeight: 'bold', margin: '0.5rem 0 0 0', fontFamily: "'Times New Roman', Times, serif" }}>
                {selectedExperience.exp_type === 'internship' && `Ex-intern at ${selectedExperience.org_name || selectedExperience.company}`}
                {selectedExperience.exp_type === 'project' && `Developer on ${selectedExperience.project_name || selectedExperience.company}`}
                {selectedExperience.exp_type === 'program' && `Participant in ${selectedExperience.program_name || selectedExperience.company}`}
                {!selectedExperience.exp_type && selectedExperience.company}
              </h3>
              
              <span className="text-green" style={{ fontSize: '0.95rem', fontWeight: 500 }}>
                {formatDateStr(selectedExperience.start_date)} — {formatDateStr(selectedExperience.end_date)}
              </span>
            </div>

            {/* Details Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem' }}>
              
              {/* Role/Domain */}
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '1rem', fontSize: '0.95rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Domain / Role:</span>
                <span style={{ color: '#fff', fontWeight: 600 }}>{selectedExperience.role}</span>
              </div>

              {/* Organization */}
              {selectedExperience.exp_type === 'internship' && selectedExperience.org_name && (
                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '1rem', fontSize: '0.95rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Organization:</span>
                  <span style={{ color: '#fff' }}>{selectedExperience.org_name}</span>
                </div>
              )}

              {/* Program Name */}
              {selectedExperience.program_name && (
                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '1rem', fontSize: '0.95rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Program Name:</span>
                  <span style={{ color: '#fff', fontStyle: 'italic' }}>{selectedExperience.program_name}</span>
                </div>
              )}

              {/* Project Instructor */}
              {selectedExperience.exp_type === 'project' && selectedExperience.project_instructor && (
                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '1rem', fontSize: '0.95rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Project Instructor:</span>
                  <span style={{ color: '#fff' }}>{selectedExperience.project_instructor}</span>
                </div>
              )}

              {/* Description */}
              {selectedExperience.description && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.95rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Description:</span>
                  <p style={{ margin: 0, lineHeight: 1.6, color: '#ddd', background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {selectedExperience.description}
                  </p>
                </div>
              )}

              {/* Skills Learned */}
              {selectedExperience.skills_learned && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.95rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Skills Learned:</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.2rem' }}>
                    {selectedExperience.skills_learned.split(',').map((skill, idx) => (
                      <span key={idx} style={{
                        padding: '0.3rem 0.75rem',
                        fontSize: '0.8rem',
                        background: 'rgba(0, 255, 136, 0.08)',
                        border: '1px solid rgba(0, 255, 136, 0.2)',
                        color: 'var(--accent-green)',
                        borderRadius: '100px'
                      }}>
                        {skill.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Links and Attachments */}
              {(selectedExperience.repo_link || selectedExperience.deploy_link || selectedExperience.certificate_file || selectedExperience.lor_file) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.95rem' }}>Attachments & Links:</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem' }}>
                    
                    {/* Repo Link */}
                    {selectedExperience.repo_link && (
                      <a href={selectedExperience.repo_link} target="_blank" rel="noreferrer" className="glass-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                        <Github size={16} /> Source Code
                      </a>
                    )}

                    {/* Deploy Link */}
                    {selectedExperience.deploy_link && (
                      <a href={selectedExperience.deploy_link} target="_blank" rel="noreferrer" className="glass-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                        <ExternalLink size={16} /> Live Demo
                      </a>
                    )}

                    {/* Certificate */}
                    {selectedExperience.certificate_file && (
                      <a href={resolveFileUrl(selectedExperience.certificate_file)} target="_blank" rel="noreferrer" className="glass-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.85rem', borderColor: 'var(--accent-green)' }}>
                        <Award size={16} /> Certificate
                      </a>
                    )}

                    {/* LOR */}
                    {selectedExperience.lor_file && (
                      <a href={resolveFileUrl(selectedExperience.lor_file)} target="_blank" rel="noreferrer" className="glass-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.85rem', borderColor: '#ffa500' }}>
                        <Award size={16} /> LOR Letter
                      </a>
                    )}

                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ── DOCUMENT ACCESS REQUEST MODAL ── */}
      {showRequestModal && (
        <div className="pf-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowRequestModal(false); }}>
          <div className="glass-panel pf-modal-card" style={{ maxWidth: '450px', background: 'rgba(12, 20, 14, 0.98)', border: '1px solid rgba(0, 255, 136, 0.25)' }}>
            <button onClick={() => setShowRequestModal(false)} className="pf-modal-close-btn">
              <X size={22} />
            </button>
            <h3 className="pf-modal-title">
              <Lock size={22} className="text-green" /> Request <span className="text-green">Access</span>
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '-0.5rem', marginBottom: '1.25rem', textAlign: 'center' }}>
              You are requesting to view: <strong style={{ color: '#fff' }}>{selectedDocName}</strong>.
            </p>

            {!requestSubmitted ? (
              <form onSubmit={handleSendPermissionRequest} className="pf-modal-form" style={{ gap: '1rem' }}>
                <input
                  type="text"
                  required
                  className="glass-input"
                  placeholder="Enter your full name"
                  value={viewerName}
                  onChange={e => setViewerName(e.target.value)}
                  style={{ width: '100%' }}
                />
                 <input
                  type="email"
                  required
                  className="glass-input"
                  placeholder="Enter your email address"
                  value={viewerRequestEmail}
                  onChange={e => setViewerRequestEmail(e.target.value)}
                  style={{ width: '100%' }}
                />
                <textarea
                  rows={3}
                  className="glass-input"
                  placeholder="Purpose of request (e.g., Background verification)"
                  value={requestPurpose}
                  onChange={e => setRequestPurpose(e.target.value)}
                  style={{ width: '100%', resize: 'none' }}
                />
                
                <button type="submit" className="glass-btn pf-modal-btn" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
                  Submit Access Request
                </button>

                <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                  <button 
                    type="button" 
                    onClick={() => { setShowRequestModal(false); setShowVerifyModal(true); }}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-green)', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}
                  >
                    Already have an access token? Verify Access
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <CheckCircle size={48} className="text-green" style={{ marginBottom: '1rem' }} />
                <h4 style={{ color: '#fff', marginBottom: '0.5rem' }}>Request Submitted!</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                  Your request has been successfully dispatched to the owner. You will receive a verification code on your email (<strong style={{ color: '#fff' }}>{viewerRequestEmail}</strong>) once approved.
                </p>
                <button 
                  onClick={() => { setShowRequestModal(false); setShowVerifyModal(true); }}
                  className="glass-btn"
                  style={{ marginTop: '1.5rem', width: '100%', justifyContent: 'center' }}
                >
                  Proceed to Verification
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── VERIFY ACCESS TOKEN MODAL ── */}
      {showVerifyModal && (
        <div className="pf-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowVerifyModal(false); }}>
          <div className="glass-panel pf-modal-card" style={{ maxWidth: '450px', background: 'rgba(12, 20, 14, 0.98)', border: '1px solid rgba(0, 255, 136, 0.25)' }}>
            <button onClick={() => setShowVerifyModal(false)} className="pf-modal-close-btn">
              <X size={22} />
            </button>
            <h3 className="pf-modal-title">
              <ShieldCheck size={22} className="text-green" /> Verify <span className="text-green">Access Code</span>
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '-0.5rem', marginBottom: '1.25rem', textAlign: 'center' }}>
              Enter your email and the 6-digit verification code to unlock: <strong style={{ color: '#fff' }}>{selectedDocName}</strong>.
            </p>

            <form onSubmit={handleVerifyAccessToken} className="pf-modal-form" style={{ gap: '1rem' }}>
              <input
                type="email"
                required
                className="glass-input"
                placeholder="Enter registered email address"
                value={verifyEmail}
                onChange={e => setVerifyEmail(e.target.value)}
                style={{ width: '100%' }}
              />
              <input
                type="text"
                required
                maxLength={6}
                className="glass-input"
                placeholder="Enter 6-digit Access Token"
                value={verifyToken}
                onChange={e => setVerifyToken(e.target.value)}
                style={{ width: '100%', textAlign: 'center', letterSpacing: '2px', fontWeight: 'bold' }}
              />

              {verifyError && (
                <p style={{ color: '#ff5252', fontSize: '0.8rem', margin: 0, textAlign: 'center' }}>
                  ⚠️ {verifyError}
                </p>
              )}

              <button type="submit" className="glass-btn pf-modal-btn" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
                Verify & Open Document
              </button>

              <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => { setShowVerifyModal(false); setShowRequestModal(true); }}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-green)', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}
                >
                  Need to request permission? Click here
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SECURE DOCUMENT VIEWER MODAL ── */}
      {showSecureDocModal && (
        <div 
          className="pf-modal-overlay" 
          style={{ background: 'rgba(0, 0, 0, 0.96)', backdropFilter: 'blur(20px)', zIndex: 999999 }}
          onClick={e => { if (e.target === e.currentTarget) setShowSecureDocModal(false); }}
        >
          <div 
            className="glass-panel" 
            style={{ 
              width: '95%', 
              maxWidth: '850px', 
              background: '#040806', 
              border: '1px solid rgba(0, 255, 136, 0.3)', 
              borderRadius: '12px', 
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck className="text-green" size={20} />
                <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', fontWeight: 'bold' }}>SECURE VIEWER: {secureDocName}</h4>
              </div>
              <button 
                onClick={() => setShowSecureDocModal(false)} 
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
              >
                <X size={24} />
              </button>
            </div>

            <div 
              style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                background: '#020403', 
                borderRadius: '8px', 
                padding: '1rem',
                minHeight: '400px',
                overflow: 'auto',
                position: 'relative',
                userSelect: 'none',
                WebkitUserSelect: 'none'
              }}
            >
              {(secureDocUrl.toLowerCase().endsWith('.pdf') || secureDocUrl.startsWith('data:application/pdf')) ? (
                <iframe 
                  src={secureDocDisplayUrl} 
                  style={{ width: '100%', height: '65vh', border: 'none' }} 
                  title="PDF Viewer"
                />
              ) : (
                <div style={{ position: 'relative' }}>
                  <img 
                    src={secureDocDisplayUrl} 
                    alt="Secure Credential File" 
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '65vh', 
                      objectFit: 'contain',
                      pointerEvents: 'none',
                      userSelect: 'none',
                      WebkitUserSelect: 'none'
                    }}
                    onDragStart={e => e.preventDefault()}
                  />
                  {/* Transparent overlay covering the image to fully block context menu clicks / drag operations */}
                  <div 
                    style={{ 
                      position: 'absolute', 
                      top: 0, 
                      left: 0, 
                      right: 0, 
                      bottom: 0, 
                      background: 'rgba(0,0,0,0)', 
                      zIndex: 999 
                    }} 
                  />
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast.show && (
        <div 
          className="pf-toast-alert"
          style={{
            background: 'rgba(10, 15, 12, 0.95)',
            border: '1px solid #00ff88',
            boxShadow: '0 0 15px rgba(0, 255, 136, 0.3)',
            color: '#fff',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontWeight: 600,
            backdropFilter: 'blur(8px)'
          }}
        >
          <CheckCircle size={18} className="text-green" />
          <span>{toast.message}</span>
        </div>
      )}

    </div>
  );
}

export default PortfolioPage;
