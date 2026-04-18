import api from './api';
import { API_ENDPOINTS } from '@/utils/constants';

export const authService = {
  // Registration
  requestRegistrationOTP: async (data) => {
    const response = await api.post(API_ENDPOINTS.REGISTER_OTP, data);
    return response.data;
  },

  verifyRegistration: async (data) => {
    const response = await api.post(API_ENDPOINTS.VERIFY_REGISTRATION, data);
    return response.data;
  },

  // Login
  login: async (data) => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  requestLoginOTP: async (data) => {
    const response = await api.post(API_ENDPOINTS.LOGIN_OTP, data);
    return response.data;
  },

  verifyLogin: async (data) => {
    const response = await api.post(API_ENDPOINTS.VERIFY_LOGIN, data);
    return response.data;
  },

  // ✅ Password Reset
  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  verifyResetToken: async (token) => {
    const response = await api.get(`/auth/reset-password/${token}`);
    return response.data;
  },

  resetPassword: async (token, password, confirmPassword) => {
    const response = await api.post(`/auth/reset-password/${token}`, {
      password,
      confirmPassword,
    });
    return response.data;
  },

  // User
  getMe: async () => {
    const response = await api.get(API_ENDPOINTS.GET_ME);
    return response.data;
  },

  updateProfile: async (data) => {
    const response = await api.put(API_ENDPOINTS.UPDATE_PROFILE, data);
    return response.data;
  },

  logout: async () => {
    const response = await api.post(API_ENDPOINTS.LOGOUT);
    return response.data;
  },
};