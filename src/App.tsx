/**
 * App.tsx
 * -----------------------------------------------
 * Root application component. Wraps providers and
 * defines all routes. SessionProvider enables
 * session intelligence across the entire app.
 * -----------------------------------------------
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CVProvider } from './contexts/CVContext';
import { SessionProvider } from './contexts/SessionContext';
import { Header } from './components/layout/Header';
import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';
import { CVEditor } from './components/editor/CVEditor';
import { PreviewPage } from './pages/PreviewPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { EmbeddedBrowser } from './components/browser/EmbeddedBrowser';
import { InterruptionToast } from './components/ui/InterruptionToast';
import { RecoveryScreen } from './components/recovery/RecoveryScreen';
import { WelcomeBackGuide } from './components/recovery/WelcomeBackGuide';
import { RouteTracker } from './components/recovery/RouteTracker';

// -- Protected Route wrapper --
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// -- Routes --
function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Router>
      <div className="min-h-screen bg-gray-900">
        {/* Invisible route change tracker */}
        <RouteTracker />

        <Header />

        <Routes>
          {/* Public */}
          <Route
            path="/"
            element={
              isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />
            }
          />

          {/* Protected */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/editor"
            element={
              <ProtectedRoute>
                <CVEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/preview"
            element={
              <ProtectedRoute>
                <PreviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-assistant"
            element={
              <ProtectedRoute>
                <AIAssistantPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/applications"
            element={
              <ProtectedRoute>
                <EmbeddedBrowser />
              </ProtectedRoute>
            }
          />
        </Routes>

        {/* Global overlays */}
        <WelcomeBackGuide />
        <RecoveryScreen />
        <InterruptionToast />
      </div>
    </Router>
  );
}

// -- App root with all providers --
function App() {
  return (
    <AuthProvider>
      <CVProvider>
        <SessionProvider>
          <AppRoutes />
        </SessionProvider>
      </CVProvider>
    </AuthProvider>
  );
}

export default App;
