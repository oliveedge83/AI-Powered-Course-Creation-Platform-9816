import React, { useEffect } from 'react';
import {HashRouter as Router, Routes, Route, Navigate} from 'react-router-dom';
import {Toaster} from 'react-hot-toast';
import {motion, AnimatePresence} from 'framer-motion';
import {useAuthStore} from './stores/authStore';
import {GenerationProvider} from './contexts/GenerationContext';
import Navbar from './components/layout/Navbar';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/Dashboard';
import ProgramInitiation from './pages/ProgramInitiation';
import ReviewDashboard from './pages/ReviewDashboard';
import Settings from './pages/Settings';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import SystemStats from './pages/admin/SystemStats';
import LoadingSpinner from './components/ui/LoadingSpinner';
import StatusBar from './components/ui/StatusBar';
import { getCurrentUser } from './services/supabaseService';

function App() {
  const {user, loading, login, setLoading, isSuperAdmin} = useAuthStore();
  
  // Check if user is authenticated on app start
  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          login(currentUser);
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Router>
      <GenerationProvider>
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
          <AnimatePresence mode="wait">
            {user ? (
              <motion.div
                key="authenticated"
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                exit={{opacity: 0}}
                className="min-h-screen"
              >
                <Navbar />
                <main className="pt-16">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/create" element={<ProgramInitiation />} />
                    <Route path="/review/:programId" element={<ReviewDashboard />} />
                    <Route path="/settings" element={<Settings />} />
                    
                    {/* Admin Routes - Protected */}
                    {isSuperAdmin() && (
                      <>
                        <Route path="/admin" element={<AdminDashboard />} />
                        <Route path="/admin/users" element={<UserManagement />} />
                        <Route path="/admin/stats" element={<SystemStats />} />
                      </>
                    )}
                    
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>
              </motion.div>
            ) : (
              <motion.div
                key="unauthenticated"
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                exit={{opacity: 0}}
              >
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
              </motion.div>
            )}
          </AnimatePresence>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
        </div>
      </GenerationProvider>
    </Router>
  );
}

export default App;