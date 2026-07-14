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
