import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '@/store/authStore';
import { authService } from '@/services/authService';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const { token, isAuthenticated, login, logout, setUser, setLoading } = useAuthStore();
  const [initializing, setInitializing] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    if (token && !isAuthenticated) {
      setLoading(true);
      try {
        const response = await authService.getMe();
        setUser(response.data);
      } catch (error) {
        console.error('Auth initialization failed:', error);
        logout();
      } finally {
        setLoading(false);
        setInitializing(false);
      }
    } else {
      setInitializing(false);
    }
  };

  const value = {
    isAuthenticated,
    login,
    logout,
  };

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
};