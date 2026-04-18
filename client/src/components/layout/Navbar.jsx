import { motion } from 'framer-motion';
import {
  Menu,
  User,
  LogOut,
  Settings,
  Activity,
  ChevronLeft,
  MessageSquare,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '@/store/authStore';
import useUIStore from '@/store/uiStore';
import useChatStore from '@/store/chatStore';
import Avatar from '@/components/ui/Avatar';
import { authService } from '@/services/authService';

const Navbar = () => {
  const { user, logout } = useAuthStore();
  const { toggleSidebar, showToast } = useUIStore();
  const { currentConversation } = useChatStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);

  const isOnChatPage = location.pathname.startsWith('/chat');
  const isOnDashboard = location.pathname === '/dashboard';

  const handleLogout = async () => {
    try {
      await authService.logout();
      logout();
      showToast('Logged out successfully', 'success');
      navigate('/auth');
    } catch (error) {
      showToast('Logout failed', 'error');
    }
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm"
    >
      <div className="w-full px-4">
        <div className="flex items-center justify-between h-16">
          {/* Left side */}
          <div className="flex items-center gap-3">
            {/* ✅ Toggle button - works for both sidebars */}
            <button
              onClick={toggleSidebar}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>

            {/* ✅ On chat page - show back button */}
            {isOnChatPage ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-1 text-slate-500 hover:text-primary-600 transition-colors text-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:block">Dashboard</span>
                </button>

                <div className="h-4 w-px bg-slate-300" />

                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-gradient-medical rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-white" />
                  </div>
                  <div className="hidden sm:block">
                    {currentConversation ? (
                      <div>
                        <p className="text-sm font-semibold text-slate-900 truncate max-w-[200px] md:max-w-xs">
                          {currentConversation.title}
                        </p>
                        {currentConversation.context?.disease && (
                          <p className="text-xs text-slate-500">
                            {currentConversation.context.disease}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-slate-900">
                        Research Chat
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* ✅ On other pages - show logo */
              <Link to="/dashboard" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-medical rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold gradient-text hidden sm:block">
                  Curalink
                </span>
              </Link>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Quick navigation on non-chat pages */}
            {!isOnChatPage && (
              <button
                onClick={() => navigate('/chat')}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-100 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                <span>New Chat</span>
              </button>
            )}

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 p-1.5 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <Avatar src={user?.avatar} name={user?.name} size="sm" />
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-slate-900 leading-none">
                    {user?.name?.split(' ')[0]}
                  </p>
                </div>
              </button>

              {/* Dropdown */}
              {showDropdown && (
                <>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50"
                  >
                    {/* User Info */}
                    <div className="p-3 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-900">
                        {user?.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {user?.email}
                      </p>
                    </div>

                    <div className="p-2">
                      <Link
                        to="/profile"
                        className="flex items-center gap-3 px-3 py-2 hover:bg-primary-50 rounded-lg transition-colors"
                        onClick={() => setShowDropdown(false)}
                      >
                        <User className="w-4 h-4 text-slate-500" />
                        <span className="text-sm text-slate-700">Profile</span>
                      </Link>

                      <Link
                        to="/dashboard"
                        className="flex items-center gap-3 px-3 py-2 hover:bg-primary-50 rounded-lg transition-colors"
                        onClick={() => setShowDropdown(false)}
                      >
                        <Activity className="w-4 h-4 text-slate-500" />
                        <span className="text-sm text-slate-700">Dashboard</span>
                      </Link>

                      <div className="h-px bg-slate-100 my-1" />

                      <button
                        onClick={() => {
                          setShowDropdown(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <LogOut className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-red-600">Logout</span>
                      </button>
                    </div>
                  </motion.div>

                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowDropdown(false)}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;