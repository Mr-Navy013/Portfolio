export const getApiBase = () => {
  const custom = localStorage.getItem('custom_api_base');
  if (custom) return custom;

  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE;
  }

  const hostname = window.location.hostname;
  // Resolve local development hostname or IP addresses dynamically
  let resolvedBase;
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    /^192\.168\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) || // Matches 172.16.x.x through 172.31.x.x (Class B private networks / Mobile Hotspots)
    /^169\.254\./.test(hostname) || // Link-local IP addresses
    hostname.endsWith('.local') ||
    hostname.endsWith('.lan') ||
    hostname.endsWith('.home')
  ) {
    resolvedBase = `http://${hostname}:5000/api`;
  } else {
    // Production Render API base fallback
    resolvedBase = 'https://portfolio-f4os.onrender.com/api';
  }
  
  console.log(`[API Base Resolver] Hostname: ${hostname} -> Resolved Base: ${resolvedBase}`);
  return resolvedBase;
};

export const setApiBase = (url) => {
  if (!url) {
    localStorage.removeItem('custom_api_base');
  } else {
    // Ensure it ends with /api
    let cleaned = url.trim();
    if (cleaned.endsWith('/')) {
      cleaned = cleaned.slice(0, -1);
    }
    if (!cleaned.endsWith('/api')) {
      cleaned = `${cleaned}/api`;
    }
    localStorage.setItem('custom_api_base', cleaned);
  }
};

export const fetchWithFallback = async (endpoint, options = {}, onStatusUpdate = null) => {
  const currentBase = getApiBase();
  const localBase = 'http://localhost:5000/api';
  const prodBase = 'https://portfolio-f4os.onrender.com/api';
  
  // Fast health check: If local backend server is running, prioritize local base
  let primaryBase = currentBase;
  try {
    const localCheck = await fetch(`${localBase}/health`, { signal: AbortSignal.timeout(1500) });
    if (localCheck.ok) {
      primaryBase = localBase;
      if (currentBase !== localBase) setApiBase(localBase);
    }
  } catch (_) {}

  // 1. Primary Attempt
  try {
    const res = await fetch(`${primaryBase}${endpoint}`, options);
    if (res) return res;
  } catch (primaryErr) {
    console.warn(`[API Fallback] Fetch to ${primaryBase}${endpoint} failed:`, primaryErr);

    // 2. Alternate Fallback Attempt
    const alternateBase = primaryBase === localBase ? prodBase : localBase;
    if (onStatusUpdate) onStatusUpdate(`Connecting to alternate server (${alternateBase.includes('localhost') ? 'Localhost' : 'Production'})...`);
    try {
      const altRes = await fetch(`${alternateBase}${endpoint}`, options);
      if (altRes) {
        setApiBase(alternateBase);
        return altRes;
      }
    } catch (altErr) {
      console.warn(`[API Fallback] Alternate fetch to ${alternateBase}${endpoint} failed:`, altErr);
    }

    // 3. Cold-start Retries
    for (let attempt = 1; attempt <= 3; attempt++) {
      if (onStatusUpdate) onStatusUpdate(`Server warming up, retrying (${attempt}/3)...`);
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const retryRes = await fetch(`${primaryBase}${endpoint}`, options);
        if (retryRes) return retryRes;
      } catch (_) {}
    }

    throw new Error('Unable to connect to backend server. Please start local backend (`cd backend && npm start`).');
  }
};
