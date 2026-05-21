import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-primary">
        <span className="w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin"></span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  const { checkAuth, logout, user, isLoading } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary text-text-primary">
        <div className="text-center">
          <span className="block w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></span>
          <p className="text-text-secondary text-sm font-mono tracking-widest uppercase">Initialisation...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <main className="min-h-screen flex flex-col items-center justify-center bg-bg-primary text-text-primary px-6">
                <div className="text-center max-w-xl">
                  <p className="text-brand-gold font-mono text-sm tracking-widest uppercase mb-3">
                    FIFA Ticketing Hub 2026
                  </p>
                  <h1 className="text-4xl sm:text-6xl font-black leading-tight mb-4">
                    Catalogue Matchs
                  </h1>
                  <p className="text-text-secondary mb-6">
                    Bienvenue, <span className="font-bold text-text-primary">{user?.email}</span> !
                  </p>
                  <button
                    onClick={logout}
                    className="px-6 py-2 bg-bg-tertiary hover:bg-bg-elevated border border-border-light rounded-full text-sm font-medium transition-all duration-150 active:scale-95"
                  >
                    Se déconnecter
                  </button>
                </div>
              </main>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

