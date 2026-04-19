import axios from 'axios';
import { API_BASE_URL } from '@/utils/constants';
import useAuthStore from '@/store/authStore';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor ───────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor ──────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url    = error.config?.url || '';

    // ✅ KEY FIX:
    // Only force-logout + redirect on 401 when the user is ALREADY logged in
    // (i.e. has a valid token in store) AND the request is NOT a login/auth attempt.
    //
    // Without this check, a failed login (also returns 401) triggers a page
    // reload BEFORE the LoginForm catch block can show the error message.

    const isAuthAttempt =
      url.includes('/auth/login')      ||
      url.includes('/auth/register')   ||
      url.includes('/auth/verify')     ||
      url.includes('/auth/forgot')     ||
      url.includes('/auth/reset');

    const isLoggedIn = !!useAuthStore.getState().token;

    if (status === 401 && isLoggedIn && !isAuthAttempt) {
      // Session expired or token revoked → logout and redirect
      useAuthStore.getState().logout();
      window.location.href = '/auth';
    }

    // For all other errors (including failed login) → let the
    // component's catch block handle it and show the error message
    return Promise.reject(error);
  }
);

export default api;