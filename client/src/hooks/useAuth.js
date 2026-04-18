import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '@/store/authStore';
import { authService } from '@/services/authService';

const useAuth = () => {
  const { user, token, isAuthenticated, login, logout, updateUser, setLoading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (token && !user) {
      fetchUser();
    }
  }, [token]);

  const fetchUser = async () => {
    setLoading(true);
    try {
      const response = await authService.getMe();
      updateUser(response.data);
    } catch (error) {
      logout();
      navigate('/auth');
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    isAuthenticated,
    login,
    logout,
    updateUser,
  };
};

export default useAuth;