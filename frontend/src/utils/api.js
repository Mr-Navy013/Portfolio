export const getApiBase = () => {
  const custom = localStorage.getItem('custom_api_base');
  if (custom) return custom;

  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE;
  }

  const hostname = window.location.hostname;
  // Resolve local development hostname or IP addresses dynamically
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    /^192\.168\./.test(hostname) ||
    /^10\./.test(hostname) ||
    hostname.endsWith('.local')
  ) {
    return `http://${hostname}:5000/api`;
  }

  // Production Render API base fallback
  return 'https://portfolio-f4os.onrender.com/api';
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
