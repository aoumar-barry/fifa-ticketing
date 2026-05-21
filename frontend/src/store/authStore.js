import { create } from 'zustand';
import * as authService from '../services/authService';

/**
 * Decode JWT token payload in pure JavaScript
 */
function decodeJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setAccessToken: (token) => set({ accessToken: token }),

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authService.loginLocal(email, password);
      set({
        user: data.user,
        accessToken: data.accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
      return data;
    } catch (err) {
      set({ error: err.message || 'Login failed', isLoading: false });
      throw err;
    }
  },

  loginWithFirebase: async (idToken) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authService.loginFirebase(idToken);
      set({
        user: data.user,
        accessToken: data.accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
      return data;
    } catch (err) {
      set({ error: err.message || 'Firebase authentication failed', isLoading: false });
      throw err;
    }
  },

  register: async (email, password, firstName, lastName, phone) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authService.registerLocal(email, password, firstName, lastName, phone);
      set({
        user: data.user,
        accessToken: data.accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
      return data;
    } catch (err) {
      set({ error: err.message || 'Registration failed', isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.logout();
    } catch (err) {
      // Safe to ignore, we clear local session anyway
    } finally {
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await authService.refreshAccessToken();
      const decoded = decodeJwt(data.accessToken);
      if (decoded) {
        set({
          user: {
            id: decoded.userId,
            email: decoded.email,
            role: decoded.role,
          },
          accessToken: data.accessToken,
          isAuthenticated: true,
          isLoading: false,
        });
        return data;
      }
      set({ isLoading: false });
      return null;
    } catch (err) {
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
      return null;
    }
  },
}));
