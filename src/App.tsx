import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ThemeProvider } from '@/lib/theme';
import { DatasetProvider } from '@/lib/dataset-context';
import LandingPage from '@/pages/LandingPage';
import AuthPage from '@/pages/AuthPage';
import DashboardLayout from '@/components/DashboardLayout';
import Dashboard from '@/pages/Dashboard';
import Customers from '@/pages/Customers';
import CustomerDetail from '@/pages/CustomerDetail';
import Segmentation from '@/pages/Segmentation';
import ChurnPrediction from '@/pages/ChurnPrediction';
import Loyalty from '@/pages/Loyalty';
import Sentiment from '@/pages/Sentiment';
import Campaigns from '@/pages/Campaigns';
import AIAssistant from '@/pages/AIAssistant';
import Reports from '@/pages/Reports';
import Notifications from '@/pages/Notifications';
import Datasets from '@/pages/Datasets';
import Settings from '@/pages/Settings';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (!session) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { session, loading } = useAuth();
  if (loading) return null;

  return (
    <Routes>
      <Route path="/" element={session ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
      <Route path="/auth" element={session ? <Navigate to="/dashboard" replace /> : <AuthPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Dashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/customers"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Customers />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/customers/:id"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <CustomerDetail />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/segmentation"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Segmentation />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/churn"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <ChurnPrediction />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/loyalty"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Loyalty />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sentiment"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Sentiment />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/campaigns"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Campaigns />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assistant"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <AIAssistant />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Reports />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Notifications />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/datasets"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Datasets />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Settings />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DatasetProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </DatasetProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
