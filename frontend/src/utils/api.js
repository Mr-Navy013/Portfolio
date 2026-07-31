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
  const prodBase = 'https://portfolio-f4os.onrender.com/api';
  
  try {
    const res = await fetch(`${currentBase}${endpoint}`, options);
    return res;
  } catch (primaryErr) {
    console.warn(`[API Fallback] Primary fetch to ${currentBase}${endpoint} failed:`, primaryErr);

    // If local API was used and failed, try production backend as fallback
    if (currentBase !== prodBase && (currentBase.includes('localhost') || currentBase.includes('127.0.0.1') || currentBase.includes('192.168.'))) {
      if (onStatusUpdate) onStatusUpdate('Local server unavailable. Connecting to production server...');
      try {
        const prodRes = await fetch(`${prodBase}${endpoint}`, options);
        if (prodRes) {
          setApiBase(prodBase);
          return prodRes;
        }
      } catch (prodErr) {
        console.warn(`[API Fallback] Production fetch to ${prodBase}${endpoint} failed:`, prodErr);
      }
    }

    // Cold-start retries for Render backend
    const targetBase = getApiBase();
    for (let attempt = 1; attempt <= 3; attempt++) {
      if (onStatusUpdate) onStatusUpdate(`Server warming up, retrying connection (${attempt}/3)...`);
      await new Promise((r) => setTimeout(r, 3500));
      try {
        const retryRes = await fetch(`${targetBase}${endpoint}`, options);
        if (retryRes) return retryRes;
      } catch (_) {}
    }

    throw new Error('Unable to connect to backend server. Please check your internet connection or start the local backend server.');
  }
};
