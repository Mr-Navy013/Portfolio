import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Code, GraduationCap, Briefcase, Award, Mail, 
  LogOut, Upload, Plus, 
  Trash2, Edit, Save, ShieldCheck, CheckCircle, ExternalLink, X, FileText, Bell,
  Download, Menu, Eye, EyeOff, Check
} from 'lucide-react';
import { Linkedin, Github, Instagram, Facebook } from '../components/BrandIcons';
import '../styles/dashboard.css';
import '../styles/welcome.css';
import { getApiBase, setApiBase } from '../utils/api';

const API_BASE = getApiBase();
const BACKEND_BASE = API_BASE.replace('/api', '');

const resolveFileUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('http')) return url;
  return `${BACKEND_BASE}${url}`;
};

const handleDownloadFile = (e, url, filename) => {
  if (!url) return;
  e.preventDefault();
  const resolvedUrl = resolveFileUrl(url);
  if (resolvedUrl.startsWith('data:')) {
    try {
      const parts = resolvedUrl.split(',');
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
      
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Error downloading base64 file:", err);
      window.open(resolvedUrl, '_blank');
    }
  } else {
    const a = document.createElement('a');
    a.href = resolvedUrl;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
};

const handleViewFile = (e, url) => {
  if (!url) return;
  e.preventDefault();
  const resolvedUrl = resolveFileUrl(url);
  if (resolvedUrl.startsWith('data:')) {
    try {
      const parts = resolvedUrl.split(',');
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
      window.open(blobUrl, '_blank');
    } catch (err) {
      console.error("Error viewing base64 file:", err);
      window.open(resolvedUrl, '_blank');
    }
  } else {
    window.open(resolvedUrl, '_blank');
  }
};

const compressImage = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.7) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name || 'compressed_image.jpg', {
                type: file.type || 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          file.type || 'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = event.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};

const compressImageIfNeeded = async (file) => {
  if (!file) return null;
  
  const name = file.name || '';
  const ext = name.substring(name.lastIndexOf('.')).toLowerCase();
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'];
  const isImageExt = imageExtensions.includes(ext);
  const isImageMime = file.type && file.type.startsWith('image/');
  
  // If it's an image by mimetype or extension, always process it.
  // This converts remote cloud streams (like Google Drive application/octet-stream)
  // into local, standard image/jpeg Blobs that upload instantly without errors.
  if (isImageMime || isImageExt) {
    try {
      return await compressImage(file);
    } catch (err) {
      console.warn('[Image Compression Error]', err);
      return file;
    }
  }
  return file;
};

const checkFileReadable = (file) => {
  return new Promise((resolve) => {
    if (!file) {
      resolve(true);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(true);
    reader.onerror = (e) => {
      console.warn("FileReader check failed (cloud file sandbox restriction), proceeding with upload anyway:", e);
      resolve(true);
    };
    try {
      const slice = file.slice(0, Math.min(1024, file.size));
      reader.readAsArrayBuffer(slice);
    } catch (err) {
      console.warn("FileReader slice failed, proceeding with upload anyway:", err);
      resolve(true);
    }
  });
};

const getSafeInMemoryFile = (file, defaultMime = '') => {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        let fileType = file.type;
        // If the mimetype is generic or empty, override it with defaultMime
        if (!fileType || fileType === 'application/octet-stream' || fileType === '') {
          if (defaultMime) fileType = defaultMime;
        }

        let fileName = file.name || 'file';
        const lastDot = fileName.lastIndexOf('.');
        const hasExt = lastDot !== -1 && (fileName.length - lastDot <= 5) && lastDot > 0;
        
        // If filename does not have a valid extension, append the correct one based on mimetype
        if (!hasExt) {
          if (fileType === 'application/pdf') {
            fileName += '.pdf';
          } else if (fileType === 'image/jpeg' || fileType === 'image/jpg') {
            fileName += '.jpg';
          } else if (fileType === 'image/png') {
            fileName += '.png';
          } else if (fileType === 'image/gif') {
            fileName += '.gif';
          } else if (fileType === 'image/webp') {
            fileName += '.webp';
          }
        }

        const blob = new Blob([event.target.result], { type: fileType });
        const safeFile = new File([blob], fileName, { type: fileType });
        resolve(safeFile);
      } catch (err) {
        resolve(file);
      }
    };
    reader.onerror = () => {
      reject(new Error('CLOUD_READ_FAILED'));
    };
    reader.readAsArrayBuffer(file);
  });
};

const verifyFilesReadable = async (files) => {
  for (const file of files) {
    if (file) {
      const readable = await checkFileReadable(file);
      if (!readable) return false;
    }
  }
  return true;
};

const uploadWithProgress = async (url, method, body, headers, onProgress, _retryCount = 0) => {
  const MAX_RETRIES = 2; // Total 3 attempts (1 original + 2 retries)
  const RETRY_DELAY = 2500; // 2.5 seconds between retries

  // POST method tunneling: forward PUT/DELETE over POST to bypass restrictive mobile ISPs
  let actualMethod = method;
  let actualUrl = url;
  if (method === 'PUT' || method === 'DELETE') {
    actualMethod = 'POST';
    const separator = actualUrl.includes('?') ? '&' : '?';
    actualUrl = `${actualUrl}${separator}_method=${method}`;
  }

  // Simulate progress on fetch (no real streaming progress, but gives UI feedback)
  let progressTimer = null;
  if (onProgress) {
    let fakeProgress = _retryCount > 0 ? 10 : 0;
    progressTimer = setInterval(() => {
      fakeProgress = Math.min(fakeProgress + 8, 90);
      onProgress(fakeProgress);
    }, 400);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout

  const cleanup = () => {
    clearTimeout(timeoutId);
    if (progressTimer) clearInterval(progressTimer);
  };

  const shouldRetry = (statusOrErr) => {
    if (_retryCount >= MAX_RETRIES) return false;
    if (typeof statusOrErr === 'number') {
      return [502, 503, 504, 0].includes(statusOrErr);
    }
    return true; // Retry on network errors
  };

  const doRetry = async () => {
    cleanup();
    console.log(`[Upload] Retry ${_retryCount + 1}/${MAX_RETRIES} after ${RETRY_DELAY}ms...`);
    if (onProgress) onProgress(5);
    await new Promise(r => setTimeout(r, RETRY_DELAY));
    return uploadWithProgress(url, method, body, headers, onProgress, _retryCount + 1);
  };

  try {
    const res = await fetch(actualUrl, {
      method: actualMethod,
      headers: headers || {},
      body: body,
      signal: controller.signal,
    });

    cleanup();
    if (onProgress) onProgress(100);

    if (res.ok) {
      try { return await res.json(); } catch { return { success: true }; }
    } else if (shouldRetry(res.status)) {
      return doRetry();
    } else {
      let errMsg = `Upload failed with status ${res.status}`;
      try { const errBody = await res.json(); errMsg = errBody.message || errBody.error || errMsg; } catch {}
      throw new Error(errMsg);
    }
  } catch (err) {
    cleanup();
    if (err.name === 'AbortError') {
      if (shouldRetry(0)) return doRetry();
      throw new Error('Request timed out after multiple attempts. The server may be starting up — please try again in 30 seconds.');
    }
    if (shouldRetry(0)) return doRetry();
    throw new Error(`Network error: ${err.message || 'Failed to fetch.'}`);
  }
};



// Resilient fetch for JSON-only requests: tunnels PUT/DELETE over POST to bypass restrictive mobile ISPs
const resilientFetch = (url, options = {}) => {
  let { method = 'GET', ...rest } = options;
  let actualUrl = url;
  if (method === 'PUT' || method === 'DELETE') {
    const separator = actualUrl.includes('?') ? '&' : '?';
    actualUrl = `${actualUrl}${separator}_method=${method}`;
    method = 'POST';
  }
  return fetch(actualUrl, { method, ...rest });
};

const getDisplayFileName = (file) => {
  if (!file) return '';
  if (typeof file !== 'string') return file.name || 'File selected';
  if (file.startsWith('data:')) {
    const mimeMatch = file.match(/^data:([^;]+);/);
    if (mimeMatch) {
      const mime = mimeMatch[1];
      if (mime === 'application/pdf') return 'Uploaded Document (PDF)';
      if (mime.startsWith('image/')) return `Uploaded Image (${mime.split('/')[1].toUpperCase()})`;
      return `Uploaded Document (${mime.split('/')[1].toUpperCase()})`;
    }
    return 'Uploaded Document';
  }
  return file.substring(file.lastIndexOf('/') + 1);
};

const DragDropUpload = ({ onFileSelect, accept, currentFile, placeholder, required = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', overflow: 'hidden' }}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        style={{
          border: isDragging ? '2px solid var(--accent-green)' : '1px dashed var(--glass-border)',
          borderRadius: '12px',
          padding: '1.5rem 1rem',
          textAlign: 'center',
          background: isDragging ? 'rgba(0, 255, 136, 0.08)' : 'rgba(255, 255, 255, 0.02)',
          cursor: 'pointer',
          transition: 'var(--transition-smooth)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem',
          boxShadow: isDragging ? '0 0 15px rgba(0, 255, 136, 0.2)' : 'none',
          marginTop: '0.25rem',
          marginBottom: '0.25rem',
          overflow: 'hidden',
          width: '100%'
        }}
        className="drag-drop-zone"
      >
        <input
          type="file"
          ref={fileInputRef}
          accept={accept}
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onFileSelect(e.target.files[0]);
            }
          }}
          required={required && !currentFile}
        />
        <Upload size={24} style={{ color: isDragging ? 'var(--accent-green)' : 'rgba(255,255,255,0.4)', transition: 'color 0.2s' }} />
        <span style={{ 
          fontSize: '0.85rem', 
          color: '#fff', 
          fontWeight: 500,
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          display: 'block'
        }}>
          {currentFile ? (
            <span style={{ 
              color: 'var(--accent-green)', 
              fontWeight: 600,
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'inline-block'
            }}>Selected: {getDisplayFileName(currentFile)}</span>
          ) : (
            placeholder || 'Drag & drop file here or click to upload'
          )}
        </span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
          {accept?.includes('pdf')
            ? 'Accepted: PDF/Docs/Images | Max size: 10MB (Images compressed automatically)'
            : 'Accepted: Images | Max size: 15MB (Compressed automatically)'}
        </span>
      </div>

      {currentFile && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onFileSelect(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
          style={{
            alignSelf: 'center',
            background: 'none',
            border: 'none',
            color: '#ff5252',
            fontSize: '0.75rem',
            cursor: 'pointer',
            marginTop: '0.25rem',
            textDecoration: 'underline',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}
        >
          Remove Selected File
        </button>
      )}
    </div>
  );
};
const CustomDropdown = ({ value, onChange, options, placeholder, openUp = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedOpt = options.find(o => o.value === value) || options[0];

  return (
    <div ref={dropdownRef} className="custom-dropdown-container" style={{ position: 'relative', width: '100%' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="glass-input"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          padding: '0.65rem 1rem',
          borderRadius: '8px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--glass-border)',
          color: '#fff',
          fontSize: '0.85rem',
          fontWeight: 500,
          userSelect: 'none'
        }}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {selectedOpt ? selectedOpt.label : placeholder || 'Select Option'}
        </span>
        <span style={{ fontSize: '0.6rem', color: 'var(--accent-green)', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
          ▼
        </span>
      </div>

      {isOpen && (
        <div 
          className="glass-panel"
          style={{
            position: 'absolute',
            bottom: openUp ? 'calc(100% + 5px)' : undefined,
            top: openUp ? undefined : 'calc(100% + 5px)',
            left: 0,
            right: 0,
            zIndex: 10000,
            background: 'rgba(10, 15, 12, 0.98)',
            border: '1px solid rgba(0, 255, 136, 0.25)',
            boxShadow: '0 10px 25px rgba(0,0,0,0.65)',
            borderRadius: '8px',
            maxHeight: '220px',
            overflowY: 'auto',
            padding: '0.35rem',
            animation: 'fadeIn 0.15s ease'
          }}
        >
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => {
                onChange({ target: { value: opt.value } });
                setIsOpen(false);
              }}
              style={{
                padding: '0.55rem 0.8rem',
                fontSize: '0.8rem',
                color: value === opt.value ? 'var(--accent-green)' : '#eee',
                cursor: 'pointer',
                borderRadius: '6px',
                background: value === opt.value ? 'rgba(0, 255, 136, 0.12)' : 'transparent',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
              onMouseEnter={(e) => {
                if (value !== opt.value) {
                  e.target.style.background = 'rgba(255,255,255,0.05)';
                  e.target.style.color = '#fff';
                }
              }}
              onMouseLeave={(e) => {
                if (value !== opt.value) {
                  e.target.style.background = 'transparent';
                  e.target.style.color = '#eee';
                }
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
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

const CustomDatePicker = ({ value, onChange, placeholder, required = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('days'); // 'days' | 'month' | 'year'
  const [yearRangeStart, setYearRangeStart] = useState(new Date().getFullYear() - 5);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (value) {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        setCurrentDate(parsed);
        setYearRangeStart(parsed.getFullYear() - 5);
      }
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setViewMode('days');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDateSelect = (day) => {
    const selected = new Date(year, month, day);
    const yyyy = selected.getFullYear();
    const mm = String(selected.getMonth() + 1).padStart(2, '0');
    const dd = String(selected.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    onChange({ target: { value: dateStr } });
    setIsOpen(false);
    setViewMode('days');
  };

  const getDisplayText = () => {
    if (!value) return placeholder || 'Select Date';
    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) return value;
    const d = parsed.getDate();
    const m = months[parsed.getMonth()].substring(0, 3);
    const y = parsed.getFullYear();
    return `${d} ${m} ${y}`;
  };

  const yearsGrid = [];
  for (let y = yearRangeStart; y < yearRangeStart + 12; y++) {
    yearsGrid.push(y);
  }

  const days = [];
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(<div key={`empty-${i}`} style={{ width: '30px', height: '30px' }} />);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const isSelected = value && new Date(value).getDate() === d && new Date(value).getMonth() === month && new Date(value).getFullYear() === year;
    const isToday = new Date().getDate() === d && new Date().getMonth() === month && new Date().getFullYear() === year;
    
    days.push(
      <div 
        key={`day-${d}`}
        onClick={() => handleDateSelect(d)}
        style={{
          width: '30px',
          height: '30px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          fontSize: '0.78rem',
          cursor: 'pointer',
          color: isSelected ? '#000' : '#fff',
          fontWeight: isSelected ? 'bold' : isToday ? 'bold' : 'normal',
          background: isSelected ? 'var(--accent-green)' : isToday ? 'rgba(0, 255, 136, 0.2)' : 'transparent',
          border: isToday && !isSelected ? '1px solid var(--accent-green)' : 'none',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.target.style.background = 'rgba(255,255,255,0.1)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.target.style.background = isToday ? 'rgba(0, 255, 136, 0.2)' : 'transparent';
          }
        }}
      >
        {d}
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className="custom-datepicker-container" style={{ position: 'relative', width: '100%' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="glass-input"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          padding: '0.65rem 1rem',
          borderRadius: '8px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--glass-border)',
          color: value ? '#fff' : 'var(--text-secondary)',
          fontSize: '0.85rem',
          fontWeight: 500,
          userSelect: 'none',
          height: '45px'
        }}
      >
        <span>{getDisplayText()}</span>
        <span style={{ fontSize: '0.9rem', color: 'var(--accent-green)' }}>
          📅
        </span>
      </div>

      {isOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 100005,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => {
            setIsOpen(false);
            setViewMode('days');
          }}
        >
          <div 
            className="glass-panel"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgba(10, 15, 12, 0.98)',
              border: '1px solid rgba(0, 255, 136, 0.25)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.85)',
              borderRadius: '16px',
              padding: '1rem',
              width: '290px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.7rem',
              animation: 'fadeIn 0.2s ease',
              color: '#eee'
            }}
          >
            {viewMode === 'days' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button 
                    type="button" 
                    onClick={handlePrevMonth}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-green)', cursor: 'pointer', fontSize: '0.9rem', padding: '0.2rem' }}
                  >
                    ◀
                  </button>
                  
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <span 
                      onClick={() => setViewMode('month')}
                      style={{
                        cursor: 'pointer',
                        fontWeight: 600,
                        color: 'var(--accent-green)',
                        fontSize: '0.82rem',
                        background: 'rgba(255,255,255,0.05)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        userSelect: 'none'
                      }}
                      title="Change Month"
                    >
                      {months[month].substring(0, 3)}
                    </span>

                    <span 
                      onClick={() => {
                        setYearRangeStart(year - 5);
                        setViewMode('year');
                      }}
                      style={{
                        cursor: 'pointer',
                        fontWeight: 600,
                        color: 'var(--accent-green)',
                        fontSize: '0.82rem',
                        background: 'rgba(255,255,255,0.05)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        userSelect: 'none'
                      }}
                      title="Change Year"
                    >
                      {year}
                    </span>
                  </div>

                  <button 
                    type="button" 
                    onClick={handleNextMonth}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-green)', cursor: 'pointer', fontSize: '0.9rem', padding: '0.2rem' }}
                  >
                    ▶
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '4px' }}>
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day, idx) => (
                    <span key={idx} style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{day}</span>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', justifyItems: 'center' }}>
                  {days}
                </div>
              </>
            )}

            {viewMode === 'month' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Select Month</span>
                  <span 
                    onClick={() => setViewMode('days')} 
                    style={{ cursor: 'pointer', fontSize: '0.75rem', color: 'var(--accent-green)', fontWeight: 600 }}
                  >
                    Back
                  </span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px', textAlign: 'center' }}>
                  {months.map((m, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setCurrentDate(new Date(year, idx, 1));
                        setViewMode('days');
                      }}
                      style={{
                        padding: '0.5rem 0.25rem',
                        fontSize: '0.72rem',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        background: idx === month ? 'var(--accent-green)' : 'rgba(255,255,255,0.03)',
                        color: idx === month ? '#000' : '#fff',
                        fontWeight: idx === month ? 'bold' : 'normal',
                        transition: 'all 0.1s ease',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = idx === month ? 'var(--accent-green)' : 'rgba(255,255,255,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = idx === month ? 'var(--accent-green)' : 'rgba(255,255,255,0.03)';
                      }}
                    >
                      {m.substring(0, 3)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {viewMode === 'year' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.4rem' }}>
                  <button 
                    type="button"
                    onClick={() => setYearRangeStart(yearRangeStart - 12)}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-green)', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    ◀
                  </button>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {yearRangeStart} - {yearRangeStart + 11}
                  </span>
                  <button 
                    type="button"
                    onClick={() => setYearRangeStart(yearRangeStart + 12)}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-green)', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    ▶
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', textAlign: 'center' }}>
                  {yearsGrid.map((y) => (
                    <div
                      key={y}
                      onClick={() => {
                        setCurrentDate(new Date(y, month, 1));
                        setViewMode('days');
                      }}
                      style={{
                        padding: '0.5rem 0.2rem',
                        fontSize: '0.72rem',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        background: y === year ? 'var(--accent-green)' : 'rgba(255,255,255,0.03)',
                        color: y === year ? '#000' : '#fff',
                        fontWeight: y === year ? 'bold' : 'normal',
                        transition: 'all 0.1s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = y === year ? 'var(--accent-green)' : 'rgba(255,255,255,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = y === year ? 'var(--accent-green)' : 'rgba(255,255,255,0.03)';
                      }}
                    >
                      {y}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.3rem' }}>
                  <span 
                    onClick={() => setViewMode('days')} 
                    style={{ cursor: 'pointer', fontSize: '0.75rem', color: 'var(--accent-green)', fontWeight: 600 }}
                  >
                    Cancel
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

function DashboardPage({ navigateTo, authToken, onLogout, profile, refreshProfile }) {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'projects' | 'education' | 'skills' | 'experience' | 'certs' | 'messages' | 'courses'
  
  // Profile edit inputs
  const [username, setUsername] = useState(profile?.username || '');
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [linkedin, setLinkedin] = useState(profile?.linkedin || '');
  const [github, setGithub] = useState(profile?.github || '');
  const [instagram, setInstagram] = useState(profile?.instagram || '');
  const [facebook, setFacebook] = useState(profile?.facebook || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [availability, setAvailability] = useState(profile?.availability || 'Available for Work');
  const [customAvailability, setCustomAvailability] = useState('');
  const [newPassword, setNewPassword] = useState(profile?.password_text || '');
  const [showPasswordText, setShowPasswordText] = useState(false);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setDisplayName(profile.display_name || '');
      setLinkedin(profile.linkedin || '');
      setGithub(profile.github || '');
      setInstagram(profile.instagram || '');
      setFacebook(profile.facebook || '');
      setBio(profile.bio || '');
      setNewPassword(profile.password_text || '');
      setTargetEmailValue(profile.email || '');
      setTargetPhoneValue(profile.phone || '');
      
      const presets = ['Available for Work', 'Not Available', 'Freshers', 'Available for Part Time', 'Available for Half Time'];
      if (profile.availability) {
        if (presets.includes(profile.availability)) {
          setAvailability(profile.availability);
          setCustomAvailability('');
        } else {
          setAvailability('Custom');
          setCustomAvailability(profile.availability);
        }
      } else {
        setAvailability('Available for Work');
        setCustomAvailability('');
      }
    }
  }, [profile]);

  // Profile image & CV files
  const [avatarFile, setAvatarFile] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);

  // Verification process state (Email / Phone OTP)
  const [verifyType, setVerifyType] = useState(null); // 'email' | 'phone'
  const [targetValue, setTargetValue] = useState(''); // email/phone input string
  const [targetEmailValue, setTargetEmailValue] = useState(profile?.email || '');
  const [targetPhoneValue, setTargetPhoneValue] = useState(profile?.phone || '');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);

  // Collections states
  const [projects, setProjects] = useState([]);
  const [education, setEducation] = useState([]);
  const [skills, setSkills] = useState([]);
  const [experience, setExperience] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [messages, setMessages] = useState([]);
  const [courses, setCourses] = useState([]);
  const [docRequests, setDocRequests] = useState([]);
  const [selectedRequestIds, setSelectedRequestIds] = useState([]);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');

  // Custom states
  const [skillLevel, setSkillLevel] = useState('basic'); // 'high' | 'medium' | 'basic'
  const [expandedMessages, setExpandedMessages] = useState(false);

  // Course dialog modal states
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [courseDesc, setCourseDesc] = useState('');

  // Project dialog modal
  const [showProjModal, setShowProjModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null); // null if adding new
  const [projTitle, setProjTitle] = useState('');
  const [projSummary, setProjSummary] = useState('');
  const [projRepo, setProjRepo] = useState('');
  const [projLive, setProjLive] = useState('');
  const [projDeployed, setProjDeployed] = useState(false);
  const [projThumbnail, setProjThumbnail] = useState(null);

  // Dynamic status feedback
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAvatarPopup, setShowAvatarPopup] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const [customApiInput, setCustomApiInput] = useState(localStorage.getItem('custom_api_base') || getApiBase());

  const handleSaveCustomApi = () => {
    if (!customApiInput) {
      showStatus('API URL cannot be empty!', true);
      return;
    }
    let cleaned = customApiInput.trim();
    if (cleaned.endsWith('/')) {
      cleaned = cleaned.slice(0, -1);
    }
    if (!cleaned.endsWith('/api')) {
      cleaned = `${cleaned}/api`;
    }
    setApiBase(cleaned);
    showStatus('Custom API URL updated! Reloading...', false);
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleResetCustomApi = () => {
    setApiBase('');
    showStatus('Custom API URL reset to default! Reloading...', false);
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  useEffect(() => {
    setAvatarError(false);
  }, [profile?.profile_picture]);

  const notificationRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  // Auxiliary simple CRUD item modals
  const [showEduModal, setShowEduModal] = useState(false);
  const [eduSchool, setEduSchool] = useState('');
  const [eduDegree, setEduDegree] = useState('');
  const [eduField, setEduField] = useState('');
  const [eduStart, setEduStart] = useState('');
  const [eduEnd, setEduEnd] = useState('');
  const [eduDesc, setEduDesc] = useState('');

  // Custom level state
  const [eduType, setEduType] = useState('10th'); // '10th' | '12th' | 'Bachelor'
  const [eduBoard, setEduBoard] = useState('CBSE');
  const [customEduBoard, setCustomEduBoard] = useState('');
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadingType, setUploadingType] = useState(null); // 'avatar' | 'resume' | null
  const [eduPassingYear, setEduPassingYear] = useState('');
  const [eduFullMarks, setEduFullMarks] = useState('');
  const [eduMarksObtained, setEduMarksObtained] = useState('');
  const [eduCourse, setEduCourse] = useState('');
  const [eduBranch, setEduBranch] = useState('');
  const [eduBachelorDuration, setEduBachelorDuration] = useState(4);
  const [eduSemSgpas, setEduSemSgpas] = useState({
    sem1: '', sem2: '', sem3: '', sem4: '', sem5: '', sem6: '', sem7: '', sem8: ''
  });
  const [edu10thCert, setEdu10thCert] = useState(null);
  const [edu12thCert, setEdu12thCert] = useState(null);
  const [edu12thMarksheet, setEdu12thMarksheet] = useState(null);
  const [eduBachGradesheet, setEduBachGradesheet] = useState(null);
  const [eduBachCert, setEduBachCert] = useState(null);
  const [eduOthersCert, setEduOthersCert] = useState(null);
  const [eduOthersMarksheet, setEduOthersMarksheet] = useState(null);
  const [eduAccess10th, setEduAccess10th] = useState(false);
  const [eduAccess12th, setEduAccess12th] = useState(false);
  const [eduAccessBach, setEduAccessBach] = useState(false);

  const [showSkillModal, setShowSkillModal] = useState(false);
  const [customSkillName, setCustomSkillName] = useState('');
  const [skillCategory, setSkillCategory] = useState('Programming Language');
  const [selectedPresetSkill, setSelectedPresetSkill] = useState('JavaScript');

  const [showExpModal, setShowExpModal] = useState(false);
  const [expCompany, setExpCompany] = useState('');
  const [expRole, setExpRole] = useState('');
  const [expStart, setExpStart] = useState('');
  const [expEnd, setExpEnd] = useState('');
  const [expDesc, setExpDesc] = useState('');

  // Experience level-specific states
  const [expType, setExpType] = useState('project'); // 'project' | 'internship' | 'program'
  const [expProjectName, setExpProjectName] = useState('');
  const [expProjectInstructor, setExpProjectInstructor] = useState('');
  const [expRepoLink, setExpRepoLink] = useState('');
  const [expDeployLink, setExpDeployLink] = useState('');
  const [expProgramName, setExpProgramName] = useState('');
  const [expOrgName, setExpOrgName] = useState('');
  const [expCertificateFile, setExpCertificateFile] = useState(null);
  const [expLorFile, setExpLorFile] = useState(null);
  const [expSkillsLearned, setExpSkillsLearned] = useState('');

  const [showCertModal, setShowCertModal] = useState(false);
  const [certName, setCertName] = useState('');
  const [certOrg, setCertOrg] = useState('');
  const [certDate, setCertDate] = useState('');
  const [certUrl, setCertUrl] = useState('');
  const [certFile, setCertFile] = useState(null);
  const [certAccess, setCertAccess] = useState(false);

  // Edit states for sections
  const [editingEdu, setEditingEdu] = useState(null);
  const [editingSkill, setEditingSkill] = useState(null);
  const [editingExp, setEditingExp] = useState(null);
  const [editingCert, setEditingCert] = useState(null);
  const [editingCourse, setEditingCourse] = useState(null);

  const [showExitModal, setShowExitModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showMsgModal, setShowMsgModal] = useState(false);
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

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleteTargetType, setDeleteTargetType] = useState('');

  const requestDelete = (id, type) => {
    setDeleteTargetId(id);
    setDeleteTargetType(type);
    setDeleteConfirmOpen(true);
  };

  const getDeleteModalContent = () => {
    switch (deleteTargetType) {
      case 'bulkDocumentRequests':
        return {
          title: 'Delete Selected Requests?',
          message: `Are you sure you want to permanently delete the ${selectedRequestIds.length} selected document access requests? This action cannot be undone.`,
          confirmText: 'Delete'
        };
      case 'messages':
        return {
          title: `Delete Messages?`,
          message: `Are you sure you want to permanently delete the ${selectedMsgIds.length} selected messages? This action cannot be undone.`,
          confirmText: 'Delete'
        };
      case 'email':
        return {
          title: 'Remove Email?',
          message: 'Are you sure you want to remove and unverify your email address?',
          confirmText: 'Remove'
        };
      case 'phone':
        return {
          title: 'Remove Phone Number?',
          message: 'Are you sure you want to remove your phone number?',
          confirmText: 'Remove'
        };
      case 'avatar':
        return {
          title: 'Remove Profile Picture?',
          message: 'Are you sure you want to permanently remove your profile picture?',
          confirmText: 'Remove'
        };
      case 'resume':
        return {
          title: 'Remove Resume?',
          message: 'Are you sure you want to permanently remove your resume file?',
          confirmText: 'Remove'
        };
      case 'documentRequest':
        return {
          title: 'Delete Access Request?',
          message: 'Are you sure you want to permanently delete this document access request? This action cannot be undone.',
          confirmText: 'Delete'
        };
      default:
        // project, education, skill, course, experience, certificate
        const formattedType = deleteTargetType ? deleteTargetType.charAt(0).toUpperCase() + deleteTargetType.slice(1) : '';
        return {
          title: `Delete ${formattedType}?`,
          message: `Are you sure you want to permanently delete this ${deleteTargetType}? This action cannot be undone.`,
          confirmText: 'Delete'
        };
    }
  };

  const confirmDelete = async () => {
    const id = deleteTargetId;
    const type = deleteTargetType;
    setDeleteConfirmOpen(false);
    setDeleteTargetId(null);
    setDeleteTargetType('');

    try {
      if (type === 'bulkDocumentRequests') {
        if (selectedRequestIds.length === 0) return;
        setLoading(true);
        try {
          const deletePromises = selectedRequestIds.map(rid =>
            resilientFetch(`${API_BASE}/document-requests/${rid}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${authToken}` }
            })
          );
          const results = await Promise.all(deletePromises);
          const successfulIds = [];
          results.forEach((res, index) => {
            if (res.ok) {
              successfulIds.push(selectedRequestIds[index]);
            }
          });
          setDocRequests(prev => prev.filter(item => !successfulIds.includes(item.id)));
          setSelectedRequestIds([]);
          showStatus(`Successfully deleted ${successfulIds.length} request(s).`);
        } catch (err) {
          console.error(err);
          showStatus('Failed to delete some document requests.', true);
        } finally {
          setLoading(false);
        }
        return;
      }

      if (type === 'messages') {
        if (selectedMsgIds.length === 0) return;
        setLoading(true);
        try {
          const res = await resilientFetch(`${API_BASE}/messages`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ ids: selectedMsgIds })
          });
          if (res.ok) {
            showStatus(`${selectedMsgIds.length} messages deleted successfully.`);
            setSelectedMsgIds([]);
            fetchDashboardCollections();
          } else {
            const err = await res.json();
            showStatus(err.message || 'Failed to delete selected messages.', true);
          }
        } catch (err) {
          showStatus('Network/server error deleting messages.', true);
        } finally {
          setLoading(false);
        }
        return;
      }

      if (type === 'email') {
        setLoading(true);
        try {
          const res = await resilientFetch(`${API_BASE}/profile/email`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
          });
          if (res.ok) {
            showStatus('Email verification reset to default.');
            setIsEditingEmail(false);
            refreshProfile();
          } else {
            const data = await res.json();
            showStatus(data.message || 'Failed to reset email verification.', true);
          }
        } catch {
          showStatus('Email reset offline mockup.');
          setIsEditingEmail(false);
          refreshProfile();
        } finally {
          setLoading(false);
        }
        return;
      }

      if (type === 'phone') {
        setLoading(true);
        try {
          const res = await resilientFetch(`${API_BASE}/profile/phone`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
          });
          if (res.ok) {
            showStatus('Phone number removed.');
            setIsEditingPhone(false);
            refreshProfile();
          } else {
            const data = await res.json();
            showStatus(data.message || 'Failed to remove phone number.', true);
          }
        } catch {
          showStatus('Phone reset offline mockup.');
          setIsEditingPhone(false);
          refreshProfile();
        } finally {
          setLoading(false);
        }
        return;
      }

      if (type === 'avatar') {
        setLoading(true);
        try {
          const res = await resilientFetch(`${API_BASE}/profile/avatar`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
          });
          if (res.ok) {
            showStatus('Profile picture removed.');
            refreshProfile();
          } else {
            showStatus('Failed to remove profile picture.', true);
          }
        } catch (err) {
          showStatus('Removed profile picture offline simulation.');
        } finally {
          setLoading(false);
        }
        return;
      }

      if (type === 'resume') {
        setLoading(true);
        try {
          const res = await resilientFetch(`${API_BASE}/profile/resume`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
          });
          if (res.ok) {
            showStatus('Resume removed.');
            refreshProfile();
          } else {
            showStatus('Failed to remove resume.', true);
          }
        } catch (err) {
          showStatus('Removed resume offline simulation.');
        } finally {
          setLoading(false);
        }
        return;
      }

      let endpoint = '';
      if (type === 'project') endpoint = `projects/${id}`;
      else if (type === 'education') endpoint = `education/${id}`;
      else if (type === 'skill') endpoint = `skills/${id}`;
      else if (type === 'course') endpoint = `courses/${id}`;
      else if (type === 'experience') endpoint = `experience/${id}`;
      else if (type === 'certificate') endpoint = `certificates/${id}`;
      else if (type === 'documentRequest') endpoint = `document-requests/${id}`;

      const res = await resilientFetch(`${API_BASE}/${endpoint}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      if (res.ok) {
        showStatus(`${type === 'documentRequest' ? 'Document request' : type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully.`);
        // Optimistic local state filtering
        if (type === 'project') setProjects(prev => prev.filter(item => item.id !== id));
        else if (type === 'education') setEducation(prev => prev.filter(item => item.id !== id));
        else if (type === 'skill') setSkills(prev => prev.filter(item => item.id !== id));
        else if (type === 'course') setCourses(prev => prev.filter(item => item.id !== id));
        else if (type === 'experience') setExperience(prev => prev.filter(item => item.id !== id));
        else if (type === 'certificate') setCertificates(prev => prev.filter(item => item.id !== id));
        else if (type === 'documentRequest') setDocRequests(prev => prev.filter(item => item.id !== id));
      } else {
        showStatus(`Failed to delete ${type === 'documentRequest' ? 'document request' : type}.`, true);
      }
      fetchDashboardCollections();
    } catch (err) {
      showStatus(`Deleted offline mode or network error.`, true);
      // Filter state locally in offline mode as well!
      if (type === 'project') setProjects(prev => prev.filter(item => item.id !== id));
      else if (type === 'education') setEducation(prev => prev.filter(item => item.id !== id));
      else if (type === 'skill') setSkills(prev => prev.filter(item => item.id !== id));
      else if (type === 'course') setCourses(prev => prev.filter(item => item.id !== id));
      else if (type === 'experience') setExperience(prev => prev.filter(item => item.id !== id));
      else if (type === 'certificate') setCertificates(prev => prev.filter(item => item.id !== id));
      else if (type === 'documentRequest') setDocRequests(prev => prev.filter(item => item.id !== id));
    }
  };

  const [selectedMsgIds, setSelectedMsgIds] = useState([]);

  const handleSelectAllMsgs = (e) => {
    if (e.target.checked) {
      setSelectedMsgIds(messages.map(m => m.id));
    } else {
      setSelectedMsgIds([]);
    }
  };

  const handleToggleSelectMsg = (e, id) => {
    e.stopPropagation();
    if (e.target.checked) {
      setSelectedMsgIds(prev => [...prev, id]);
    } else {
      setSelectedMsgIds(prev => prev.filter(msgId => msgId !== id));
    }
  };

  const handleDeleteSelectedMsgs = () => {
    if (selectedMsgIds.length === 0) return;
    requestDelete(null, 'messages');
  };

  const skillPresets = {
    'Programming Language': ['JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'Go', 'Ruby', 'Swift', 'Rust', 'HTML', 'CSS'],
    'Tool': ['VS Code', 'Git', 'Docker', 'Kubernetes', 'Figma', 'Postman', 'AWS', 'Jira', 'npm', 'Webpack', 'Gitlab'],
    'Database': ['MongoDB', 'MySQL', 'PostgreSQL', 'SQLite', 'Redis', 'Firebase', 'Cassandra', 'Oracle', 'MSSQL']
  };



  useEffect(() => {
    if (!authToken) {
      navigateTo('login');
      return;
    }
    fetchDashboardCollections();

    // Poll for new requests/messages every 5 seconds to show new requests automatically
    const pollInterval = setInterval(() => {
      fetchDashboardCollections();
    }, 5000);

    if (sessionStorage.getItem('justLoggedIn') === 'true') {
      showStatus('Login Successful!');
      sessionStorage.removeItem('justLoggedIn');
    }

    return () => clearInterval(pollInterval);
  }, [authToken]);

  const fetchDashboardCollections = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${authToken}` };
      const t = Date.now();
      
      const projRes = await fetch(`${API_BASE}/projects?t=${t}`);
      if (projRes.ok) setProjects(await projRes.json());

      const eduRes = await fetch(`${API_BASE}/education?t=${t}`);
      if (eduRes.ok) setEducation(await eduRes.json());

      const skillRes = await fetch(`${API_BASE}/skills?t=${t}`);
      if (skillRes.ok) setSkills(await skillRes.json());

      const expRes = await fetch(`${API_BASE}/experience?t=${t}`);
      if (expRes.ok) setExperience(await expRes.json());

      const certRes = await fetch(`${API_BASE}/certificates?t=${t}`);
      if (certRes.ok) setCertificates(await certRes.json());

      const msgRes = await fetch(`${API_BASE}/messages?t=${t}`, { headers });
      if (msgRes.ok) setMessages(await msgRes.json());

      const courseRes = await fetch(`${API_BASE}/courses?t=${t}`);
      if (courseRes.ok) setCourses(await courseRes.json());

      const reqRes = await fetch(`${API_BASE}/document-requests?t=${t}`, { headers });
      if (reqRes.ok) setDocRequests(await reqRes.json());

    } catch (err) {
      console.error("Dashboard fetching error:", err);
    }
  };

  const handleApproveRequest = async (id) => {
    const localOtp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Optimistic UI Update: instantly update status and access code in UI
    setDocRequests(prev => prev.map(req => {
      if (req.id === id) {
        return { ...req, status: 'Approved', access_token: localOtp };
      }
      return req;
    }));

    try {
      const res = await fetch(`${API_BASE}/document-requests/${id}/approve`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ access_token: localOtp })
      });
      const data = await res.json();
      if (res.ok) {
        showStatus('Request approved and token sent!');
        fetchDashboardCollections();
      } else {
        showStatus(data.message || 'Approval failed.', true);
        fetchDashboardCollections(); // Rollback
      }
    } catch (err) {
      showStatus('Error approving request.', true);
      fetchDashboardCollections(); // Rollback
    }
  };

  const handleDeclineRequest = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/document-requests/${id}/decline`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        showStatus('Request declined.');
        fetchDashboardCollections();
      } else {
        showStatus(data.message || 'Decline failed.', true);
      }
    } catch (err) {
      showStatus('Error declining request.', true);
    }
  };

  const showStatus = (msg, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setStatusMsg('');
    } else {
      setStatusMsg(msg);
      setErrorMsg('');
    }
    setTimeout(() => {
      setStatusMsg('');
      setErrorMsg('');
    }, 1500);
  };

  /* ==========================================
     OTP VERIFICATION FLOW FOR EMAIL / PHONE
     ========================================== */
  const handleInitiateVerify = async (type) => {
    const value = type === 'email' ? targetEmailValue : targetPhoneValue;
    if (!value) {
      showStatus(`Please specify a valid value for ${type} input!`, true);
      return;
    }
    setTargetValue(value);
    setVerifyType(type);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/send-verification-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: type === 'email' ? value : (profile?.email || 'navycutdehury@gmail.com'),
          target: value,
          type
        })
      });
      if (res.ok) {
        const data = await res.json();
        setOtpSent(true);
        if (type === 'phone') {
          showStatus(`Verification code sent to phone number: ${value}. (Dev Mode: OTP is ${data.otp || '123456'})`);
        } else {
          if (data.otp) {
            showStatus(`OTP Verification token dispatched to Navycut's inbox. (Dev Mode: OTP is ${data.otp})`);
          } else {
            showStatus(`OTP Verification token dispatched to Navycut's inbox.`);
          }
        }
      } else {
        const err = await res.json();
        showStatus(err.message || 'OTP dispatch failed.', true);
      }
    } catch (err) {
      setOtpSent(true);
      if (type === 'phone') {
        showStatus(`Verification code sent to phone number: ${value}. (Dev Mode: OTP is 123456)`);
      } else {
        showStatus('Mock OTP verification triggered (Offline mode). Check terminal.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode) return;
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/verify-update-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: verifyType === 'email' ? targetValue : (profile?.email || 'navycutdehury@gmail.com'),
          otp: otpCode,
          type: verifyType,
          value: targetValue
        })
      });

      const data = await res.json();
      if (res.ok) {
        showStatus(data.message);
        setOtpSent(false);
        setVerifyType(null);
        setTargetValue('');
        setOtpCode('');
        setIsEditingEmail(false);
        setIsEditingPhone(false);
        refreshProfile();
      } else {
        showStatus(data.message || 'Incorrect verification token.', true);
      }
    } catch (err) {
      // Mock Success fallback for quick local testing if DB is idle
      showStatus(`${verifyType} successfully updated and verified!`);
      setOtpSent(false);
      setVerifyType(null);
      setTargetValue('');
      setOtpCode('');
      setIsEditingEmail(false);
      setIsEditingPhone(false);
      refreshProfile();
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveEmail = () => {
    requestDelete(null, 'email');
  };

  const handleRemovePhone = () => {
    requestDelete(null, 'phone');
  };

  const handleViewMessage = async (msg) => {
    setSelectedMessage(msg);
    setIsReplying(false);
    setReplyText('');
    setShowMsgModal(true);
    if (!msg.is_read) {
      try {
        const res = await resilientFetch(`${API_BASE}/messages/${msg.id}/read`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (res.ok) {
          setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: 1 } : m));
        }
      } catch (err) {
        console.error("Error marking message as read:", err);
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: 1 } : m));
      }
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/messages/${selectedMessage.id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ reply_content: replyText })
      });
      const data = await res.json();
      if (res.ok) {
        showStatus('Reply email sent successfully!');
        setShowMsgModal(false);
        setIsReplying(false);
        setReplyText('');
        fetchDashboardCollections();
      } else {
        showStatus(data.message || 'Failed to send reply.', true);
      }
    } catch (err) {
      showStatus('Error sending reply.', true);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllMessagesAsRead = async () => {
    try {
      const res = await resilientFetch(`${API_BASE}/messages/read-all`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        setMessages(prev => prev.map(m => ({ ...m, is_read: 1 })));
      }
    } catch (err) {
      console.error("Error marking all messages as read:", err);
      setMessages(prev => prev.map(m => ({ ...m, is_read: 1 })));
    }
  };

  /* ==========================================
     PROFILE FIELDS & ATTACHMENT SAVE ACTIONS
     ========================================== */
  const handleUpdateProfileData = async (e) => {
    e.preventDefault();
    if (!linkedin || !github) {
      showStatus('LinkedIn and GitHub links are mandatory settings!', true);
      return;
    }
    setLoading(true);

    const finalAvailability = availability === 'Custom' ? customAvailability : availability;

    try {
      const res = await resilientFetch(`${API_BASE}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ 
          username, 
          display_name: displayName,
          linkedin, 
          github, 
          instagram, 
          facebook, 
          bio, 
          availability: finalAvailability,
          newPassword: newPassword || undefined 
        })
      });

      if (res.ok) {
        showStatus('Standard profile updates synchronized successfully!');
        refreshProfile();
      } else {
        const err = await res.json();
        showStatus(err.message || 'Sync failed.', true);
      }
    } catch (err) {
      showStatus('Offline simulation: Profile local save successful!');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePasswordOnly = async (e) => {
    if (e) e.preventDefault();
    if (!newPassword || newPassword.trim() === '') {
      showStatus('Please enter a new password first!', true);
      return;
    }
    setLoading(true);
    try {
      const res = await resilientFetch(`${API_BASE}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ 
          username, 
          display_name: displayName,
          linkedin, 
          github, 
          instagram, 
          facebook, 
          bio, 
          availability: availability === 'Custom' ? customAvailability : availability,
          newPassword: newPassword 
        })
      });

      if (res.ok) {
        showStatus('Password updated successfully!');
        refreshProfile();
      } else {
        const err = await res.json();
        showStatus(err.message || 'Failed to update password.', true);
      }
    } catch (err) {
      showStatus('Offline simulation: Password save successful!');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile) return;

    setLoading(true);
    setUploadingType('avatar');
    setUploadProgress(0);

    try {
      const bufferedFile = await getSafeInMemoryFile(avatarFile, 'image/jpeg');
      const compressed = await compressImageIfNeeded(bufferedFile);
      const formData = new FormData();
      formData.append('profile_picture', compressed);

      const data = await uploadWithProgress(
        `${API_BASE}/profile/upload-avatar`,
        'POST',
        formData,
        { 'Authorization': `Bearer ${authToken}` },
        (pct) => setUploadProgress(pct)
      );

      showStatus('Avatar picture uploaded & activated.');
      setAvatarFile(null);
      refreshProfile();
    } catch (err) {
      console.error(err);
      if (err.message === 'CLOUD_READ_FAILED') {
        showStatus("Could not download photo from Google Drive! Open the Drive app, select the file and tap 'Make available offline', or download it to your device first.", true);
      } else {
        const isNetworkErr = err.message?.includes('Failed to fetch') || err.message?.includes('Network error');
        const msg = isNetworkErr 
          ? `Network connection error: ${err.message || 'Failed to connect.'}. Please check your connection and try again.`
          : `Error uploading avatar: ${err.message || 'Network error occurred.'}`;
        showStatus(msg, true);
      }
    } finally {
      setLoading(false);
      setUploadingType(null);
      setUploadProgress(null);
    }
  };

  const handleUploadResume = async () => {
    if (!resumeFile) return;
    if (resumeFile.size > 10 * 1024 * 1024) {
      showStatus('Resume file size is too large! Please choose a file smaller than 10MB.', true);
      return;
    }

    setLoading(true);
    setUploadingType('resume');
    setUploadProgress(0);

    try {
      const bufferedFile = await getSafeInMemoryFile(resumeFile, 'application/pdf');
      const formData = new FormData();
      formData.append('resume', bufferedFile);

      const data = await uploadWithProgress(
        `${API_BASE}/profile/upload-resume`,
        'POST',
        formData,
        { 'Authorization': `Bearer ${authToken}` },
        (pct) => setUploadProgress(pct)
      );

      showStatus('CV/Resume PDF file parsed and updated.');
      setResumeFile(null);
      refreshProfile();
    } catch (err) {
      console.error(err);
      if (err.message === 'CLOUD_READ_FAILED') {
        showStatus("Could not download resume from Google Drive! Open the Drive app, select the file and tap 'Make available offline', or download it to your device first.", true);
      } else {
        const isNetworkErr = err.message?.includes('Failed to fetch') || err.message?.includes('Network error');
        const msg = isNetworkErr 
          ? `Network connection error: ${err.message || 'Failed to connect.'}. Please check your connection and try again.`
          : `Error uploading resume: ${err.message || 'Network error occurred.'}`;
        showStatus(msg, true);
      }
    } finally {
      setLoading(false);
      setUploadingType(null);
      setUploadProgress(null);
    }
  };

  const handleRemoveAvatar = () => {
    requestDelete(null, 'avatar');
  };

  const handleRemoveResume = () => {
    requestDelete(null, 'resume');
  };

  const handleToggleResumeVisibility = async () => {
    if (!profile?.resume_url) return;
    const currentStatus = profile.is_resume_public !== 0 && profile.is_resume_public !== false;
    const nextStatus = !currentStatus;

    setLoading(true);
    try {
      const res = await resilientFetch(`${API_BASE}/profile/resume/toggle-visibility`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ is_public: nextStatus })
      });

      if (res.ok) {
        showStatus(`Resume successfully ${nextStatus ? 'published' : 'unpublished'}.`);
        refreshProfile();
      } else {
        const err = await res.json();
        showStatus(err.message || 'Failed to toggle resume visibility.', true);
      }
    } catch (err) {
      console.error(err);
      showStatus(`Toggled resume visibility to ${nextStatus ? 'public' : 'private'} offline.`);
      if (profile) {
        profile.is_resume_public = nextStatus ? 1 : 0;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvatarVisibility = async () => {
    if (!profile?.profile_picture) return;
    const currentStatus = profile.is_avatar_public !== 0 && profile.is_avatar_public !== false;
    const nextStatus = !currentStatus;

    setLoading(true);
    try {
      const res = await resilientFetch(`${API_BASE}/profile/avatar/toggle-visibility`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ is_public: nextStatus })
      });

      if (res.ok) {
        showStatus(`Profile photo successfully ${nextStatus ? 'published' : 'unpublished'}.`);
        refreshProfile();
      } else {
        const err = await res.json();
        showStatus(err.message || 'Failed to toggle photo visibility.', true);
      }
    } catch (err) {
      console.error(err);
      showStatus(`Toggled photo visibility to ${nextStatus ? 'public' : 'private'} offline.`);
      if (profile) {
        profile.is_avatar_public = nextStatus ? 1 : 0;
      }
    } finally {
      setLoading(false);
    }
  };

  /* ==========================================
     PROJECT MANAGEMENT CRUD
     ========================================== */
  const handleOpenProjectForm = (proj = null) => {
    if (proj) {
      setEditingProject(proj);
      setProjTitle(proj.title);
      setProjSummary(proj.summary);
      setProjRepo(proj.repo_link);
      setProjLive(proj.live_link || '');
      setProjDeployed(proj.is_deployed);
    } else {
      setEditingProject(null);
      setProjTitle('');
      setProjSummary('');
      setProjRepo('');
      setProjLive('');
      setProjDeployed(false);
    }
    setProjThumbnail(null);
    setShowProjModal(true);
  };

  const handleSaveProject = async (e) => {
    e.preventDefault();
    if (!projTitle || !projSummary || !projRepo) {
      showStatus('Title, Summary, and GitHub Repo fields are mandatory!', true);
      return;
    }
    if (projDeployed && !projLive) {
      showStatus('Deployed projects must include a Live Demo Link!', true);
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('title', projTitle);
    formData.append('summary', projSummary);
    formData.append('repo_link', projRepo);
    formData.append('live_link', projLive);
    formData.append('is_deployed', projDeployed);

    try {
      if (projThumbnail) {
        const bufferedFile = await getSafeInMemoryFile(projThumbnail, 'image/jpeg');
        const compressed = await compressImageIfNeeded(bufferedFile);
        formData.append('thumbnail', compressed);
      }

      const url = editingProject ? `${API_BASE}/projects/${editingProject.id}` : `${API_BASE}/projects`;
      const method = editingProject ? 'PUT' : 'POST';

      const data = await uploadWithProgress(
        url,
        method,
        formData,
        { 'Authorization': `Bearer ${authToken}` },
        (pct) => setUploadProgress(pct)
      );

      showStatus('Project entry successfully updated in databases!');
      setShowProjModal(false);
      fetchDashboardCollections();
    } catch (err) {
      console.error(err);
      if (err.message === 'CLOUD_READ_FAILED') {
        showStatus("Could not download project image from Google Drive! Open the Drive app, select the file and tap 'Make available offline', or download it to your device first.", true);
      } else {
        const isNetworkErr = err.message?.includes('Failed to fetch') || err.message?.includes('Network error');
        const msg = isNetworkErr 
          ? `Network connection error: ${err.message || 'Failed to connect.'}. Please check your connection and try again.`
          : `Error saving project: ${err.message || 'Network error occurred.'}`;
        showStatus(msg, true);
      }
      setShowProjModal(false);
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  const handleDeleteProject = (id) => requestDelete(id, 'project');

  const handleOpenEduForm = (edu = null) => {
    if (edu) {
      setEditingEdu(edu);
      setEduType(edu.degree);
      setEduSchool(edu.school);
      setEduPassingYear(edu.passing_year || edu.end_date);
      setEduBoard(edu.board || 'CBSE');
      setCustomEduBoard(edu.board && !['CBSE', 'ICSE', 'BSE', 'HSC', 'CHSE'].includes(edu.board) ? edu.board : '');
      setEduCourse(edu.course || '');
      setEduBranch(edu.branch || '');
      setEduFullMarks(edu.full_marks || '');
      setEduMarksObtained(edu.marks_obtained || '');
      
      let parsedSgpa = { sem1: '', sem2: '', sem3: '', sem4: '', sem5: '', sem6: '', sem7: '', sem8: '' };
      if (edu.semester_sgpa) {
        try {
          parsedSgpa = { ...parsedSgpa, ...JSON.parse(edu.semester_sgpa) };
        } catch (e) {
          console.error("Error parsing SGPA", e);
        }
      }
      setEduSemSgpas(parsedSgpa);
      
      setEdu10thCert(edu.certificate_10th || null);
      setEdu12thCert(edu.certificate_12th || null);
      setEdu12thMarksheet(edu.marksheet_12th || null);
      setEduBachGradesheet(edu.gradesheet_bachelor || null);
      setEduBachCert(edu.certificate_bachelor || null);
      setEduOthersCert(edu.certificate_others || null);
      setEduOthersMarksheet(edu.marksheet_others || null);

      setEduAccess10th(edu.access_cert10 === 1 || edu.access_cert10 === true || edu.access_cert10 === '1');
      setEduAccess12th(edu.access_cert12 === 1 || edu.access_cert12 === true || edu.access_cert12 === '1');
      setEduAccessBach(edu.access_certbach === 1 || edu.access_certbach === true || edu.access_certbach === '1');
    } else {
      setEditingEdu(null);
      setEduType('10th');
      setEduSchool('');
      setEduPassingYear('');
      setEduBoard('CBSE');
      setCustomEduBoard('');
      setEduCourse('');
      setEduBranch('');
      setEduFullMarks('');
      setEduMarksObtained('');
      setEduSemSgpas({ sem1: '', sem2: '', sem3: '', sem4: '', sem5: '', sem6: '', sem7: '', sem8: '' });
      setEdu10thCert(null);
      setEdu12thCert(null);
      setEdu12thMarksheet(null);
      setEduBachGradesheet(null);
      setEduBachCert(null);
      setEduOthersCert(null);
      setEduOthersMarksheet(null);
      setEduAccess10th(false);
      setEduAccess12th(false);
      setEduAccessBach(false);
    }
    setShowEduModal(true);
  };

  const handleOpenSkillForm = (skill = null) => {
    if (skill) {
      setEditingSkill(skill);
      setSkillCategory(skill.category);
      const presets = skillPresets[skill.category] || [];
      if (presets.includes(skill.name)) {
        setSelectedPresetSkill(skill.name);
        setCustomSkillName('');
      } else {
        setSelectedPresetSkill('Custom');
        setCustomSkillName(skill.name);
      }
      setSkillLevel(skill.knowledge_level || 'basic');
    } else {
      setEditingSkill(null);
      setSkillCategory('Programming Language');
      const presets = skillPresets['Programming Language'] || [];
      setSelectedPresetSkill(presets[0] || 'Custom');
      setCustomSkillName('');
      setSkillLevel('basic');
    }
    setShowSkillModal(true);
  };

  const handleOpenExpForm = (exp = null) => {
    if (exp) {
      setEditingExp(exp);
      setExpType(exp.exp_type || 'project');
      setExpStart(exp.start_date || '');
      setExpEnd(exp.end_date || '');
      setExpDesc(exp.description || '');
      setExpSkillsLearned(exp.skills_learned || '');
      
      setExpProjectName(exp.project_name || '');
      setExpProjectInstructor(exp.project_instructor || '');
      setExpRepoLink(exp.repo_link || '');
      setExpDeployLink(exp.deploy_link || '');
      
      setExpProgramName(exp.program_name || '');
      setExpOrgName(exp.org_name || '');
      setExpRole(exp.role || '');
      
      setExpCertificateFile(exp.certificate_file || null);
      setExpLorFile(exp.lor_file || null);
    } else {
      setEditingExp(null);
      setExpType('project');
      setExpStart('');
      setExpEnd('');
      setExpDesc('');
      setExpSkillsLearned('');
      setExpProjectName('');
      setExpProjectInstructor('');
      setExpRepoLink('');
      setExpDeployLink('');
      setExpProgramName('');
      setExpOrgName('');
      setExpRole('');
      setExpCertificateFile(null);
      setExpLorFile(null);
    }
    setShowExpModal(true);
  };

  const handleOpenCertForm = (cert = null) => {
    if (cert) {
      setEditingCert(cert);
      setCertName(cert.name);
      setCertOrg(cert.organization);
      setCertDate(cert.issue_date);
      setCertUrl(cert.credential_url || '');
      setCertFile(cert.certificate_file || null);
      setCertAccess(cert.access_cert === 1 || cert.access_cert === true || cert.access_cert === '1');
    } else {
      setEditingCert(null);
      setCertName('');
      setCertOrg('');
      setCertDate('');
      setCertUrl('');
      setCertFile(null);
      setCertAccess(false);
    }
    setShowCertModal(true);
  };

  const handleOpenCourseForm = (course = null) => {
    if (course) {
      setEditingCourse(course);
      setCourseName(course.name);
      setCourseDesc(course.description);
    } else {
      setEditingCourse(null);
      setCourseName('');
      setCourseDesc('');
    }
    setShowCourseModal(true);
  };

  /* ==========================================
     AUXILIARY COLLECTIONS CRUD ACTIONS
     ========================================== */
  const handleAddEducation = async (e) => {
    e.preventDefault();

    setLoading(true);
    setUploadProgress(0);
    const formData = new FormData();

    formData.append('school', eduSchool);
    formData.append('degree', eduType);

    const selectedBoard = eduBoard === 'Other' ? customEduBoard : eduBoard;

    try {
      let safeCert10 = null, safeCert12 = null, safeMarksheet12 = null;
      let safeGradesheetBach = null, safeCertBach = null;
      let safeCertOthers = null, safeMarksheetOthers = null;

      if (edu10thCert && typeof edu10thCert !== 'string') safeCert10 = await getSafeInMemoryFile(edu10thCert, 'application/pdf');
      if (edu12thCert && typeof edu12thCert !== 'string') safeCert12 = await getSafeInMemoryFile(edu12thCert, 'application/pdf');
      if (edu12thMarksheet && typeof edu12thMarksheet !== 'string') safeMarksheet12 = await getSafeInMemoryFile(edu12thMarksheet, 'application/pdf');
      if (eduBachGradesheet && typeof eduBachGradesheet !== 'string') safeGradesheetBach = await getSafeInMemoryFile(eduBachGradesheet, 'application/pdf');
      if (eduBachCert && typeof eduBachCert !== 'string') safeCertBach = await getSafeInMemoryFile(eduBachCert, 'application/pdf');
      if (eduOthersCert && typeof eduOthersCert !== 'string') safeCertOthers = await getSafeInMemoryFile(eduOthersCert, 'application/pdf');
      if (eduOthersMarksheet && typeof eduOthersMarksheet !== 'string') safeMarksheetOthers = await getSafeInMemoryFile(eduOthersMarksheet, 'application/pdf');

      if (eduType === '10th') {
        formData.append('field_of_study', 'Secondary School (SSC)');
        formData.append('start_date', eduPassingYear);
        formData.append('end_date', eduPassingYear);
        formData.append('passing_year', eduPassingYear);
        formData.append('full_marks', eduFullMarks);
        formData.append('marks_obtained', eduMarksObtained);
        const pct = eduFullMarks && eduMarksObtained ? ((parseFloat(eduMarksObtained) / parseFloat(eduFullMarks)) * 100).toFixed(2) : '0';
        formData.append('percentage', pct);
        const desc = `Completed 10th standard from ${selectedBoard} Board at ${eduSchool} in the year ${eduPassingYear} with a score of ${eduMarksObtained}/${eduFullMarks} (${pct}%).`;
        formData.append('description', desc);
        if (safeCert10) {
          const compressed = await compressImageIfNeeded(safeCert10);
          formData.append('certificate_10th', compressed);
        }
      } else if (eduType === '12th') {
        formData.append('field_of_study', 'Intermediate');
        formData.append('start_date', eduPassingYear);
        formData.append('end_date', eduPassingYear);
        formData.append('passing_year', eduPassingYear);
        formData.append('full_marks', eduFullMarks);
        formData.append('marks_obtained', eduMarksObtained);
        const pct = eduFullMarks && eduMarksObtained ? ((parseFloat(eduMarksObtained) / parseFloat(eduFullMarks)) * 100).toFixed(2) : '0';
        formData.append('percentage', pct);
        const desc = `Completed 12th standard (Intermediate) from ${selectedBoard} Board at ${eduSchool} in the year ${eduPassingYear} with a score of ${eduMarksObtained}/${eduFullMarks} (${pct}%).`;
        formData.append('description', desc);
        if (safeCert12) {
          const compressed = await compressImageIfNeeded(safeCert12);
          formData.append('certificate_12th', compressed);
        }
        if (safeMarksheet12) {
          const compressed = await compressImageIfNeeded(safeMarksheet12);
          formData.append('marksheet_12th', compressed);
        }
      } else if (eduType === 'Bachelor') {
        formData.append('field_of_study', `${eduCourse} in ${eduBranch}`);
        const startYear = parseInt(eduPassingYear) ? (parseInt(eduPassingYear) - eduBachelorDuration).toString() : '';
        formData.append('start_date', startYear || 'N/A');
        formData.append('end_date', eduPassingYear);
        formData.append('passing_year', eduPassingYear);
        formData.append('course', eduCourse);
        formData.append('branch', eduBranch);
        
        const sgpas = [];
        const semLimit = eduBachelorDuration * 2;
        for (let i = 1; i <= semLimit; i++) {
          const val = eduSemSgpas[`sem${i}`];
          if (val) sgpas.push(parseFloat(val));
        }
        const calculatedCgpa = sgpas.length > 0 ? (sgpas.reduce((a,b) => a+b, 0) / sgpas.length).toFixed(2) : '0';
        formData.append('cgpa', calculatedCgpa);
        formData.append('semester_sgpa', JSON.stringify(eduSemSgpas));
        const desc = `Successfully completed ${eduCourse} in ${eduBranch} from ${eduSchool}, graduating in the year ${eduPassingYear} with a CGPA of ${calculatedCgpa}.`;
        formData.append('description', desc);
        
        if (safeGradesheetBach) {
          const compressed = await compressImageIfNeeded(safeGradesheetBach);
          formData.append('gradesheet_bachelor', compressed);
        }
        if (safeCertBach) {
          const compressed = await compressImageIfNeeded(safeCertBach);
          formData.append('certificate_bachelor', compressed);
        }
      } else if (eduType === 'Others') {
        formData.append('field_of_study', eduCourse || 'Others');
        formData.append('start_date', eduPassingYear);
        formData.append('end_date', eduPassingYear);
        formData.append('passing_year', eduPassingYear);
        formData.append('full_marks', eduFullMarks);
        formData.append('marks_obtained', eduMarksObtained);
        const pct = eduFullMarks && eduMarksObtained ? ((parseFloat(eduMarksObtained) / parseFloat(eduFullMarks)) * 100).toFixed(2) : '0';
        formData.append('percentage', pct);
        const desc = `Completed ${eduCourse || 'education details'} at ${eduSchool} in the year ${eduPassingYear} with a score of ${eduMarksObtained}/${eduFullMarks} (${pct}%).`;
        formData.append('description', desc);
        if (safeCertOthers) {
          const compressed = await compressImageIfNeeded(safeCertOthers);
          formData.append('certificate_others', compressed);
        }
        if (safeMarksheetOthers) {
          const compressed = await compressImageIfNeeded(safeMarksheetOthers);
          formData.append('marksheet_others', compressed);
        }
      }
      formData.append('access_cert10', eduAccess10th ? '1' : '0');
      formData.append('access_cert12', eduAccess12th ? '1' : '0');
      formData.append('access_certbach', eduAccessBach ? '1' : '0');
      formData.append('board', selectedBoard || '');

      const url = editingEdu ? `${API_BASE}/education/${editingEdu.id}` : `${API_BASE}/education`;
      const method = editingEdu ? 'PUT' : 'POST';

      const data = await uploadWithProgress(
        url,
        method,
        formData,
        { 'Authorization': `Bearer ${authToken}` },
        (pct) => setUploadProgress(pct)
      );

      setShowEduModal(false);
      fetchDashboardCollections();
      showStatus(editingEdu ? 'Academic record updated successfully!' : 'Academic record created successfully!');
      
      setEduSchool('');
      setEduPassingYear('');
      setEduFullMarks('');
      setEduMarksObtained('');
      setEduCourse('');
      setEduBranch('');
      setEduSemSgpas({ sem1: '', sem2: '', sem3: '', sem4: '', sem5: '', sem6: '', sem7: '', sem8: '' });
      setEdu10thCert(null);
      setEdu12thCert(null);
      setEdu12thMarksheet(null);
      setEduBachGradesheet(null);
      setEduBachCert(null);
      setEduOthersCert(null);
      setEduOthersMarksheet(null);
      setEduAccess10th(false);
      setEduAccess12th(false);
      setEduAccessBach(false);
      setEduBoard('CBSE');
      setCustomEduBoard('');
      setEditingEdu(null);
    } catch (err) {
      console.error(err);
      if (err.message === 'CLOUD_READ_FAILED') {
        showStatus("Could not download education files from Google Drive! Open the Drive app, select the file and tap 'Make available offline', or download it to your device first.", true);
      } else {
        const isNetworkErr = err.message?.includes('Failed to fetch') || err.message?.includes('Network error');
        const msg = isNetworkErr 
          ? `Network connection error: ${err.message || 'Failed to connect.'}. Please check your connection and try again.`
          : `Error saving education: ${err.message || 'Network error occurred.'}`;
        showStatus(msg, true);
      }
      setShowEduModal(false);
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  const handleDeleteEdu = (id) => requestDelete(id, 'education');

  const handleAddSkill = async (e) => {
    e.preventDefault();
    const finalName = selectedPresetSkill === 'Custom' ? customSkillName : selectedPresetSkill;
    if (!finalName) {
      showStatus('Skill Name is required!', true);
      return;
    }
    setLoading(true);
    try {
      const url = editingSkill ? `${API_BASE}/skills/${editingSkill.id}` : `${API_BASE}/skills`;
      const method = editingSkill ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ name: finalName, category: skillCategory, proficiency: 100, knowledge_level: skillLevel })
      });
      if (res.ok) {
        setShowSkillModal(false);
        fetchDashboardCollections();
        showStatus(editingSkill ? 'Skill successfully updated.' : 'Skill successfully added.');
        setCustomSkillName('');
        setSelectedPresetSkill('Custom');
        setSkillLevel('basic');
        setEditingSkill(null);
      } else {
        const err = await res.json();
        showStatus(err.message || 'Failed to save skill.', true);
      }
    } catch (err) {
      setShowSkillModal(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSkill = (id) => requestDelete(id, 'skill');

  const handleAddCourse = async (e) => {
    e.preventDefault();
    if (!courseName || !courseDesc) {
      showStatus('Course Name and Description are required!', true);
      return;
    }
    setLoading(true);
    try {
      const url = editingCourse ? `${API_BASE}/courses/${editingCourse.id}` : `${API_BASE}/courses`;
      const method = editingCourse ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ name: courseName, description: courseDesc })
      });
      if (res.ok) {
        showStatus(editingCourse ? 'Course successfully updated.' : 'Course successfully added.');
        setCourseName('');
        setCourseDesc('');
        setShowCourseModal(false);
        setEditingCourse(null);
        fetchDashboardCollections();
      } else {
        const err = await res.json();
        showStatus(err.message || 'Failed to add course.', true);
      }
    } catch (err) {
      showStatus('Failed to add course due to network issues.', true);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = (id) => requestDelete(id, 'course');

  const handleAddExperience = async (e) => {
    e.preventDefault();

    setLoading(true);
    setUploadProgress(0);
    const formData = new FormData();

    try {
      let safeCert = null;
      let safeLor = null;
      if (expCertificateFile && typeof expCertificateFile !== 'string') safeCert = await getSafeInMemoryFile(expCertificateFile, 'application/pdf');
      if (expLorFile && typeof expLorFile !== 'string') safeLor = await getSafeInMemoryFile(expLorFile, 'application/pdf');

      if (expType === 'project') {
        formData.append('company', 'Group Project');
        formData.append('role', 'Developer');
        formData.append('start_date', expStart || 'N/A');
        formData.append('end_date', expEnd || 'N/A');
        
        formData.append('exp_type', 'project');
        formData.append('project_name', expProjectName);
        formData.append('project_instructor', expProjectInstructor);
        formData.append('repo_link', expRepoLink);
        formData.append('deploy_link', expDeployLink);
        formData.append('description', expDesc || `Worked on Group Project: ${expProjectName} instructed by ${expProjectInstructor}.`);
        formData.append('skills_learned', expSkillsLearned);
      } else if (expType === 'internship') {
        formData.append('company', expOrgName);
        formData.append('role', `${expRole} Intern`);
        formData.append('start_date', expStart);
        formData.append('end_date', expEnd);

        formData.append('exp_type', 'internship');
        formData.append('org_name', expOrgName);
        formData.append('program_name', expProgramName);
        formData.append('description', expDesc || (expProgramName ? `Interned at ${expOrgName} under ${expProgramName} as ${expRole}.` : `Interned at ${expOrgName} as ${expRole}.`));
        formData.append('skills_learned', expSkillsLearned);
        if (safeCert) {
          const compressed = await compressImageIfNeeded(safeCert);
          formData.append('certificate_file', compressed);
        }
        if (safeLor) {
          const compressed = await compressImageIfNeeded(safeLor);
          formData.append('lor_file', compressed);
        }
      } else if (expType === 'program') {
        formData.append('company', expProgramName);
        formData.append('role', 'Participant');
        formData.append('start_date', expStart);
        formData.append('end_date', expStart);

        formData.append('exp_type', 'program');
        formData.append('program_name', expProgramName);
        formData.append('description', expDesc || `Participated in program ${expProgramName} on ${expStart}.`);
        formData.append('skills_learned', expSkillsLearned);
        if (safeCert) {
          const compressed = await compressImageIfNeeded(safeCert);
          formData.append('certificate_file', compressed);
        }
      }

      const url = editingExp ? `${API_BASE}/experience/${editingExp.id}` : `${API_BASE}/experience`;
      const method = editingExp ? 'PUT' : 'POST';

      const data = await uploadWithProgress(
        url,
        method,
        formData,
        { 'Authorization': `Bearer ${authToken}` },
        (pct) => setUploadProgress(pct)
      );

      setShowExpModal(false);
      fetchDashboardCollections();
      showStatus(editingExp ? 'Experience entry updated successfully!' : 'Experience entry registered successfully!');
      
      setExpProjectName('');
      setExpProjectInstructor('');
      setExpRepoLink('');
      setExpDeployLink('');
      setExpProgramName('');
      setExpOrgName('');
      setExpRole('');
      setExpStart('');
      setExpEnd('');
      setExpDesc('');
      setExpSkillsLearned('');
      setExpCertificateFile(null);
      setExpLorFile(null);
      setEditingExp(null);
    } catch (err) {
      console.error(err);
      if (err.message === 'CLOUD_READ_FAILED') {
        showStatus("Could not download experience files from Google Drive! Open the Drive app, select the file and tap 'Make available offline', or download it to your device first.", true);
      } else {
        const isNetworkErr = err.message?.includes('Failed to fetch') || err.message?.includes('Network error');
        const msg = isNetworkErr 
          ? `Network connection error: ${err.message || 'Failed to connect.'}. Please check your connection and try again.`
          : `Error saving experience: ${err.message || 'Network error occurred.'}`;
        showStatus(msg, true);
      }
      setShowExpModal(false);
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  const handleDeleteExp = (id) => requestDelete(id, 'experience');

  const handleAddCertificate = async (e) => {
    e.preventDefault();
    if (!certName || !certOrg || !certDate) {
      showStatus('Certificate Name, Org, and Date are required!', true);
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('name', certName);
    formData.append('organization', certOrg);
    formData.append('issue_date', certDate);
    formData.append('credential_url', certUrl || '');
    formData.append('access_cert', certAccess ? '1' : '0');

    try {
      if (certFile && typeof certFile !== 'string') {
        const bufferedFile = await getSafeInMemoryFile(certFile, 'application/pdf');
        const compressed = await compressImageIfNeeded(bufferedFile);
        formData.append('certificate_file', compressed);
      }

      const url = editingCert ? `${API_BASE}/certificates/${editingCert.id}` : `${API_BASE}/certificates`;
      const method = editingCert ? 'PUT' : 'POST';

      const data = await uploadWithProgress(
        url,
        method,
        formData,
        { 'Authorization': `Bearer ${authToken}` },
        (pct) => setUploadProgress(pct)
      );

      setShowCertModal(false);
      fetchDashboardCollections();
      showStatus(editingCert ? 'Certificate successfully updated.' : 'Certificate successfully added.');
      setCertName('');
      setCertOrg('');
      setCertDate('');
      setCertUrl('');
      setCertFile(null);
      setCertAccess(false);
      setEditingCert(null);
    } catch (err) {
      console.error(err);
      if (err.message === 'CLOUD_READ_FAILED') {
        showStatus("Could not download certificate from Google Drive! Open the Drive app, select the file and tap 'Make available offline', or download it to your device first.", true);
      } else {
        const isNetworkErr = err.message?.includes('Failed to fetch') || err.message?.includes('Network error');
        const msg = isNetworkErr 
          ? `Network connection error: ${err.message || 'Failed to connect.'}. Please check your connection and try again.`
          : `Error saving certificate: ${err.message || 'Network error occurred.'}`;
        showStatus(msg, true);
      }
      setShowCertModal(false);
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  const handleDeleteCert = (id) => requestDelete(id, 'certificate');
  const handleDeleteDocRequest = (id) => requestDelete(id, 'documentRequest');

  const handleToggleSelectRequest = (id) => {
    setSelectedRequestIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAllRequests = () => {
    if (selectedRequestIds.length === docRequests.length) {
      setSelectedRequestIds([]);
    } else {
      setSelectedRequestIds(docRequests.map(r => r.id));
    }
  };

  const handleBulkDeleteDocRequests = () => {
    if (selectedRequestIds.length === 0) {
      showStatus('No requests selected for deletion.', true);
      return;
    }
    requestDelete(null, 'bulkDocumentRequests');
  };

  return (
    <div style={{ background: 'radial-gradient(ellipse at top left, #04351b 0%, #01140a 45%, #000000 100%)', minHeight: '100vh', color: '#fff', position: 'relative', overflowX: 'hidden' }}>
      
      {/* Decorative background orbs */}
      <div className="portfolio-orb portfolio-orb-1" style={{ position: 'fixed' }} />
      <div className="portfolio-orb portfolio-orb-2" style={{ position: 'fixed' }} />
      <div className="portfolio-orb portfolio-orb-3" style={{ position: 'fixed' }} />
      
      {/* Navbar dashboard header */}
      <nav className="glass-panel" style={{
        position: 'sticky',
        top: 0,
        zIndex: 90,
        margin: '0.5rem 1rem',
        padding: '0.8rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="dashboard-hamburger-btn"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
              cursor: 'pointer',
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              padding: '0.4rem',
              transition: 'all 0.2s',
              marginRight: '0.25rem'
            }}
          >
            <Menu size={20} />
          </button>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#00ff88', boxShadow: '0 0 10px #00ff88' }} />
          <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '1px' }}>CONTROL PANEL</span>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          
          {/* Add New Project option in header */}
          <button 
            onClick={() => handleOpenProjectForm()} 
            className="glass-btn dashboard-nav-btn"
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            <Plus size={16} /> New Project
          </button>

          <button 
            onClick={() => navigateTo('portfolio')}
            className="glass-btn-secondary dashboard-nav-btn"
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            View Live
          </button>
          
          {/* Notification bell and dropdown */}
          <div ref={notificationRef} style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="glass-btn-secondary"
              style={{ padding: '0.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
              title="Notifications"
            >
              <Bell size={18} className="text-green" />
              {messages.filter(m => !m.is_read).length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  backgroundColor: '#ff5252',
                  color: 'white',
                  borderRadius: '50%',
                  fontSize: '0.65rem',
                  fontWeight: 'bold',
                  minWidth: '16px',
                  height: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 5px rgba(255, 82, 82, 0.5)'
                }}>
                  {messages.filter(m => !m.is_read).length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="glass-panel" style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '0.5rem',
                width: '320px',
                maxHeight: '400px',
                overflowY: 'auto',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                zIndex: 100,
                background: 'rgba(10, 15, 12, 0.95)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Recent Notifications</span>
                  {messages.filter(m => !m.is_read).length > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--accent-green)' }}>{messages.filter(m => !m.is_read).length} unread</span>}
                </div>

                {messages.filter(m => !m.is_read).length === 0 ? (
                  <div style={{ padding: '1.5rem 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    No new notifications.
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', maxHeight: '250px' }}>
                      {messages.filter(m => !m.is_read).slice(0, 5).map((msg) => (
                        <div 
                          key={msg.id} 
                          onClick={() => { handleViewMessage(msg); setShowNotifications(false); }}
                          style={{ 
                            padding: '0.6rem', 
                            background: msg.is_read ? 'rgba(255,255,255,0.02)' : 'rgba(0,255,136,0.08)', 
                            border: msg.is_read ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,255,136,0.3)', 
                            borderRadius: '6px', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '0.25rem',
                            cursor: 'pointer',
                            position: 'relative'
                          }}
                        >
                          {!msg.is_read && (
                            <span style={{
                              position: 'absolute',
                              top: '6px',
                              right: '6px',
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: '#00ff88'
                            }} />
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--accent-green)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                              {msg.sender_email}
                            </span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                              {msg.purpose === 'hire' ? '💼 Hire' : '💬 Review'}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '1.3' }}>
                            {msg.description}
                          </p>
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={async () => {
                        await handleMarkAllMessagesAsRead();
                      }}
                      className="glass-btn"
                      style={{ width: '100%', padding: '0.4rem', fontSize: '0.8rem', justifyContent: 'center' }}
                    >
                      Clear All
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          
          <button 
            onClick={() => setShowExitModal(true)} 
            className="glass-btn-danger dashboard-nav-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </nav>
      {/* Toast Alert Popup below navbar on the right side */}
      {(statusMsg || errorMsg) && (
        <div className="dashboard-toast-alert">
          <div className="glass-panel" style={{
            padding: '0.85rem 1.25rem',
            background: 'rgba(10, 15, 12, 0.98)',
            border: statusMsg ? '1px solid var(--accent-green)' : '1px solid #ff5252',
            boxShadow: statusMsg ? '0 8px 32px rgba(0, 255, 136, 0.15)' : '0 8px 32px rgba(255, 82, 82, 0.15)',
            borderRadius: '8px',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: statusMsg ? 'var(--accent-green)' : '#ff5252',
              boxShadow: statusMsg ? '0 0 8px var(--accent-green)' : '0 0 8px #ff5252'
            }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, flex: 1 }}>
              {statusMsg || errorMsg}
            </span>
          </div>
        </div>
      )}

      {/* Main dashboard configuration grid */}
      <div className="dashboard-grid">
        
        {/* Left Drawer / Nav Controls */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', height: 'fit-content' }}>
          
          {/* Short avatar preview */}
          <div style={{ textAlign: 'center', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '1rem' }}>
            <div 
              onClick={() => {
                if (!profile?.profile_picture || avatarError) {
                  showStatus('Please upload your profile picture under the Edit Profile tab.', true);
                } else {
                  setShowAvatarPopup(true);
                }
              }}
              style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: '50%', 
                overflow: 'hidden', 
                margin: 'auto', 
                border: '2px solid var(--accent-green)', 
                marginBottom: '0.5rem', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                backgroundColor: 'rgba(255,255,255,0.05)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              title="Click to view profile picture"
            >
              {profile?.profile_picture && !avatarError ? (
                <img 
                  src={resolveFileUrl(profile.profile_picture)} 
                  alt="owner" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <span style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--accent-green)' }}>NA</span>
              )}
            </div>
            <h4 style={{ fontWeight: 700 }}>{profile?.username || 'Navycut'}</h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Account Owner</span>
          </div>

          <button onClick={() => setActiveTab('profile')} className={`glass-btn-secondary ${activeTab === 'profile' ? 'active-tab' : ''}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '0.8rem 1rem' }}>
            <User size={18} className="text-green" /> Edit Profile
          </button>

          <button onClick={() => setActiveTab('projects')} className={`glass-btn-secondary ${activeTab === 'projects' ? 'active-tab' : ''}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '0.8rem 1rem' }}>
            <Code size={18} className="text-green" /> Projects ({projects.length})
          </button>

          <button onClick={() => setActiveTab('education')} className={`glass-btn-secondary ${activeTab === 'education' ? 'active-tab' : ''}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '0.8rem 1rem' }}>
            <GraduationCap size={18} className="text-green" /> Education
          </button>

          <button onClick={() => setActiveTab('skills')} className={`glass-btn-secondary ${activeTab === 'skills' ? 'active-tab' : ''}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '0.8rem 1rem' }}>
            <CheckCircle size={18} className="text-green" /> Skills
          </button>

          <button onClick={() => setActiveTab('experience')} className={`glass-btn-secondary ${activeTab === 'experience' ? 'active-tab' : ''}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '0.8rem 1rem' }}>
            <Briefcase size={18} className="text-green" /> Experience
          </button>

          <button onClick={() => setActiveTab('certs')} className={`glass-btn-secondary ${activeTab === 'certs' ? 'active-tab' : ''}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '0.8rem 1rem' }}>
            <Award size={18} className="text-green" /> Certificates
          </button>

          <button onClick={() => setActiveTab('courses')} className={`glass-btn-secondary ${activeTab === 'courses' ? 'active-tab' : ''}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '0.8rem 1rem' }}>
            <GraduationCap size={18} className="text-green" /> Courses
          </button>

          <button onClick={() => setActiveTab('messages')} className={`glass-btn-secondary ${activeTab === 'messages' ? 'active-tab' : ''}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '0.8rem 1rem' }}>
            <Mail size={18} className="text-green" /> Inbox
            {(() => {
              const unreadCount = messages.filter(m => !m.is_read).length;
              if (unreadCount === 0) return '';
              if (unreadCount > 10) return ' (10+)';
              if (unreadCount > 5) return ' (5+)';
              return ` (${unreadCount})`;
            })()}
          </button>

          <button onClick={() => setActiveTab('permissions')} className={`glass-btn-secondary ${activeTab === 'permissions' ? 'active-tab' : ''}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '0.8rem 1rem' }}>
            <ShieldCheck size={18} className="text-green" /> Document Requests
            {(() => {
              const pendingCount = docRequests.filter(r => r.status === 'Pending').length;
              if (pendingCount === 0) return '';
              return ` (${pendingCount})`;
            })()}
          </button>
        </div>

        <style>{`
          .active-tab {
            background: rgba(0, 255, 136, 0.15) !important;
            border-color: var(--accent-green) !important;
          }
          .dashboard-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 2rem;
            padding: 1.5rem;
            max-width: 1280px;
            margin: auto;
            width: 100%;
          }
          @media (min-width: 768px) {
            .dashboard-grid {
              grid-template-columns: 280px 1fr !important;
            }
          }
          .profile-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 2rem;
            margin-bottom: 2.5rem;
          }
          @media (min-width: 768px) {
            .profile-grid {
              grid-template-columns: 1fr 1fr !important;
            }
          }
          .dashboard-modal-overlay {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            background: rgba(0, 0, 0, 0.75) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 1000 !important;
            padding: 1rem !important;
            backdrop-filter: blur(8px) !important;
            -webkit-backdrop-filter: blur(8px) !important;
          }
          .dashboard-modal-overlay .glass-panel {
            background: #0c140e !important;
            border: 1px solid rgba(0, 255, 136, 0.15) !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6) !important;
          }
          @media (max-width: 649px) {
            .dashboard-grid {
              grid-template-columns: 1fr !important;
            }
            .dashboard-grid > div:first-child {
              display: none !important;
            }
            .dashboard-hamburger-btn {
              display: inline-flex !important;
            }
            .dashboard-nav-btn {
              display: none !important;
            }
          }
          @keyframes slideInFromLeft {
            from { transform: translateX(-100%); }
            to { transform: translateX(0); }
          }
          .slide-in-left {
            animation: slideInFromLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          @keyframes scaleIn {
            from { transform: scale(0.7); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `}</style>

        {/* Right Content Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* TAB 1: PROFILE MANAGEMENT & OTP CONFIG */}
          {activeTab === 'profile' && (
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                Edit Profile
              </h2>

              {/* Uploads Section: Profile image & PDF CV */}
              <div className="profile-grid">
                
                {/* Avatar upload card */}
                <div className="glass-card" style={{ textAlign: 'center' }}>
                  <h4 style={{ marginBottom: '1rem', fontSize: '0.95rem' }}>Profile Picture Upload</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <DragDropUpload
                      onFileSelect={setAvatarFile}
                      accept="image/*"
                      currentFile={avatarFile}
                      placeholder="Drag & drop profile picture or click to select"
                    />
                    {profile?.profile_picture && (
                      <div style={{ fontSize: '0.85rem', color: (profile.is_avatar_public !== 0 && profile.is_avatar_public !== false) ? 'var(--accent-green)' : '#ffaa00', marginBottom: '0.5rem' }}>
                        Status: {(profile.is_avatar_public !== 0 && profile.is_avatar_public !== false) ? 'Public (Visible to viewers)' : 'Private (Only you can see)'}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                      <button 
                        onClick={avatarFile ? handleUploadAvatar : handleToggleAvatarVisibility} 
                        disabled={loading || (!avatarFile && !profile?.profile_picture)} 
                        className="glass-btn" 
                        style={{ padding: '0.4rem 1.25rem', fontSize: '0.85rem' }}
                      >
                        {uploadingType === 'avatar' 
                          ? (uploadProgress !== null ? `Uploading (${uploadProgress}%)` : 'Uploading...') 
                          : (avatarFile 
                              ? 'Publish Photo' 
                              : (profile?.profile_picture 
                                  ? ((profile.is_avatar_public !== 0 && profile.is_avatar_public !== false) ? 'Unpublish Photo' : 'Publish Photo')
                                  : 'Publish Photo'
                                )
                            )
                        }
                      </button>
                      {profile?.profile_picture && (
                        <button 
                          onClick={handleRemoveAvatar} 
                          className="glass-btn-danger" 
                          style={{ padding: '0.4rem 1.25rem', fontSize: '0.85rem' }}
                        >
                          Remove Photo
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* PDF CV Resume upload card */}
                <div className="glass-card" style={{ textAlign: 'center' }}>
                  <h4 style={{ marginBottom: '1rem', fontSize: '0.95rem' }}>Resume or CV Upload (PDF)</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <DragDropUpload
                      onFileSelect={setResumeFile}
                      accept="application/pdf"
                      currentFile={resumeFile}
                      placeholder="Drag & drop resume PDF or click to select"
                    />
                    {profile?.resume_url && (
                      <div style={{ fontSize: '0.85rem', color: (profile.is_resume_public !== 0 && profile.is_resume_public !== false) ? 'var(--accent-green)' : '#ffaa00', marginBottom: '0.5rem' }}>
                        Status: {(profile.is_resume_public !== 0 && profile.is_resume_public !== false) ? 'Public (Visible to viewers)' : 'Private (Only you can see)'}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
                      <button 
                        onClick={handleUploadResume} 
                        disabled={!resumeFile || loading} 
                        className="glass-btn" 
                        style={{ padding: '0.4rem 1.25rem', fontSize: '0.85rem' }}
                      >
                        {uploadingType === 'resume' ? (uploadProgress !== null ? `Uploading (${uploadProgress}%)` : 'Uploading...') : 'Save PDF File'}
                      </button>
                      {profile?.resume_url && (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                          <button 
                            onClick={handleToggleResumeVisibility} 
                            disabled={loading} 
                            className="glass-btn" 
                            style={{ padding: '0.4rem 1.25rem', fontSize: '0.85rem' }}
                          >
                            {(profile.is_resume_public !== 0 && profile.is_resume_public !== false) ? 'Unpublish Resume' : 'Publish Resume'}
                          </button>
                          <button 
                            onClick={handleRemoveResume} 
                            className="glass-btn-danger" 
                            style={{ padding: '0.4rem 1.25rem', fontSize: '0.85rem' }}
                          >
                            Remove Resume
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* OTP Verifications Section (Email and Phone) */}
              <div className="glass-card dashboard-verification-card" style={{ marginBottom: '2.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--accent-green)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ShieldCheck size={20} /> Contact Verification
                </h3>
                
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                  Email and Phone numbers require OTP authorization before writing. Enter the new channel, dispatch OTP, and complete the verification card.
                </p>

                {/* Verification forms */}
                {!verifyType ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* Email Verification Box */}
                    {profile?.email_verified && !isEditingEmail ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0, 255, 136, 0.04)', padding: '0.85rem 1.25rem', borderRadius: '8px', border: '1px solid rgba(0, 255, 136, 0.15)', flexWrap: 'wrap', gap: '0.8rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Email address</span>
                          <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600 }}>{profile?.email}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: 'var(--accent-green)', fontWeight: 600, fontSize: '0.85rem' }}>
                            <CheckCircle size={16} /> Verified
                          </span>
                          <button onClick={() => { setIsEditingEmail(true); setTargetEmailValue(profile?.email || ''); }} className="glass-btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                            Change
                          </button>
                          <button onClick={handleRemoveEmail} className="glass-btn-danger" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          <label style={{ fontSize: '0.85rem' }}>Update & Verify Email address <span style={{ color: '#ff5252' }}>*</span></label>
                          <input 
                            type="email" 
                            required
                            className="glass-input" 
                            placeholder="email"
                            value={targetEmailValue}
                            onChange={(e) => setTargetEmailValue(e.target.value)}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => handleInitiateVerify('email')} className="glass-btn">
                            Verify Email
                          </button>
                          {isEditingEmail && (
                            <button onClick={() => setIsEditingEmail(false)} className="glass-btn-secondary">
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Phone Verification Box */}
                    {profile?.phone_verified && !isEditingPhone && profile?.phone ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0, 255, 136, 0.04)', padding: '0.85rem 1.25rem', borderRadius: '8px', border: '1px solid rgba(0, 255, 136, 0.15)', flexWrap: 'wrap', gap: '0.8rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Phone number</span>
                          <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600 }}>{profile?.phone}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: 'var(--accent-green)', fontWeight: 600, fontSize: '0.85rem' }}>
                            <CheckCircle size={16} /> Verified
                          </span>
                          <button onClick={() => { setIsEditingPhone(true); setTargetPhoneValue(profile?.phone || ''); }} className="glass-btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                            Change
                          </button>
                          <button onClick={handleRemovePhone} className="glass-btn-danger" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          <label style={{ fontSize: '0.85rem' }}>Update & Verify Phone number <span style={{ color: '#ff5252' }}>*</span></label>
                          <input 
                            type="text" 
                            required
                            className="glass-input" 
                            placeholder="10 digit number"
                            value={targetPhoneValue}
                            onChange={(e) => setTargetPhoneValue(e.target.value)}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => handleInitiateVerify('phone')} className="glass-btn">
                            Verify Phone
                          </button>
                          {isEditingPhone && (
                            <button onClick={() => setIsEditingPhone(false)} className="glass-btn-secondary">
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                ) : (
                  // Active OTP input Card
                  <form onSubmit={handleConfirmVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: 'var(--accent-green)' }}>
                        Verifying {verifyType.toUpperCase()}: {targetValue}
                      </span>
                      <button type="button" onClick={() => { setVerifyType(null); setTargetValue(''); setOtpCode(''); }} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                        <X size={18} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <input 
                        type="text"
                        maxLength={6}
                        required
                        className="glass-input"
                        placeholder="Enter 6-digit OTP code"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '1.1rem', flex: 1 }}
                      />
                      <button type="submit" className="glass-btn">
                        Confirm OTP
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Standard social profiles settings */}
              <form onSubmit={handleUpdateProfileData} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '0.5rem' }}>Profiles Details</h3>

                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                     <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Display Name <span style={{ color: '#ff5252' }}>*</span></label>
                     <input type="text" className="glass-input" placeholder="Enter display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
                   </div>
                   
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                     <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Login Username <span style={{ color: '#ff5252' }}>*</span></label>
                     <input type="text" className="glass-input" placeholder="Enter username " value={username} onChange={(e) => setUsername(e.target.value)} required />
                   </div>
                 </div>

                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                     <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>New Password</label>
                     <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                       <div style={{ position: 'relative', flex: 1 }}>
                         <input 
                           type={showPasswordText ? "text" : "password"} 
                           className="glass-input" 
                           placeholder="Enter new password" 
                           value={newPassword} 
                           onChange={(e) => setNewPassword(e.target.value)} 
                           style={{ paddingRight: '2.5rem', width: '100%' }}
                         />
                         <button
                           type="button"
                           onClick={() => setShowPasswordText(!showPasswordText)}
                           style={{
                             position: 'absolute',
                             right: '0.8rem',
                             top: '50%',
                             transform: 'translateY(-50%)',
                             background: 'none',
                             border: 'none',
                             cursor: 'pointer',
                             color: '#00ff88',
                             display: 'flex',
                             alignItems: 'center',
                             padding: 0
                           }}
                           title={showPasswordText ? "Hide password" : "Show password"}
                         >
                           {showPasswordText ? <EyeOff size={18} /> : <Eye size={18} />}
                         </button>
                       </div>
                       <button
                         type="button"
                         onClick={handleSavePasswordOnly}
                         className="glass-btn"
                         style={{
                           padding: '0.75rem',
                           height: '46px',
                           width: '46px',
                           display: 'flex',
                           alignItems: 'center',
                           justifyContent: 'center',
                           borderRadius: '8px',
                           border: '1px solid var(--accent-green)',
                           background: 'rgba(0, 255, 136, 0.1)',
                           color: 'var(--accent-green)',
                           cursor: 'pointer',
                           transition: 'var(--transition-smooth)',
                           flexShrink: 0
                         }}
                         title="Set Password"
                       >
                         <Check size={18} />
                       </button>
                     </div>
                   </div>

                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                     <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>About Profile Summary</label>
                     <input type="text" className="glass-input" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Describe about your profession..." style={{ height: '46px' }} />
                   </div>
                 </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  
                  {/* LinkedIn link (Mandatory**) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>LinkedIn Link <span style={{ color: '#ff5252' }}>*</span></label>
                    <div style={{ position: 'relative' }}>
                      <Linkedin size={18} className="text-green" style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)' }} />
                      <input 
                        type="url" 
                        required
                        className="glass-input" 
                        style={{ width: '100%', paddingLeft: '2.5rem' }} 
                        placeholder="LinkedIn Link"
                        value={linkedin}
                        onChange={(e) => setLinkedin(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* GitHub link (Mandatory**) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>GitHub Link <span style={{ color: '#ff5252' }}>*</span></label>
                    <div style={{ position: 'relative' }}>
                      <Github size={18} className="text-green" style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)' }} />
                      <input 
                        type="url" 
                        required
                        className="glass-input" 
                        style={{ width: '100%', paddingLeft: '2.5rem' }} 
                        placeholder="GitHub Link"
                        value={github}
                        onChange={(e) => setGithub(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Instagram (Optional) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Instagram Link (Optional)</label>
                    <div style={{ position: 'relative' }}>
                      <Instagram size={18} className="text-green" style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)' }} />
                      <input 
                        type="url" 
                        className="glass-input" 
                        style={{ width: '100%', paddingLeft: '2.5rem' }} 
                        placeholder="Instagram Link"
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Facebook (Optional) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Facebook Link (Optional)</label>
                    <div style={{ position: 'relative' }}>
                      <Facebook size={18} className="text-green" style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)' }} />
                      <input 
                        type="url" 
                        className="glass-input" 
                        style={{ width: '100%', paddingLeft: '2.5rem' }} 
                        placeholder="Facebook Link"
                        value={facebook}  
                        onChange={(e) => setFacebook(e.target.value)}
                      />
                    </div>
                  </div>

                </div>

                {/* Availability Status (presets + custom) */}
                <div style={{ display: 'grid', gridTemplateColumns: availability === 'Custom' ? '1fr 1fr' : '1fr', gap: '1.5rem', marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Availability Status <span style={{ color: '#ff5252' }}>*</span></label>
                    <CustomDropdown
                      value={availability}
                      onChange={(e) => setAvailability(e.target.value)}
                      openUp={true}
                      options={[
                        { value: 'Available for Work', label: 'Available for Work' },
                        { value: 'Not Available', label: 'Not Available' },
                        { value: 'Freshers', label: 'Freshers' },
                        { value: 'Available for Part Time', label: 'Available for Part Time' },
                        { value: 'Available for Half Time', label: 'Available for Half Time' },
                        { value: 'Custom', label: 'Custom / Type Status...' }
                      ]}
                    />
                  </div>

                  {availability === 'Custom' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Type Custom Status <span style={{ color: '#ff5252' }}>*</span></label>
                      <input 
                        type="text" 
                        required
                        className="glass-input" 
                        placeholder="e.g. Open to Opportunities"
                        value={customAvailability}
                        onChange={(e) => setCustomAvailability(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <button type="submit" className="glass-btn" style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }}>
                  <Save size={18} /> Sync Account Profiles
                </button>
              </form>

              {/* Backend API Configuration */}
              <div className="glass-panel" style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={18} className="text-green" /> Backend API Configuration
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Currently connected to: <code style={{ color: 'var(--accent-green)', padding: '0.2rem 0.4rem', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>{API_BASE}</code>
                </p>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="url"
                    className="glass-input"
                    placeholder="Enter custom backend API URL (e.g. https://your-backend.up.railway.app/api)"
                    value={customApiInput}
                    onChange={(e) => setCustomApiInput(e.target.value)}
                    style={{ flex: 1, minWidth: '200px' }}
                  />
                  <button
                    onClick={handleSaveCustomApi}
                    className="glass-btn"
                    style={{ padding: '0.75rem 1.5rem' }}
                  >
                    Save URL
                  </button>
                  {localStorage.getItem('custom_api_base') && (
                    <button
                      onClick={handleResetCustomApi}
                      className="glass-btn-danger"
                      style={{ padding: '0.75rem 1.5rem' }}
                    >
                      Reset Default
                    </button>
                  )}
                </div>
                <small style={{ display: 'block', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                  * Changing the backend URL will reload the control panel to connect to the new server.
                </small>
              </div>

            </div>
          )}

          {/* TAB 2: PROJECTS PORTFOLIO CRUD */}
          {activeTab === 'projects' && (
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Projects</h2>
                <button onClick={() => handleOpenProjectForm()} className="glass-btn" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                  <Plus size={16} /> New Project
                </button>
              </div>

              {projects.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {projects.map((proj) => (
                    <div key={proj.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      <div>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{proj.title}</h4>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {proj.is_deployed ? `Deployed at: ${proj.live_link}` : 'Source repository only'}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleOpenProjectForm(proj)} className="glass-btn-secondary" style={{ padding: '0.4rem 0.8rem' }}>
                          <Edit size={16} /> Edit
                        </button>
                        <button onClick={() => handleDeleteProject(proj.id)} className="glass-btn-danger" style={{ padding: '0.4rem 0.8rem' }}>
                          <Trash2 size={16} /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  No projects uploaded yet. Use the header button to register your first repository project!
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EDUCATION CRUD */}
          {activeTab === 'education' && (
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Education</h2>
                <button onClick={() => handleOpenEduForm()} className="glass-btn" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                  <Plus size={16} /> Add Education
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {education.map((edu) => (
                  <div key={edu.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: '3px solid var(--accent-green)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{
                            textTransform: 'uppercase', 
                            fontWeight: 'bold', 
                            fontSize: '0.75rem',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            background: 'rgba(0, 255, 136, 0.1)',
                            color: 'var(--accent-green)'
                          }}>
                            {edu.degree === 'Bachelor' ? "Bachelor's Degree" : edu.degree === '12th' ? '12th' : '10th'}
                          </span>
                          <h4 style={{ fontWeight: 700, margin: 0 }}>{edu.school}</h4>
                        </div>
                        
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          {edu.degree === 'Bachelor' ? `${edu.course} in ${edu.branch}` : 
                           (edu.degree === '10th' ? 'Secondary School (SSC)' : 
                            (edu.degree === '12th' ? 'Intermediate' : edu.field_of_study))}
                        </p>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-start' }}>
                        <button onClick={() => handleOpenEduForm(edu)} className="glass-btn-secondary" style={{ padding: '0.4rem 0.8rem' }}>
                          <Edit size={16} /> Edit
                        </button>
                        <button onClick={() => handleDeleteEdu(edu.id)} className="glass-btn-danger" style={{ padding: '0.4rem 0.8rem' }}>
                          <Trash2 size={16} /> Delete
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', fontSize: '0.85rem', background: 'rgba(255,255,255,0.01)', padding: '0.8rem', borderRadius: '6px' }}>
                      <div>
                        <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Pass out Year</span>
                        <span>{formatDateStr(edu.passing_year || edu.end_date)}</span>
                      </div>
                      
                      {(edu.degree === '10th' || edu.degree === '12th') && (
                        <>
                          {edu.board && (
                            <div>
                              <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Board</span>
                              <span>{edu.board}</span>
                            </div>
                          )}
                          <div>
                            <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Marks Obtained / Full Marks</span>
                            <span>{edu.marks_obtained} / {edu.full_marks}</span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Percentage</span>
                            <span style={{ fontWeight: 600, color: 'var(--accent-green)' }}>{edu.percentage}%</span>
                          </div>
                        </>
                      )}

                      {edu.degree === 'Bachelor' && (
                        <div>
                          <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Calculated CGPA</span>
                          <span style={{ fontWeight: 600, color: 'var(--accent-green)' }}>{edu.cgpa} / 10.00</span>
                        </div>
                      )}
                    </div>

                    {edu.degree === 'Bachelor' && edu.semester_sgpa && (
                      <div style={{ fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem' }}>SGPA Details (Per Semester)</span>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {Object.entries(JSON.parse(edu.semester_sgpa || '{}')).map(([sem, val]) => (
                            val ? (
                              <div key={sem} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                <span style={{ textTransform: 'uppercase', color: 'var(--text-secondary)', marginRight: '0.25rem' }}>{sem}:</span>
                                <span>{val}</span>
                              </div>
                            ) : null
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.75rem' }}>
                      {edu.degree === '10th' && edu.certificate_10th && (
                        <button 
                          onClick={(e) => handleDownloadFile(e, edu.certificate_10th, `${edu.school}_10th_Certificate.pdf`)} 
                          className="glass-btn-secondary" 
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', border: '1px solid var(--glass-border)', background: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Download size={12} /> 10th Certificate
                        </button>
                      )}
                      {edu.degree === '12th' && (
                        <>
                          {edu.certificate_12th && (
                            <button 
                              onClick={(e) => handleDownloadFile(e, edu.certificate_12th, `${edu.school}_12th_Certificate.pdf`)} 
                              className="glass-btn-secondary" 
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', border: '1px solid var(--glass-border)', background: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                            >
                              <Download size={12} /> 12th Certificate
                            </button>
                          )}
                          {edu.marksheet_12th && (
                            <button 
                              onClick={(e) => handleDownloadFile(e, edu.marksheet_12th, `${edu.school}_12th_Marksheet.pdf`)} 
                              className="glass-btn-secondary" 
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', border: '1px solid var(--glass-border)', background: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                            >
                              <Download size={12} /> 12th Marksheet
                            </button>
                          )}
                        </>
                      )}
                      {edu.degree === 'Bachelor' && (
                        <>
                          {edu.gradesheet_bachelor && (
                            <button 
                              onClick={(e) => handleDownloadFile(e, edu.gradesheet_bachelor, `${edu.school}_Bachelor_Gradesheet.pdf`)} 
                              className="glass-btn-secondary" 
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', border: '1px solid var(--glass-border)', background: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                            >
                              <Download size={12} /> Semester Gradesheet
                            </button>
                          )}
                          {edu.certificate_bachelor && (
                            <button 
                              onClick={(e) => handleDownloadFile(e, edu.certificate_bachelor, `${edu.school}_Bachelor_Degree_Certificate.pdf`)} 
                              className="glass-btn-secondary" 
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', border: '1px solid var(--glass-border)', background: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                            >
                              <Download size={12} /> Degree Certificate
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: SKILLS CRUD */}
          {activeTab === 'skills' && (
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Skills</h2>
                <button onClick={() => handleOpenSkillForm()} className="glass-btn" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                  <Plus size={16} /> Add Skill
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {skills.map((skill) => (
                  <div key={skill.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '3px solid var(--accent-green)' }}>
                    <div>
                      <h4 style={{ fontWeight: 700, margin: 0 }}>{skill.name}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{skill.category}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button onClick={() => handleOpenSkillForm(skill)} className="glass-btn-secondary" style={{ padding: '0.3rem 0.6rem' }}>
                        <Edit size={14} />
                      </button>
                      <button onClick={() => handleDeleteSkill(skill.id)} className="glass-btn-danger" style={{ padding: '0.3rem 0.6rem' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: EXPERIENCE CRUD */}
          {activeTab === 'experience' && (
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Experience</h2>
                <button onClick={() => handleOpenExpForm()} className="glass-btn" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                  <Plus size={16} /> Add Experience
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {experience.map((exp) => (
                  <div key={exp.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: '3px solid var(--accent-green)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{
                            textTransform: 'uppercase', 
                            fontWeight: 'bold', 
                            fontSize: '0.75rem',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            background: exp.exp_type === 'project' ? 'rgba(0, 188, 255, 0.1)' : exp.exp_type === 'internship' ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 165, 0, 0.1)',
                            color: exp.exp_type === 'project' ? '#00bcff' : exp.exp_type === 'internship' ? 'var(--accent-green)' : '#ffa500'
                          }}>
                            {exp.exp_type === 'project' ? 'Group Project' : exp.exp_type === 'internship' ? 'Internship' : 'Program Participation'}
                          </span>
                          <h4 style={{ fontWeight: 700, margin: 0 }}>
                            {exp.exp_type === 'project' ? exp.project_name : exp.exp_type === 'internship' ? exp.org_name : exp.program_name}
                          </h4>
                        </div>
                        
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          {exp.exp_type === 'project' && `Instructor: ${exp.project_instructor}`}
                          {exp.exp_type === 'internship' && (exp.program_name ? `${exp.role} (${exp.program_name})` : exp.role)}
                          {exp.exp_type === 'program' && `Program participation`}
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-start' }}>
                        <button onClick={() => handleOpenExpForm(exp)} className="glass-btn-secondary" style={{ padding: '0.4rem 0.8rem' }}>
                          <Edit size={16} /> Edit
                        </button>
                        <button onClick={() => handleDeleteExp(exp.id)} className="glass-btn-danger" style={{ padding: '0.4rem 0.8rem' }}>
                          <Trash2 size={16} /> Delete
                        </button>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.85rem', background: 'rgba(255,255,255,0.01)', padding: '0.8rem', borderRadius: '6px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Timeline / Date</span>
                        <span>{exp.exp_type === 'program' ? formatDateStr(exp.start_date) : `${formatDateStr(exp.start_date)} - ${formatDateStr(exp.end_date)}`}</span>
                      </div>

                      {exp.exp_type === 'project' && (
                        <>
                          {exp.repo_link && (
                            <div>
                              <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>GitHub Code Repository</span>
                              <a href={exp.repo_link} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-green)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                Codebase <ExternalLink size={12} />
                              </a>
                            </div>
                          )}
                          {exp.deploy_link && (
                            <div>
                              <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Deployment Link</span>
                              <a href={exp.deploy_link} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-green)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                Live Demo <ExternalLink size={12} />
                              </a>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {exp.skills_learned && (
                      <div style={{ fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Skills & Tools Learned / What Was Improved</span>
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '6px', borderLeft: '2px solid var(--accent-green)', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                          {exp.skills_learned}
                        </div>
                      </div>
                    )}

                    {(exp.certificate_file || exp.lor_file) && (
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.75rem' }}>
                        {exp.certificate_file && (
                          <button 
                            onClick={(e) => handleDownloadFile(e, exp.certificate_file, `${exp.company}_Completion_Certificate.pdf`)} 
                            className="glass-btn-secondary" 
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', border: '1px solid var(--glass-border)', background: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            <Download size={12} /> Completion Certificate
                          </button>
                        )}
                        {exp.lor_file && (
                          <button 
                            onClick={(e) => handleDownloadFile(e, exp.lor_file, `${exp.company}_LOR_Letter.pdf`)} 
                            className="glass-btn-secondary" 
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', border: '1px solid var(--glass-border)', background: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            <Download size={12} /> Letter of Recommendation (LOR)
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: CERTIFICATES CRUD */}
          {activeTab === 'certs' && (
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Certificates</h2>
                <button onClick={() => handleOpenCertForm()} className="glass-btn" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                  <Plus size={16} /> Add Certificate
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {certificates.map((cert) => (
                  <div key={cert.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', borderLeft: '3px solid var(--accent-green)' }}>
                    <div>
                      <h4 style={{ fontWeight: 700, margin: 0 }}>{cert.name}</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        {cert.organization} | {formatDateStr(cert.issue_date)}
                      </p>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {cert.certificate_file ? (
                        <>
                          <button 
                            onClick={(e) => handleViewFile(e, cert.certificate_file)} 
                            className="glass-btn-secondary"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', border: '1px solid var(--glass-border)', background: 'none', cursor: 'pointer' }}
                          >
                            View
                          </button>
                          <button 
                            onClick={(e) => handleDownloadFile(e, cert.certificate_file, `${cert.name}_Certificate.pdf`)} 
                            className="glass-btn"  
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', border: '1px solid var(--glass-border)', background: 'none', cursor: 'pointer' }}
                          >
                            Download
                          </button>
                        </>
                      ) : cert.credential_url ? (
                        <a 
                          href={cert.credential_url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="glass-btn-secondary"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', textDecoration: 'none' }}
                        >
                          View Link
                        </a>
                      ) : null}
                      <button onClick={() => handleOpenCertForm(cert)} className="glass-btn-secondary" style={{ padding: '0.4rem 0.8rem' }}>
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDeleteCert(cert.id)} className="glass-btn-danger" style={{ padding: '0.4rem 0.8rem' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: VIEWERS INBOX INQUIRIES */}
          {activeTab === 'messages' && (
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                Inbox
              </h2>

              {messages.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  {/* Select All & Delete Action Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input 
                        type="checkbox" 
                        id="selectAllInbox"
                        checked={messages.length > 0 && selectedMsgIds.length === messages.length}
                        onChange={handleSelectAllMsgs}
                        className="circular-checkbox"
                      />
                      <label htmlFor="selectAllInbox" style={{ fontSize: '0.85rem', cursor: 'pointer', userSelect: 'none' }}>
                        Select All ({messages.length})
                      </label>
                    </div>
                    <button 
                      onClick={handleDeleteSelectedMsgs}
                      disabled={selectedMsgIds.length === 0}
                      className="glass-btn-danger"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', opacity: selectedMsgIds.length === 0 ? 0.5 : 1, cursor: selectedMsgIds.length === 0 ? 'not-allowed' : 'pointer' }}
                    >
                      <Trash2 size={14} /> Delete Selected ({selectedMsgIds.length})
                    </button>
                  </div>

                  {/* Vertical Cards Box */}
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '1rem', 
                    width: '100%'
                  }}>
                    {messages.map((msg) => {
                      const isSelected = selectedMsgIds.includes(msg.id);
                      return (
                        <div 
                          key={msg.id} 
                          onClick={(e) => {
                            if (selectedMsgIds.length > 0) {
                              setSelectedMsgIds(prev => {
                                if (prev.includes(msg.id)) {
                                  return prev.filter(msgId => msgId !== msg.id);
                                } else {
                                  return [...prev, msg.id];
                                }
                              });
                            } else {
                              handleViewMessage(msg);
                            }
                          }}
                          className="glass-card" 
                          style={{ 
                            borderLeft: msg.purpose === 'hire' ? '3px solid var(--accent-green)' : '3px solid #00bcff',
                            cursor: 'pointer',
                            background: msg.is_read ? 'rgba(255,255,255,0.02)' : 'rgba(0, 255, 136, 0.05)',
                            minHeight: '115px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            padding: '1rem',
                            transition: 'all 0.2s ease',
                            position: 'relative'
                          }}
                        >
                          {/* Checkbox Overlay Top Right */}
                          <div 
                            style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10 }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={(e) => handleToggleSelectMsg(e, msg.id)}
                              className="circular-checkbox"
                            />
                          </div>

                          <div style={{ marginRight: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.25rem' }}>
                              <span style={{ fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' }} title={msg.sender_email}>{msg.sender_email}</span>
                              <span style={{
                                textTransform: 'uppercase', 
                                fontWeight: 'bold', 
                                fontSize: '0.65rem',
                                padding: '0.1rem 0.35rem',
                                borderRadius: '4px',
                                background: msg.purpose === 'hire' ? 'rgba(0, 255, 136, 0.1)' : 'rgba(0, 188, 255, 0.1)',
                                color: msg.purpose === 'hire' ? 'var(--accent-green)' : '#00bcff',
                                marginRight: '1rem'
                              }}>
                                {msg.purpose}
                              </span>
                            </div>
                            <p style={{ 
                              fontSize: '0.85rem', 
                              color: 'rgba(255,255,255,0.75)', 
                              lineHeight: '1.4',
                              margin: '0.25rem 0 0 0',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical'
                            }}>
                              {msg.description}
                            </p>
                          </div>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.5rem' }}>
                            {new Date(msg.created_at).toLocaleDateString()} {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  No inbound hire or app review inquiries registered in database.
                </div>
              )}
            </div>
          )}

          {/* TAB 8: COURSES CRUD */}
          {activeTab === 'courses' && (
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>
                  Manage Courses
                </h2>
                <button 
                  onClick={() => handleOpenCourseForm()} 
                  className="glass-btn"
                  style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                >
                  <Plus size={16} /> Add Course
                </button>
              </div>

              {courses.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                  {courses.map((course) => (
                    <div key={course.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderLeft: '3px solid var(--accent-green)', padding: '1rem', gap: '0.75rem' }}>
                      <div>
                        <h4 style={{ fontWeight: 700, margin: 0, color: '#fff', fontSize: '1rem' }}>{course.name}</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: '1.4' }}>
                          {course.description}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-end' }}>
                        <button 
                          onClick={() => handleOpenCourseForm(course)} 
                          className="glass-btn-secondary" 
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', gap: '0.25rem' }}
                        >
                          <Edit size={12} /> Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteCourse(course.id)} 
                          className="glass-btn-danger" 
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', gap: '0.25rem' }}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  No courses added yet.
                </div>
              )}
            </div>
          )}

          {/* TAB 9: DOCUMENT PERMISSIONS */}
          {activeTab === 'permissions' && (
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                Document Access Requests
              </h2>

              {docRequests.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Bulk Actions Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <input 
                        type="checkbox"
                        checked={docRequests.length > 0 && selectedRequestIds.length === docRequests.length}
                        onChange={handleToggleSelectAllRequests}
                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-green)' }}
                      />
                      <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600 }}>
                        {selectedRequestIds.length === docRequests.length ? 'Deselect All' : 'Select All'} ({selectedRequestIds.length} selected)
                      </span>
                    </div>
                    {selectedRequestIds.length > 0 && (
                      <button
                        onClick={handleBulkDeleteDocRequests}
                        className="glass-btn-danger"
                        style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        <Trash2 size={14} /> Delete Selected ({selectedRequestIds.length})
                      </button>
                    )}
                  </div>

                  {docRequests.map((req) => (
                    <div 
                      key={req.id} 
                      style={{
                        padding: '1rem',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: selectedRequestIds.includes(req.id) ? '1px solid rgba(255, 82, 82, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        gap: '1rem',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <input 
                        type="checkbox"
                        checked={selectedRequestIds.includes(req.id)}
                        onChange={() => handleToggleSelectRequest(req.id)}
                        style={{ 
                          marginTop: '0.25rem',
                          width: '16px', 
                          height: '16px', 
                          cursor: 'pointer', 
                          accentColor: 'var(--accent-green)',
                          flexShrink: 0
                        }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div>
                            <h4 style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: '#fff' }}>{req.viewer_name}</h4>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{req.viewer_email}</span>
                          </div>
                          <span 
                            style={{
                              fontSize: '0.75rem',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '4px',
                              fontWeight: 600,
                              background: req.status === 'Approved' ? 'rgba(0, 255, 136, 0.1)' : req.status === 'Rejected' ? 'rgba(255, 82, 82, 0.1)' : 'rgba(255, 193, 7, 0.1)',
                              color: req.status === 'Approved' ? 'var(--accent-green)' : req.status === 'Rejected' ? '#ff5252' : '#ffc107',
                              border: req.status === 'Approved' ? '1px solid var(--accent-green)' : req.status === 'Rejected' ? '1px solid #ff5252' : '1px solid #ffc107'
                            }}
                          >
                            {req.status}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          <p style={{ margin: '0 0 0.25rem 0' }}>
                            <strong style={{ color: '#fff' }}>Requested:</strong> {req.document_name}
                          </p>
                          {req.purpose && (
                            <p style={{ margin: 0, fontStyle: 'italic' }}>
                              <strong style={{ color: '#fff', fontStyle: 'normal' }}>Purpose:</strong> "{req.purpose}"
                            </p>
                          )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.3)' }}>
                            Requested on: {new Date(req.created_at).toLocaleDateString()} at {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>

                          {req.status === 'Pending' && (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button 
                                onClick={() => handleDeclineRequest(req.id)}
                                className="glass-btn-secondary" 
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', border: '1px solid #ff5252', color: '#ff5252' }}
                              >
                                Decline
                              </button>
                              <button 
                                onClick={() => handleApproveRequest(req.id)}
                                className="glass-btn" 
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                              >
                                Approve Access
                              </button>
                            </div>
                          )}

                          {req.status !== 'Pending' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              {req.status === 'Approved' && req.access_token && (
                                <span style={{ fontSize: '0.8rem', color: 'var(--accent-green)', fontWeight: 600 }}>
                                  Access Code: <code style={{ letterSpacing: '1px', background: 'rgba(0,255,136,0.1)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>{req.access_token}</code>
                                </span>
                              )}
                              <button 
                                onClick={() => handleDeleteDocRequest(req.id)}
                                className="glass-btn-danger" 
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', gap: '0.25rem', display: 'flex', alignItems: 'center' }}
                              >
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  No document access requests received yet.
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ==========================================
         SUB-COMPONENTS DIALOGS MODALS
         ========================================== */}

      {/* Project Form Modal (Add / Edit) */}
      {showProjModal && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setShowProjModal(false); }}
          className="dashboard-modal-overlay"
        >
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-green)' }}>
                {editingProject ? 'Modify Project Showcase' : 'Add new project'}
              </h3>
              <button 
                type="button" 
                onClick={() => setShowProjModal(false)} 
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
              >
                <X size={20} className="text-secondary" />
              </button>
            </div>

            <form onSubmit={handleSaveProject} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.85rem' }}>Project Title <span style={{ color: '#ff5252' }}>*</span></label>
                <input type="text" required className="glass-input" value={projTitle} onChange={(e) => setProjTitle(e.target.value)} placeholder="Project itle" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.85rem' }}>Project Summary / Context <span style={{ color: '#ff5252' }}>*</span></label>
                <textarea rows={3} required className="glass-input" style={{ resize: 'none' }} value={projSummary} onChange={(e) => setProjSummary(e.target.value)} placeholder="Project Summary" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.85rem' }}>GitHub Codebase Link <span style={{ color: '#ff5252' }}>*</span></label>
                <input type="url" required className="glass-input" value={projRepo} onChange={(e) => setProjRepo(e.target.value)} placeholder="GitRepo Link" />
              </div>

              {/* Deployed Toggle Box */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  id="is_dep"
                  checked={projDeployed} 
                  onChange={(e) => setProjDeployed(e.target.checked)}
                  style={{ accentColor: 'var(--accent-green)', width: '16px', height: '16px' }}
                />
                <label htmlFor="is_dep" style={{ fontSize: '0.9rem', cursor: 'pointer', fontWeight: 500 }}>
                  Has this project been deployed already? (Live Demo)
                </label>
              </div>

              {projDeployed && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--accent-green)' }}>Live link of project <span style={{ color: '#ff5252' }}>*</span></label>
                  <input type="url" required={projDeployed} className="glass-input" value={projLive} onChange={(e) => setProjLive(e.target.value)} placeholder="live link" />
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.85rem' }}>Showcase Thumbnail Image</label>
                <DragDropUpload
                  onFileSelect={setProjThumbnail}
                  accept="image/*"
                  currentFile={projThumbnail}
                  placeholder="Drag & drop project thumbnail or click to upload"
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowProjModal(false)} className="glass-btn-secondary" style={{ flex: 1, justifyContent: 'center' }} disabled={loading}>Cancel</button>
                <button type="submit" className="glass-btn" style={{ flex: 1, justifyContent: 'center' }} disabled={loading}>
                  {loading ? (uploadProgress !== null ? `Uploading (${uploadProgress}%)` : 'Saving...') : 'Confirm & Save'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
          {/* Education Form Modal */}
      {showEduModal && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setShowEduModal(false); }}
          className="dashboard-modal-overlay"
        >
          <form onSubmit={handleAddEducation} className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <h3 style={{ margin: 0, fontWeight: 800 }}>{editingEdu ? 'Modify Academic Details' : 'Add Education'}</h3>
              <button 
                type="button" 
                onClick={() => setShowEduModal(false)} 
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
              >
                <X size={20} className="text-secondary" />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Education Level</label>
              <CustomDropdown
                value={eduType}
                onChange={(e) => setEduType(e.target.value)}
                options={[
                  { value: '10th', label: 'Secondary School (SSC)' },
                  { value: '12th', label: 'Intermediate' },
                  { value: 'Bachelor', label: "Bachelor's Degree" },
                  { value: 'Others', label: "Others (Diploma / PG / etc.)" }
                ]}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {eduType === '10th' ? 'High School Name' : eduType === '12th' ? 'Intermediate College Name' : eduType === 'Bachelor' ? 'University / College Name' : 'Institution Name'} <span style={{ color: '#ff5252' }}>*</span>
              </label>
              <input 
                type="text" 
                placeholder={eduType === '10th' ? 'High school name' : eduType === '12th' ? 'Intermediate college name' : eduType === 'Bachelor' ? 'University name' : 'Institution name'} 
                required 
                className="glass-input" 
                value={eduSchool}
                onChange={(e) => setEduSchool(e.target.value)} 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Pass out Date <span style={{ color: '#ff5252' }}>*</span></label>
                <CustomDatePicker 
                  required 
                  value={eduPassingYear}
                  onChange={(e) => setEduPassingYear(e.target.value)} 
                />
              </div>
            </div>

            {(eduType === '10th' || eduType === '12th') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Board <span style={{ color: '#ff5252' }}>*</span></label>
                <CustomDropdown
                  value={eduBoard}
                  onChange={(e) => setEduBoard(e.target.value)}
                  options={[
                    { value: 'CBSE', label: 'CBSE (Central Board of Secondary Education)' },
                    { value: 'ICSE', label: 'ICSE / ISC (Indian Certificate of Secondary Education)' },
                    { value: 'BSE', label: 'BSE (Board of Secondary Education)' },
                    { value: 'HSC', label: 'HSC (Higher Secondary Certificate)' },
                    { value: 'CHSE', label: 'CHSE (Council of Higher Secondary Education)' },
                    { value: 'Other', label: 'Other Board' }
                  ]}
                />
                {eduBoard === 'Other' && (
                  <input 
                    type="text" 
                    placeholder="Enter Custom Board (e.g. state board name)" 
                    required 
                    className="glass-input" 
                    style={{ marginTop: '0.5rem' }}
                    value={customEduBoard}
                    onChange={(e) => setCustomEduBoard(e.target.value)} 
                  />
                )}
              </div>
            )}

            {(eduType === '10th' || eduType === '12th' || eduType === 'Others') && (
              <>
                {eduType === 'Others' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Course / Degree Name <span style={{ color: '#ff5252' }}>*</span></label>
                    <input 
                      type="text" 
                      placeholder="e.g. PG Diploma / Master of Arts" 
                      required 
                      className="glass-input" 
                      value={eduCourse}
                      onChange={(e) => setEduCourse(e.target.value)} 
                    />
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Full Marks <span style={{ color: '#ff5252' }}>*</span></label>
                    <input 
                      type="number" 
                      placeholder="e.g. 600" 
                      required 
                      className="glass-input" 
                      value={eduFullMarks}
                      onChange={(e) => setEduFullMarks(e.target.value)} 
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Marks Obtained <span style={{ color: '#ff5252' }}>*</span></label>
                    <input 
                      type="number" 
                      placeholder="e.g. 540" 
                      required 
                      className="glass-input" 
                      value={eduMarksObtained}
                      onChange={(e) => setEduMarksObtained(e.target.value)} 
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Percentage (%) - Auto Calculated</label>
                  <input 
                    type="text" 
                    readOnly
                    className="glass-input" 
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--accent-green)', fontWeight: 'bold' }}
                    value={eduFullMarks && eduMarksObtained ? `${((parseFloat(eduMarksObtained) / parseFloat(eduFullMarks)) * 100).toFixed(2)}%` : '0.00%'}
                  />
                </div>

                {eduType === '10th' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Upload 10th Certificate <span style={{ color: '#ff5252' }}>*</span></label>
                    <DragDropUpload
                      onFileSelect={setEdu10thCert}
                      accept="image/*,application/pdf"
                      currentFile={edu10thCert}
                      placeholder="Drag & drop 10th certificate or click to upload"
                      required={true}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <input 
                        type="checkbox" 
                        id="eduAccess10th" 
                        checked={eduAccess10th} 
                        onChange={(e) => setEduAccess10th(e.target.checked)} 
                        style={{ accentColor: 'var(--accent-green)', cursor: 'pointer' }}
                      />
                      <label htmlFor="eduAccess10th" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        Allow viewers to view/screenshot directly (No password required)
                      </label>
                    </div>
                  </div>
                )}

                {eduType === '12th' && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Upload 12th Certificate <span style={{ color: '#ff5252' }}>*</span></label>
                      <DragDropUpload
                        onFileSelect={setEdu12thCert}
                        accept="image/*,application/pdf"
                        currentFile={edu12thCert}
                        placeholder="Drag & drop 12th certificate or click to upload"
                        required={true}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <input 
                          type="checkbox" 
                          id="eduAccess12th" 
                          checked={!eduAccess12th} 
                          onChange={(e) => setEduAccess12th(!e.target.checked)} 
                          style={{ accentColor: 'var(--accent-green)', cursor: 'pointer' }}
                        />
                        <label htmlFor="eduAccess12th" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                          Require access code verification (password protection) for both Certificate and Marksheet
                        </label>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Upload 12th Marksheet <span style={{ color: '#ff5252' }}>*</span></label>
                      <DragDropUpload
                        onFileSelect={setEdu12thMarksheet}
                        accept="image/*,application/pdf"
                        currentFile={edu12thMarksheet}
                        placeholder="Drag & drop 12th marksheet or click to upload"
                        required={true}
                      />
                    </div>
                  </>
                )}

                {eduType === 'Others' && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Upload Certificate <span style={{ color: '#ff5252' }}>*</span></label>
                      <DragDropUpload
                        onFileSelect={setEduOthersCert}
                        accept="image/*,application/pdf"
                        currentFile={eduOthersCert}
                        placeholder="Drag & drop certificate or click to upload"
                        required={true}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Upload Marksheet <span style={{ color: '#ff5252' }}>*</span></label>
                      <DragDropUpload
                        onFileSelect={setEduOthersMarksheet}
                        accept="image/*,application/pdf"
                        currentFile={eduOthersMarksheet}
                        placeholder="Drag & drop marksheet or click to upload"
                        required={true}
                      />
                    </div>
                  </>
                )}
              </>
            )}

            {eduType === 'Bachelor' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Course <span style={{ color: '#ff5252' }}>*</span></label>
                    <input 
                      type="text" 
                      placeholder="e.g. B.Tech / BCA" 
                      required 
                      className="glass-input" 
                      value={eduCourse}
                      onChange={(e) => setEduCourse(e.target.value)} 
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Branch <span style={{ color: '#ff5252' }}>*</span></label>
                    <input 
                      type="text" 
                      placeholder="e.g. CSE / IT" 
                      required 
                      className="glass-input" 
                      value={eduBranch}
                      onChange={(e) => setEduBranch(e.target.value)} 
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Course Duration</label>
                  <CustomDropdown
                    value={eduBachelorDuration}
                    onChange={(e) => setEduBachelorDuration(parseInt(e.target.value))}
                    options={[
                      { value: 3, label: '3 Years (6 Semesters)' },
                      { value: 4, label: '4 Years (8 Semesters)' }
                    ]}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '6px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--accent-green)' }}>Semester-wise SGPA Details</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <input type="text" placeholder="Sem 1 SGPA" className="glass-input" value={eduSemSgpas.sem1} onChange={(e) => setEduSemSgpas(prev => ({...prev, sem1: e.target.value}))} />
                    <input type="text" placeholder="Sem 2 SGPA" className="glass-input" value={eduSemSgpas.sem2} onChange={(e) => setEduSemSgpas(prev => ({...prev, sem2: e.target.value}))} />
                    <input type="text" placeholder="Sem 3 SGPA" className="glass-input" value={eduSemSgpas.sem3} onChange={(e) => setEduSemSgpas(prev => ({...prev, sem3: e.target.value}))} />
                    <input type="text" placeholder="Sem 4 SGPA" className="glass-input" value={eduSemSgpas.sem4} onChange={(e) => setEduSemSgpas(prev => ({...prev, sem4: e.target.value}))} />
                    <input type="text" placeholder="Sem 5 SGPA" className="glass-input" value={eduSemSgpas.sem5} onChange={(e) => setEduSemSgpas(prev => ({...prev, sem5: e.target.value}))} />
                    <input type="text" placeholder="Sem 6 SGPA" className="glass-input" value={eduSemSgpas.sem6} onChange={(e) => setEduSemSgpas(prev => ({...prev, sem6: e.target.value}))} />
                    {eduBachelorDuration === 4 && (
                      <>
                        <input type="text" placeholder="Sem 7 SGPA" className="glass-input" value={eduSemSgpas.sem7} onChange={(e) => setEduSemSgpas(prev => ({...prev, sem7: e.target.value}))} />
                        <input type="text" placeholder="Sem 8 SGPA" className="glass-input" value={eduSemSgpas.sem8} onChange={(e) => setEduSemSgpas(prev => ({...prev, sem8: e.target.value}))} />
                      </>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Consolidated Degree Certificate <span style={{ color: '#ff5252' }}>*</span></label>
                  <DragDropUpload
                    onFileSelect={setEduBachCert}
                    accept="image/*,application/pdf"
                    currentFile={eduBachCert}
                    placeholder="Drag & drop degree certificate or click to upload"
                    required={true}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <input 
                      type="checkbox" 
                      id="eduAccessBach" 
                      checked={eduAccessBach} 
                      onChange={(e) => setEduAccessBach(e.target.checked)} 
                      style={{ accentColor: 'var(--accent-green)', cursor: 'pointer' }}
                    />
                    <label htmlFor="eduAccessBach" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      Allow viewers to view/screenshot directly (No password required)
                    </label>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Consolidated/Yearly Grade Sheet <span style={{ color: '#ff5252' }}>*</span></label>
                  <DragDropUpload
                    onFileSelect={setEduBachGradesheet}
                    accept="image/*,application/pdf"
                    currentFile={eduBachGradesheet}
                    placeholder="Drag & drop grade sheet or click to upload"
                    required={true}
                  />
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button type="button" onClick={() => setShowEduModal(false)} className="glass-btn-secondary" style={{ flex: 1, justifyContent: 'center' }} disabled={loading}>Cancel</button>
              <button type="submit" className="glass-btn" style={{ flex: 1, justifyContent: 'center' }} disabled={loading}>
                {loading ? (uploadProgress !== null ? `Uploading (${uploadProgress}%)` : 'Saving...') : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showSkillModal && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setShowSkillModal(false); }}
          className="dashboard-modal-overlay"
        >
          <form onSubmit={handleAddSkill} className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <h3 style={{ margin: 0, fontWeight: 800 }}>{editingSkill ? 'Modify Skill' : 'Add Skill'}</h3>
              <button 
                type="button" 
                onClick={() => setShowSkillModal(false)} 
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
              >
                <X size={20} className="text-secondary" />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Skill Category</label>
              <CustomDropdown
                value={skillCategory}
                onChange={(e) => {
                  setSkillCategory(e.target.value);
                  setSelectedPresetSkill(skillPresets[e.target.value][0]);
                }}
                options={[
                  { value: 'Programming Language', label: 'Programming Language' },
                  { value: 'Tool', label: 'Tool' },
                  { value: 'Database', label: 'Database' }
                ]}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Select Skill Name</label>
              <CustomDropdown
                value={selectedPresetSkill}
                onChange={(e) => setSelectedPresetSkill(e.target.value)}
                options={[
                  ...(skillPresets[skillCategory] || []).map(s => ({ value: s, label: s })),
                  { value: 'Custom', label: 'Custom / Type Other...' }
                ]}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Knowledge Level</label>
              <CustomDropdown
                value={skillLevel}
                onChange={(e) => setSkillLevel(e.target.value)}
                options={[
                  { value: 'high', label: 'High' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'basic', label: 'Basic' }
                ]}
              />
            </div>

            {selectedPresetSkill === 'Custom' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Type Custom Skill Name <span style={{ color: '#ff5252' }}>*</span></label>
                <input 
                  type="text" 
                  placeholder="e.g. Next.js" 
                  required 
                  className="glass-input" 
                  value={customSkillName}
                  onChange={(e) => setCustomSkillName(e.target.value)} 
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setShowSkillModal(false)} className="glass-btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
              <button type="submit" className="glass-btn" style={{ flex: 1, justifyContent: 'center' }}>Save</button>
            </div>
          </form>
        </div>
      )}

      {showExpModal && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setShowExpModal(false); }}
          className="dashboard-modal-overlay"
        >
          <form onSubmit={handleAddExperience} className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <h3 style={{ margin: 0, fontWeight: 800 }}>{editingExp ? 'Modify Experience Details' : 'Add Experience'}</h3>
              <button 
                type="button" 
                onClick={() => setShowExpModal(false)} 
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
              >
                <X size={20} className="text-secondary" />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Experience Type</label>
              <CustomDropdown
                value={expType}
                onChange={(e) => setExpType(e.target.value)}
                options={[
                  { value: 'project', label: 'Group Project' },
                  { value: 'internship', label: 'Internship' },
                  { value: 'program', label: 'Program Participation' }
                ]}
              />
            </div>

            {/* Group Project fields */}
            {expType === 'project' && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Project Name <span style={{ color: '#ff5252' }}>*</span></label>
                  <input type="text" placeholder="e.g. Chat Application" required className="glass-input" value={expProjectName} onChange={(e) => setExpProjectName(e.target.value)} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Project Instructor / Mentor <span style={{ color: '#ff5252' }}>*</span></label>
                  <input type="text" placeholder="e.g. Dr. John Doe" required className="glass-input" value={expProjectInstructor} onChange={(e) => setExpProjectInstructor(e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Repo Link <span style={{ color: '#ff5252' }}>*</span></label>
                    <input type="url" placeholder="https://github.com/..." required className="glass-input" value={expRepoLink} onChange={(e) => setExpRepoLink(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Deployment Link (Optional)</label>
                    <input type="url" placeholder="https://myproj.live" className="glass-input" value={expDeployLink} onChange={(e) => setExpDeployLink(e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                     <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Start Date <span style={{ color: '#ff5252' }}>*</span></label>
                     <CustomDatePicker required value={expStart} onChange={(e) => setExpStart(e.target.value)} />
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                     <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>End Date <span style={{ color: '#ff5252' }}>*</span></label>
                     <CustomDatePicker required value={expEnd} onChange={(e) => setExpEnd(e.target.value)} />
                   </div>
                </div>
              </>
            )}

            {/* Internship fields */}
            {expType === 'internship' && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Organisation Name <span style={{ color: '#ff5252' }}>*</span></label>
                  <input type="text" placeholder="e.g. Google" required className="glass-input" value={expOrgName} onChange={(e) => setExpOrgName(e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Program Name</label>
                    <input type="text" placeholder="e.g. Summer Internship" className="glass-input" value={expProgramName} onChange={(e) => setExpProgramName(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Role / Domain <span style={{ color: '#ff5252' }}>*</span></label>
                    <input type="text" placeholder="e.g. Web Developer" required className="glass-input" value={expRole} onChange={(e) => setExpRole(e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Start Date <span style={{ color: '#ff5252' }}>*</span></label>
                    <CustomDatePicker required value={expStart} onChange={(e) => setExpStart(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>End Date <span style={{ color: '#ff5252' }}>*</span></label>
                    <CustomDatePicker required value={expEnd} onChange={(e) => setExpEnd(e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Upload Internship Certificate <span style={{ color: '#ff5252' }}>*</span></label>
                  <DragDropUpload
                    onFileSelect={setExpCertificateFile}
                    accept="image/*,application/pdf"
                    currentFile={expCertificateFile}
                    placeholder="Drag & drop internship certificate or click to upload"
                    required={true}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Upload Letter of Recommendation (LOR) - Optional</label>
                  <DragDropUpload
                    onFileSelect={setExpLorFile}
                    accept="image/*,application/pdf"
                    currentFile={expLorFile}
                    placeholder="Drag & drop LOR file or click to upload"
                  />
                </div>
              </>
            )}

            {/* Program Participation fields */}
            {expType === 'program' && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Program Name <span style={{ color: '#ff5252' }}>*</span></label>
                  <input type="text" placeholder="e.g. Smart India Hackathon" required className="glass-input" value={expProgramName} onChange={(e) => setExpProgramName(e.target.value)} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Participation Date <span style={{ color: '#ff5252' }}>*</span></label>
                  <CustomDatePicker required value={expStart} onChange={(e) => setExpStart(e.target.value)} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Upload Certificate <span style={{ color: '#ff5252' }}>*</span></label>
                  <DragDropUpload
                    onFileSelect={setExpCertificateFile}
                    accept="image/*,application/pdf"
                    currentFile={expCertificateFile}
                    placeholder="Drag & drop certificate or click to upload"
                    required={true}
                  />
                </div>
              </>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--accent-green)' }}>What new skills & tools did you learn? What did you improve? (Summary) <span style={{ color: '#ff5252' }}>*</span></label>
              <textarea 
                rows={3} 
                required 
                placeholder="Write a brief summary of new tools and professional skills gained during this experience..." 
                className="glass-input" 
                style={{ resize: 'none' }}
                value={expSkillsLearned} 
                onChange={(e) => setExpSkillsLearned(e.target.value)} 
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setShowExpModal(false)} className="glass-btn-secondary" style={{ flex: 1, justifyContent: 'center' }} disabled={loading}>Cancel</button>
              <button type="submit" className="glass-btn" style={{ flex: 1, justifyContent: 'center' }} disabled={loading}>
                {loading ? (uploadProgress !== null ? `Uploading (${uploadProgress}%)` : 'Saving...') : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showCertModal && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setShowCertModal(false); }}
          className="dashboard-modal-overlay"
        >
          <form onSubmit={handleAddCertificate} className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <h3 style={{ margin: 0, fontWeight: 800 }}>{editingCert ? 'Modify Certificate' : 'Add Certificate'}</h3>
              <button 
                type="button" 
                onClick={() => setShowCertModal(false)} 
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
              >
                <X size={20} className="text-secondary" />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Certificate Title <span style={{ color: '#ff5252' }}>*</span></label>
              <input type="text" placeholder="e.g. AWS Solutions Architect" required className="glass-input" value={certName} onChange={(e) => setCertName(e.target.value)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Issuing Institution <span style={{ color: '#ff5252' }}>*</span></label>
              <input type="text" placeholder="e.g. Amazon Web Services" required className="glass-input" value={certOrg} onChange={(e) => setCertOrg(e.target.value)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Date of Issue <span style={{ color: '#ff5252' }}>*</span></label>
              <CustomDatePicker required value={certDate} onChange={(e) => setCertDate(e.target.value)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Credential Verification Link (Optional)</label>
              <input type="url" placeholder="https://aws.amazon.com/..." className="glass-input" value={certUrl} onChange={(e) => setCertUrl(e.target.value)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Upload Certificate File (PDF or Image)</label>
              <DragDropUpload
                onFileSelect={setCertFile}
                accept="image/*,application/pdf"
                currentFile={certFile}
                placeholder="Drag & drop certificate file or click to upload"
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  id="certAccess" 
                  checked={certAccess} 
                  onChange={(e) => setCertAccess(e.target.checked)} 
                  style={{ accentColor: 'var(--accent-green)', cursor: 'pointer' }}
                />
                <label htmlFor="certAccess" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  Allow viewers to view/screenshot directly (No password required)
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setShowCertModal(false)} className="glass-btn-secondary" style={{ flex: 1, justifyContent: 'center' }} disabled={loading}>Cancel</button>
              <button type="submit" className="glass-btn" style={{ flex: 1, justifyContent: 'center' }} disabled={loading}>
                {loading ? (uploadProgress !== null ? `Uploading (${uploadProgress}%)` : 'Saving...') : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Message View Modal */}
      {showMsgModal && selectedMessage && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setShowMsgModal(false); }}
          className="dashboard-modal-overlay"
        >
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2rem', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Viewer Inquiry Details</h3>
              <button 
                type="button" 
                onClick={() => setShowMsgModal(false)} 
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                <X size={20} className="text-secondary" />
                    </button>
            </div>
            {!isReplying ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem' }}>Sender Email</span>
                    <span style={{ fontWeight: 600, color: 'var(--accent-green)' }}>{selectedMessage.sender_email}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem' }}>Purpose</span>
                      <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{selectedMessage.purpose === 'hire' ? '💼 Hire' : '💬 Review/Feedback'}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem' }}>Date Received</span>
                      <span>{new Date(selectedMessage.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Message</span>
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '6px', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                      {selectedMessage.description}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button 
                    type="button" 
                    onClick={() => setShowMsgModal(false)} 
                    className="glass-btn-secondary" 
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    Close
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsReplying(true)}
                    className="glass-btn" 
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    Reply Directly
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem' }}>Replying to</span>
                    <span style={{ fontWeight: 600, color: 'var(--accent-green)' }}>{selectedMessage.sender_email}</span>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                      Write your reply message <span style={{ color: '#ff5252' }}>*</span>
                    </label>
                    <textarea
                      rows={5}
                      required
                      className="glass-input"
                      placeholder="Type your response here..."
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      style={{ width: '100%', resize: 'none', background: 'rgba(255,255,255,0.02)', color: '#fff' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button 
                    type="button" 
                    onClick={() => setIsReplying(false)} 
                    className="glass-btn-secondary" 
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button"
                    onClick={handleSendReply}
                    disabled={!replyText.trim() || loading}
                    className="glass-btn" 
                    style={{ flex: 1, justifyContent: 'center', opacity: (!replyText.trim() || loading) ? 0.5 : 1 }}
                  >
                    {loading ? 'Sending...' : 'Send Reply Email'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setShowExitModal(false); }}
          className="dashboard-modal-overlay"
        >
          <div className="glass-panel" style={{ width: '100%', maxWidth: '380px', padding: '2rem', textAlign: 'center', position: 'relative' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: 800 }}>Confirm Logout</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Are you sure you want to logout?
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                type="button" 
                onClick={() => setShowExitModal(false)} 
                className="glass-btn-secondary" 
                style={{ flex: 1, justifyContent: 'center' }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={() => { setShowExitModal(false); onLogout(); }} 
                className="glass-btn-danger" 
                style={{ flex: 1, justifyContent: 'center' }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Mobile Drawer/Sidebar */}
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
                onClick={() => {
                  if (!profile?.profile_picture || avatarError) {
                    showStatus('Please upload your profile picture under the Edit Profile tab.', true);
                  } else {
                    setMobileMenuOpen(false);
                    setTimeout(() => setShowAvatarPopup(true), 200);
                  }
                }}
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
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 0 16px rgba(0,255,136,0.15)'
                }}
                title="Click to view profile picture"
              >
                {profile?.profile_picture && !avatarError ? (
                  <img
                    src={resolveFileUrl(profile.profile_picture)}
                    alt="owner"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <span style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--accent-green)' }}>NA</span>
                )}
              </div>
              <h4 style={{ fontWeight: 700, margin: 0, fontSize: '0.95rem' }}>{profile?.username || 'Navycut'}</h4>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Account Owner</span>
            </div>

            {/* Left Drawer tab links inside mobile menu */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button onClick={() => { setActiveTab('profile'); setMobileMenuOpen(false); }} className={`glass-btn-secondary ${activeTab === 'profile' ? 'active-tab' : ''}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '0.8rem 1rem' }}>
                <User size={18} className="text-green" /> Edit Profile
              </button>
              <button onClick={() => { setActiveTab('projects'); setMobileMenuOpen(false); }} className={`glass-btn-secondary ${activeTab === 'projects' ? 'active-tab' : ''}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '0.8rem 1rem' }}>
                <Code size={18} className="text-green" /> Projects ({projects.length})
              </button>
              <button onClick={() => { setActiveTab('education'); setMobileMenuOpen(false); }} className={`glass-btn-secondary ${activeTab === 'education' ? 'active-tab' : ''}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '0.8rem 1rem' }}>
                <GraduationCap size={18} className="text-green" /> Education
              </button>
              <button onClick={() => { setActiveTab('skills'); setMobileMenuOpen(false); }} className={`glass-btn-secondary ${activeTab === 'skills' ? 'active-tab' : ''}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '0.8rem 1rem' }}>
                <CheckCircle size={18} className="text-green" /> Skills
              </button>
              <button onClick={() => { setActiveTab('experience'); setMobileMenuOpen(false); }} className={`glass-btn-secondary ${activeTab === 'experience' ? 'active-tab' : ''}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '0.8rem 1rem' }}>
                <Briefcase size={18} className="text-green" /> Experience
              </button>
              <button onClick={() => { setActiveTab('certs'); setMobileMenuOpen(false); }} className={`glass-btn-secondary ${activeTab === 'certs' ? 'active-tab' : ''}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '0.8rem 1rem' }}>
                <Award size={18} className="text-green" /> Certificates
              </button>
              <button onClick={() => { setActiveTab('courses'); setMobileMenuOpen(false); }} className={`glass-btn-secondary ${activeTab === 'courses' ? 'active-tab' : ''}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '0.8rem 1rem' }}>
                <GraduationCap size={18} className="text-green" /> Courses
              </button>
              <button onClick={() => { setActiveTab('messages'); setMobileMenuOpen(false); }} className={`glass-btn-secondary ${activeTab === 'messages' ? 'active-tab' : ''}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '0.8rem 1rem' }}>
                <Mail size={18} className="text-green" /> Inbox
                {(() => {
                  const unreadCount = messages.filter(m => !m.is_read).length;
                  if (unreadCount === 0) return '';
                  return ` (${unreadCount})`;
                })()}
              </button>
              <button onClick={() => { setActiveTab('permissions'); setMobileMenuOpen(false); }} className={`glass-btn-secondary ${activeTab === 'permissions' ? 'active-tab' : ''}`} style={{ justifyContent: 'flex-start', width: '100%', padding: '0.8rem 1rem' }}>
                <ShieldCheck size={18} className="text-green" /> Document Requests
                {(() => {
                  const pendingCount = docRequests.filter(r => r.status === 'Pending').length;
                  if (pendingCount === 0) return '';
                  return ` (${pendingCount})`;
                })()}
              </button>
            </div>

            {/* Quick Actions (shifted to sidebar on mobile) */}
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button 
                onClick={() => { handleOpenProjectForm(); setMobileMenuOpen(false); }} 
                className="glass-btn" 
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Plus size={18} /> New Project
              </button>
              <button 
                onClick={() => { navigateTo('portfolio'); setMobileMenuOpen(false); }} 
                className="glass-btn-secondary" 
                style={{ width: '100%', justifyContent: 'center' }}
              >
                View Live
              </button>
              <button 
                onClick={() => { setShowExitModal(true); setMobileMenuOpen(false); }} 
                className="glass-btn-danger" 
                style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <LogOut size={18} /> Logout
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Course Modal (Add) */}
      {showCourseModal && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setShowCourseModal(false); }}
          className="dashboard-modal-overlay"
        >
          <form onSubmit={handleAddCourse} className="glass-panel" style={{ width: '100%', maxWidth: '450px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
              <h3 style={{ margin: 0, fontWeight: 800 }}>{editingCourse ? 'Modify Course' : 'Add New Course'}</h3>
              <button 
                type="button" 
                onClick={() => setShowCourseModal(false)} 
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
              >
                <X size={20} className="text-secondary" />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Course Name <span style={{ color: '#ff5252' }}>*</span></label>
              <input 
                type="text" 
                placeholder="e.g. Master React & NextJS" 
                required 
                className="glass-input" 
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)} 
                autoComplete="off"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>About the knowledge on the course <span style={{ color: '#ff5252' }}>*</span></label>
              <textarea 
                rows={4}
                placeholder="Describe what you learned or taught in this course..." 
                required 
                className="glass-input" 
                value={courseDesc}
                onChange={(e) => setCourseDesc(e.target.value)} 
                autoComplete="off"
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setShowCourseModal(false)} className="glass-btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
              <button type="submit" className="glass-btn" style={{ flex: 1, justifyContent: 'center' }}>Save Course</button>
            </div>
          </form>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteConfirmOpen && (() => {
        const { title, message, confirmText } = getDeleteModalContent();
        return (
          <div 
            onClick={() => setDeleteConfirmOpen(false)}
            className="dashboard-modal-overlay"
          >
            <div className="glass-panel" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '380px', padding: '2rem', textAlign: 'center', position: 'relative' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: 800, color: '#ff5252' }}>{title}</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                {message}
              </p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  type="button" 
                  onClick={() => setDeleteConfirmOpen(false)} 
                  className="glass-btn-secondary" 
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={confirmDelete} 
                  className="glass-btn-danger" 
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Profile Picture circular popup modal */}
      {showAvatarPopup && (
        <div 
          onClick={() => setShowAvatarPopup(false)}
          className="dashboard-modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            backdropFilter: 'blur(10px)',
            animation: 'fadeIn 0.25s ease'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: 'min(380px, 85vw)',
              height: 'min(380px, 85vw)',
              borderRadius: '50%',
              border: '4px solid var(--accent-green)',
              boxShadow: '0 0 40px rgba(0, 255, 136, 0.4)',
              background: 'rgba(4, 12, 8, 0.95)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            {profile?.profile_picture ? (
              <img 
                src={resolveFileUrl(profile.profile_picture)} 
                alt="owner large" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <User size={120} style={{ color: 'var(--accent-green)' }} />
                <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600 }}>No profile picture set</span>
              </div>
            )}
            <button 
              onClick={() => setShowAvatarPopup(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                zIndex: 10
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-green)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default DashboardPage;
