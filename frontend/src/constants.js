const DEV_API = 'http://localhost:5000/api';
const PROD_API = import.meta.env.VITE_API_BASE || 'https://portfolio-1-rcsv.onrender.com/api';

export const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? DEV_API
  : PROD_API;
