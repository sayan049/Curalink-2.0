import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/context/AuthContext';
import { ChatProvider } from '@/context/ChatContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import Footer from '@/components/layout/Footer';
import Toast from '@/components/ui/Toast';
import Landing from '@/pages/Landing';
import Auth from '@/pages/Auth';
import Dashboard from '@/pages/Dashboard';
import Chat from '@/pages/Chat';
import Profile from '@/pages/Profile';
import useAuthStore from '@/store/authStore';
import Trending from './pages/Trending';
import Library from './pages/Library';

// ✅ Layout with BOTH sidebars (Dashboard, Profile, etc.)
const AuthenticatedLayout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50">
      <Navbar />
      <div className="flex flex-1 pt-16">
        <Sidebar />
        <main className="flex-1 overflow-auto min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  );
};

// ✅ Layout WITHOUT main sidebar (Chat page only)
const ChatLayout = ({ children }) => {
  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50">
      <Navbar />
      <main className="flex-1 overflow-hidden mt-16">
        {children}
      </main>
    </div>
  );
};

// ✅ Public layout
const PublicLayout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
};

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Router>
      <AuthProvider>
        <ChatProvider>
          <Routes>
            {/* Public Routes */}
            <Route
              path="/"
              element={
                isAuthenticated ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <PublicLayout>
                    <Landing />
                  </PublicLayout>
                )
              }
            />
            <Route
              path="/auth"
              element={
                isAuthenticated ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <PublicLayout>
                    <Auth />
                  </PublicLayout>
                )
              }
            />
             <Route
              path="/trending"
              element={
                <ProtectedRoute>
                  <AuthenticatedLayout>
                    <Trending />
                  </AuthenticatedLayout>
                </ProtectedRoute>
              }
            />
             <Route
              path="/library"
              element={
                <ProtectedRoute>
                  <AuthenticatedLayout>
                    <Library />
                  </AuthenticatedLayout>
                </ProtectedRoute>
              }
            />

            {/* Protected Routes - WITH main sidebar */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <AuthenticatedLayout>
                    <Dashboard />
                  </AuthenticatedLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <AuthenticatedLayout>
                    <Profile />
                  </AuthenticatedLayout>
                </ProtectedRoute>
              }
            />

            {/* ✅ Chat Routes - WITHOUT main sidebar */}
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <ChatLayout>
                    <Chat />
                  </ChatLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat/:id"
              element={
                <ProtectedRoute>
                  <ChatLayout>
                    <Chat />
                  </ChatLayout>
                </ProtectedRoute>
              }
            />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          {/* Global Components */}
          <Toast />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#fff',
                color: '#0f172a',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
              },
              success: {
                iconTheme: { primary: '#10b981', secondary: '#fff' },
              },
              error: {
                iconTheme: { primary: '#ef4444', secondary: '#fff' },
              },
            }}
          />
        </ChatProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;