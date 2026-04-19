import { motion } from 'framer-motion';
import {
  Menu,
  User,
  LogOut,
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

  const handleLogout = async () => {
    try {
      await authService.logout();
      logout();
      showToast('Logged out successfully', 'success');
      navigate('/auth');
    } catch {
      showToast('Logout failed', 'error');
    }
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm"
    >
      <div className="w-full px-3 sm:px-4">
        <div className="flex items-center justify-between h-16">

          {/* ── Left side ───────────────────────────────────── */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">

            {/* Hamburger — always visible, toggles appropriate sidebar */}
            <button
              onClick={toggleSidebar}
              className="flex-shrink-0 p-2 hover:bg-slate-100 rounded-xl transition-colors"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>

            {isOnChatPage ? (
              /* ── Chat page: back button + conversation title ── */
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex-shrink-0 flex items-center gap-1 text-slate-500 hover:text-primary-600 transition-colors text-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:block">Dashboard</span>
                </button>

                <div className="h-4 w-px bg-slate-300 flex-shrink-0" />

                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex-shrink-0 w-7 h-7 bg-gradient-medical rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-white" />
                  </div>
                  {/* ✅ hidden on xs, visible sm+ — prevents title overflow */}
                  <div className="hidden sm:block min-w-0">
                    {currentConversation ? (
                      <div>
                        <p className="text-sm font-semibold text-slate-900 truncate max-w-[150px] md:max-w-xs">
                          {currentConversation.title}
                        </p>
                        {currentConversation.context?.disease && (
                          <p className="text-xs text-slate-500 truncate">
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
              /* ── Other pages: logo ──────────────────────────── */
              <Link to="/dashboard" className="flex items-center gap-2 min-w-0">
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-medical rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold gradient-text hidden sm:block">
                  Curalink
                </span>
              </Link>
            )}
          </div>

          {/* ── Right side ──────────────────────────────────── */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">

            {/* New Chat button — only on non-chat pages, md+ */}
            {!isOnChatPage && (
              <button
                onClick={() => navigate('/chat')}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-100 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                <span>New Chat</span>
              </button>
            )}

            {/* ── User Menu ──────────────────────────────────── */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 p-1.5 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <Avatar src={user?.avatar} name={user?.name} size="sm" />
                {/* Name hidden on mobile — shown md+ */}
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-slate-900 leading-none">
                    {user?.name?.split(' ')[0]}
                  </p>
                </div>
              </button>

              {/* ── Dropdown menu ──────────────────────────── */}
              {showDropdown && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowDropdown(false)}
                  />

                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    // ✅ right-0 always — prevents dropdown going off right edge on mobile
                    className="absolute right-0 mt-2 w-52 sm:w-56 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50"
                  >
                    {/* User info */}
                    <div className="p-3 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-900 truncate">
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