/**
 * API client for Matter Management feature.
 * Reads the token from localStorage['nyayai_token'], which is kept in sync
 * with LibreChat's auth token by useMatterAuth().
 *
 * In dev: token is a LibreChat HS256 JWT (shared JWT_SECRET).
 * In prod: token is a Cognito RS256 JWT (same token LibreChat uses).
 *
 * Base URL is /api/v1 — routed to matter-service via Nginx.
 */
import axios from 'axios';

export const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nyayai_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      // Token expired — LibreChat will handle silent refresh
      console.warn('[matters] 401 from matter-service — token may have expired');
    }
    return Promise.reject(err);
  },
);
