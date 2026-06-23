import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TicketsPage from './pages/TicketsPage';
import TicketDetailPage from './pages/TicketDetailPage';
import AdminMembersPage from './pages/AdminMembersPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-state" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-state" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <RegisterPage />
                </PublicRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/org/:org_id/tickets"
              element={
                <ProtectedRoute>
                  <TicketsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/org/:org_id/tickets/:ticket_id"
              element={
                <ProtectedRoute>
                  <TicketDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/org/:org_id/members"
              element={
                <ProtectedRoute>
                  <AdminMembersPage />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
