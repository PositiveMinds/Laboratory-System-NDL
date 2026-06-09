import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Component, ReactNode } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 16, padding: 24 }}>
          <h2 style={{ color: '#78001d' }}>Something went wrong</h2>
          <p style={{ color: '#584141', maxWidth: 400, textAlign: 'center' }}>{(this.state.error as Error).message}</p>
          <button className="btn btn-primary" onClick={() => this.setState({ error: null })}>Try Again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
import { ThemeProvider } from './contexts/ThemeContext';
import { AssetsProvider } from './contexts/AssetsContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import NewOrder from './pages/NewOrder';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Billing from './pages/Billing';
import Results from './pages/Results';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import TestManagement from './pages/TestManagement';
import FAQ from './pages/FAQ';
import About from './pages/About';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="loading-overlay" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
        <span>Loading...</span>
      </div>
    );
  }
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="loading-overlay" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }
  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="patients" element={<Patients />} />
        <Route path="test-management" element={<TestManagement />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orders/new" element={<NewOrder />} />
        <Route path="orders/:id" element={<OrderDetail />} />
        <Route path="billing" element={<Billing />} />
        <Route path="results" element={<Results />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        <Route path="faq" element={<FAQ />} />
        <Route path="about" element={<About />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <AssetsProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </AssetsProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
