import React, { useState } from 'react';
import { Lock, User, Mail, ShieldCheck, ArrowLeft, KeyRound, CheckCircle, Eye, EyeOff } from 'lucide-react';
import '../styles/login.css';
import { getApiBase } from '../utils/api';

const API_BASE = getApiBase();

function LoginPage({ navigateTo, onLoginSuccess }) {
  const [view, setView] = useState('login'); // 'login' | 'forgot' | 'reset'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // OTP Verification state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [loginOtp, setLoginOtp] = useState('');
  
  // Forgot / Change password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Resend Timer state
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = React.useRef(null);

  const startResendTimer = () => {
    setResendTimer(5);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleResendOtp = async () => {
    if (!forgotEmail || resendTimer > 0) return;
    setLoading(true);
    clearMessages();
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to send OTP code');
      }
      if (data.otp) {
        setSuccessMsg(`Resent OTP successfully! (Dev Mode: Reset code is ${data.otp})`);
      } else {
        setSuccessMsg('OTP code resent successfully!');
      }
      startResendTimer();
    } catch (err) {
      setErrorMsg(err.message || 'Error executing request.');
    } finally {
      setLoading(false);
    }
  };

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status / Feedback
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const clearMessages = () => {
    setErrorMsg('');
    setInfoMsg('');
    setSuccessMsg('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const formUsername = (e.target.username?.value || username).trim();
    const formPassword = e.target.password?.value || password;

    if (!formUsername || !formPassword) return;
    setLoading(true);
    clearMessages();

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: formUsername, password: formPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      if (data.requiresOtp) {
        // First time login detected, needs OTP verification!
        setOtpEmail(data.email);
        setShowOtpModal(true);
        if (data.otp) {
          setInfoMsg(`${data.message} (Dev Mode: Verification code is ${data.otp})`);
        } else {
          setInfoMsg(data.message);
        }
      } else {
        // Successful login
        onLoginSuccess(data.token);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Could not authenticate. Check MySQL Server connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerifySubmit = async (e) => {
    e.preventDefault();
    if (!loginOtp) return;
    setLoading(true);
    clearMessages();

    try {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail, otp: loginOtp })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'OTP verification failed');
      }

      setShowOtpModal(false);
      onLoginSuccess(data.token);
    } catch (err) {
      setErrorMsg(err.message || 'Invalid or expired verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setLoading(true);
    clearMessages();

    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to send OTP code');
      }

      if (data.otp) {
        setSuccessMsg(`${data.message} (Dev Mode: Reset code is ${data.otp})`);
      } else {
        setSuccessMsg(data.message);
      }
      setView('reset');
      startResendTimer();
    } catch (err) {
      setErrorMsg(err.message || 'Error executing request.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetOtp || !newPassword || !confirmPassword) return;
    
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    clearMessages();

    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail || 'navycutdehury@gmail.com',
          otp: resetOtp,
          newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to reset password');
      }

      setSuccessMsg(data.message);
      setTimeout(() => {
        setView('login');
        clearMessages();
      }, 2500);
    } catch (err) {
      setErrorMsg(err.message || 'Error occurred during reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at top left, #04351b 0%, #01140a 45%, #000000 100%)',
      padding: '1.5rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      
      {/* Decorative background orbs */}
      <div className="portfolio-orb portfolio-orb-1" />
      <div className="portfolio-orb portfolio-orb-2" />
      <div className="portfolio-orb portfolio-orb-3" />
      
      {/* Main Glass Login Card */}
      <div 
        className="glass-panel" 
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '2.5rem 2rem',
          zIndex: 5,
          position: 'relative',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          background: 'rgba(5, 12, 8, 0.75)'
        }}
      >
        
        {/* VIEW 1: Standard Login Form */}
        {view === 'login' && !showOtpModal && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', letterSpacing: '1px' }}>
                OWNER <span className="text-green glow-text">ACCESS</span>
              </h2>
            </div>

            <form onSubmit={handleLoginSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Owner profile name <span style={{ color: '#ff5252' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <User size={18} className="text-green" style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }} />
                  <input 
                    name="username"
                    type="text" 
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="glass-input" 
                    placeholder="owner profile name" 
                    style={{ width: '100%', paddingLeft: '2.5rem' }}
                    autoComplete="off"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Access Password <span style={{ color: '#ff5252' }}>*</span></label>
                  <span 
                    onClick={() => { setView('forgot'); clearMessages(); }}
                    style={{ fontSize: '0.8rem', color: 'var(--accent-green)', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Change Password?
                  </span>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} className="text-green" style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }} />
                  <input 
                    name="password"
                    type={showPassword ? "text" : "password"} 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="glass-input" 
                    placeholder="••••••••" 
                    style={{ width: '100%', paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.8rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--accent-green)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0,
                      opacity: 0.8
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div style={{ color: '#ff5252', fontSize: '0.85rem', textAlign: 'center', background: 'rgba(255,82,82,0.1)', padding: '0.6rem', border: '1px solid #ff5252', borderRadius: '8px' }}>
                  {errorMsg}
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="glass-btn" 
                style={{ width: '100%', justifyContent: 'center', padding: '0.9rem', fontSize: '1rem', marginTop: '0.5rem' }}
              >
                {loading ? 'Authenticating...' : 'Request Access'}
              </button>

              <button 
                type="button"
                onClick={() => navigateTo('welcome')}
                className="glass-btn-secondary"
                style={{ width: '100%', justifyContent: 'center', gap: '0.5rem' }}
              >
                <ArrowLeft size={16} /> Return to Terminal
              </button>

            </form>
          </div>
        )}

        {/* SUB-VIEW: 1st Time Login OTP Verification Modal */}
        {showOtpModal && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(0,255,136,0.1)', border: '1px solid var(--accent-green)', display: 'flex', alignItems: 'center', justify: 'center', margin: 'auto', marginBottom: '1rem' }}>
                <ShieldCheck className="text-green" size={30} />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>SECURITY VERIFICATION</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem', lineHeight: '1.5' }}>
                A verification code has been generated for <strong>{otpEmail}</strong> to activate first-time login privileges.
              </p>
            </div>

            <form onSubmit={handleOtpVerifySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', fontWeight: 600 }}>
                  Enter 6-Digit OTP Code
                </label>
                <input 
                  type="text" 
                  maxLength={6}
                  required
                  value={loginOtp}
                  onChange={(e) => setLoginOtp(e.target.value)}
                  className="glass-input" 
                  placeholder="e.g. 123456" 
                  style={{ width: '100%', textAlign: 'center', fontSize: '1.5rem', letterSpacing: '8px', fontWeight: 'bold' }}
                />
              </div>

              {infoMsg && (
                <div style={{ color: 'var(--accent-green)', fontSize: '0.8rem', textAlign: 'center', background: 'rgba(0,255,136,0.05)', padding: '0.5rem', borderRadius: '6px' }}>
                  {infoMsg}
                </div>
              )}

              {errorMsg && (
                <div style={{ color: '#ff5252', fontSize: '0.85rem', textAlign: 'center', background: 'rgba(255,82,82,0.05)', padding: '0.5rem', borderRadius: '6px' }}>
                  {errorMsg}
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="glass-btn" 
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {loading ? 'Verifying OTP...' : 'Verify & Log In'}
              </button>

              <button 
                type="button" 
                onClick={() => { setShowOtpModal(false); clearMessages(); }}
                className="glass-btn-secondary" 
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Cancel Verification
              </button>
            </form>
          </div>
        )}

        {/* VIEW 2: Forgot Password / Password Reset OTP Request */}
        {view === 'forgot' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>
                PASSWORD <span className="text-green">RESET</span>
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.4rem', lineHeight: '1.5' }}>
                Enter your registered owner email to receive a password reset token.
              </p>
            </div>

            <form onSubmit={handleForgotPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Registered Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} className="text-green" style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }} />
                  <input 
                    type="email" 
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="glass-input" 
                    placeholder="e.g. navycutdehury@gmail.com" 
                    style={{ width: '100%', paddingLeft: '2.5rem' }}
                  />
                </div>
              </div>

              {errorMsg && (
                <div style={{ color: '#ff5252', fontSize: '0.85rem', textAlign: 'center' }}>
                  {errorMsg}
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="glass-btn" 
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {loading ? 'Generating Code...' : 'Send Verification OTP'}
              </button>

              <button 
                type="button" 
                onClick={() => { setView('login'); clearMessages(); }}
                className="glass-btn-secondary" 
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <ArrowLeft size={16} /> Back to Login
              </button>

            </form>
          </div>
        )}

        {/* VIEW 3: Reset Password (OTP Verification + Password Change) */}
        {view === 'reset' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>
                CONFIRM <span className="text-green">UPDATE</span>
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.4rem' }}>
                Verify token and save your new access code
              </p>
            </div>

            <form onSubmit={handleResetPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Verification OTP</label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={18} className="text-green" style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }} />
                  <input 
                    type="text" 
                    required
                    maxLength={6}
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value)}
                    className="glass-input" 
                    placeholder="6-digit OTP code" 
                    style={{ width: '100%', paddingLeft: '2.5rem', textAlign: 'center', letterSpacing: '4px', fontWeight: 'bold' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>New Access Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} className="text-green" style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }} />
                  <input 
                    type={showNewPassword ? "text" : "password"} 
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="glass-input" 
                    placeholder="Enter new password" 
                    style={{ width: '100%', paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.8rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--accent-green)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0,
                      opacity: 0.8
                    }}
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} className="text-green" style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }} />
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="glass-input" 
                    placeholder="Confirm new password" 
                    style={{ width: '100%', paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.8rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--accent-green)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0,
                      opacity: 0.8
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Resend OTP option */}
              <div style={{ textAlign: 'center', marginTop: '0.2rem', marginBottom: '0.2rem', fontSize: '0.85rem' }}>
                {resendTimer > 0 ? (
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Resend code in <strong style={{ color: 'var(--accent-green)' }}>{resendTimer}s</strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-green)',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      padding: 0,
                      fontFamily: 'inherit',
                      fontSize: '0.85rem'
                    }}
                  >
                    Resend OTP Code
                  </button>
                )}
              </div>

              {errorMsg && (
                <div style={{ color: '#ff5252', fontSize: '0.85rem', textAlign: 'center' }}>
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div style={{ color: 'var(--accent-green)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                  <CheckCircle size={16} /> {successMsg}
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="glass-btn" 
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {loading ? 'Saving Changes...' : 'Confirm Update & Save'}
              </button>

              <button 
                type="button" 
                onClick={() => { setView('login'); clearMessages(); }}
                className="glass-btn-secondary" 
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Cancel Reset
              </button>

            </form>
          </div>
        )}

      </div>
    </div>
  );
}

export default LoginPage;
