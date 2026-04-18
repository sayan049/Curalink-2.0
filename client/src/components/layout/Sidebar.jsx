import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  MessageSquare,
  TrendingUp,
  BookOpen,
  User,
  X,
  Activity,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import useUIStore from '@/store/uiStore';
import { cn } from '@/utils/cn';

const Sidebar = () => {
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const location = useLocation();

  // ✅ Don't render on chat pages - chat has its own sidebar
  if (location.pathname.startsWith('/chat')) {
    return null;
  }

  const menuItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: MessageSquare, label: 'Chat', path: '/chat' },
    { icon: TrendingUp, label: 'Trending', path: '/trending' },
    { icon: BookOpen, label: 'Library', path: '/library' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ✅ Desktop Sidebar - permanent on large screens */}
      <aside className="hidden lg:flex flex-col w-56 flex-shrink-0 bg-white/70 backdrop-blur-md border-r border-slate-200 min-h-[calc(100vh-4rem)]">
        <SidebarContent
          menuItems={menuItems}
          location={location}
          onClose={() => {}}
          isDesktop
        />
      </aside>

      {/* ✅ Mobile Sidebar - slide in/out */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -256 }}
            animate={{ x: 0 }}
            exit={{ x: -256 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-16 left-0 h-[calc(100vh-4rem)] w-56 z-50 bg-white border-r border-slate-200 shadow-xl lg:hidden"
          >
            <SidebarContent
              menuItems={menuItems}
              location={location}
              onClose={() => setSidebarOpen(false)}
              showClose
            />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

const SidebarContent = ({ menuItems, location, onClose, showClose, isDesktop }) => {
  const { setSidebarOpen } = useUIStore();

  return (
    <div className="flex flex-col h-full">
      {/* Mobile Header */}
      {showClose && (
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-medical rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold gradient-text">Curalink</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path ||
            (item.path === '/chat' && location.pathname.startsWith('/chat'));

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => {
                if (!isDesktop) onClose();
              }}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
                isActive
                  ? 'bg-gradient-medical text-white shadow-md shadow-primary-500/20'
                  : 'text-slate-600 hover:bg-primary-50 hover:text-primary-700'
              )}
            >
              <Icon
                className={cn(
                  'w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110',
                  isActive ? 'text-white' : 'text-slate-500'
                )}
              />
              <span className="text-sm font-medium">{item.label}</span>

              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="ml-auto w-1.5 h-1.5 bg-white rounded-full"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Status */}
      <div className="p-3 border-t border-slate-200">
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-slate-600 font-medium">AI Online</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;