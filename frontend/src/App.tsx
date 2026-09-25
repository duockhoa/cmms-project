import React, { useState, useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ToastProvider } from './components/common/Toast';
import { extractAndSaveTokensFromUrl, getAccessToken } from './utils/authStorage';
import { ProtectedRoute, SmartHomeRoute } from './components/common/ProtectedRoute';

// Lazy loading screen-by-screen code splitting
const Dashboard = React.lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const EquipmentPage = React.lazy(() => import('./pages/EquipmentPage').then(m => ({ default: m.EquipmentPage })));
const RequestsPage = React.lazy(() => import('./pages/RequestsPage').then(m => ({ default: m.RequestsPage })));
const WorkOrdersPage = React.lazy(() => import('./pages/WorkOrdersPage').then(m => ({ default: m.WorkOrdersPage })));
const ChecklistsPage = React.lazy(() => import('./pages/ChecklistsPage').then(m => ({ default: m.ChecklistsPage })));
const ChecklistDetailPage = React.lazy(() => import('./pages/ChecklistDetailPage').then(m => ({ default: m.ChecklistDetailPage })));
const SparePartsPage = React.lazy(() => import('./pages/SparePartsPage').then(m => ({ default: m.SparePartsPage })));
const ReportsPage = React.lazy(() => import('./pages/ReportsPage').then(m => ({ default: m.ReportsPage })));
const MaintenancePage = React.lazy(() => import('./pages/MaintenancePage').then(m => ({ default: m.MaintenancePage })));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const AboutPage = React.lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));
const FeedbacksPage = React.lazy(() => import('./pages/FeedbacksPage').then(m => ({ default: m.FeedbacksPage })));
const OperationLogFormPage = React.lazy(() => import('./pages/OperationLogFormPage').then(m => ({ default: m.OperationLogFormPage })));
const OperationLogsPage = React.lazy(() => import('./pages/OperationLogsPage').then(m => ({ default: m.OperationLogsPage })));
const UtilitiesPage = React.lazy(() => import('./pages/UtilitiesPage').then(m => ({ default: m.UtilitiesPage })));
const UtilityScanPage = React.lazy(() => import('./pages/UtilityScanPage').then(m => ({ default: m.UtilityScanPage })));
const LoginPage = React.lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));

// Sleek Loading Fallback
function PageLoadingFallback() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: '12px',
        color: 'var(--text-secondary, #64748b)',
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          border: '3px solid #e2e8f0',
          borderTopColor: 'var(--accent-blue, #2563eb)',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }}
      />
      <span style={{ fontSize: '13px', fontWeight: 500 }}>Đang tải màn hình...</span>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Guard: redirect to /login if not authenticated
function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  // Intercept incoming tokens from query param or hash fragment (e.g., from Central Portal / SSO)
  extractAndSaveTokensFromUrl();

  // Check active token from localStorage or shared root domain cookie (*.dkpharma.io.vn)
  const token = getAccessToken();

  if (!token) {
    const redirectTarget = location.pathname + location.search;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirectTarget)}`} replace />;
  }

  return <>{children}</>;
}

function AppLayout() {
  const [theme, setTheme] = useState('light');
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`app-container ${!sidebarOpen ? 'sidebar-collapsed' : ''}`}>
      <Sidebar 
        collapsed={!sidebarOpen} 
        onCloseSidebar={() => setSidebarOpen(false)}
      />
      
      <div className="main-content">
        <Navbar theme={theme} setTheme={setTheme} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="page-body">
          <Suspense fallback={<PageLoadingFallback />}>
            <Routes>
              {/* Trang chủ với điều hướng thông minh */}
              <Route path="/" element={<SmartHomeRoute dashboardComponent={<Dashboard />} />} />

              {/* Các route yêu cầu quyền xem tương ứng */}
              <Route path="/equipment" element={<ProtectedRoute permission="equipment:view"><EquipmentPage /></ProtectedRoute>} />
              <Route path="/equipment/:id" element={<ProtectedRoute permission="equipment:view"><EquipmentPage /></ProtectedRoute>} />
              <Route path="/requests" element={<ProtectedRoute permission="requests:view"><RequestsPage /></ProtectedRoute>} />
              <Route path="/work-orders" element={<ProtectedRoute permission="work_orders:view"><WorkOrdersPage /></ProtectedRoute>} />
              <Route path="/checklists" element={<ProtectedRoute permission="checklists:view"><ChecklistsPage /></ProtectedRoute>} />
              <Route path="/checklists/:id" element={<ProtectedRoute permission="checklists:view"><ChecklistDetailPage /></ProtectedRoute>} />
              <Route path="/spare-parts" element={<ProtectedRoute permission="inventory:view"><SparePartsPage /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute permission="reports:view"><ReportsPage /></ProtectedRoute>} />
              <Route path="/maintenance" element={<ProtectedRoute permission="schedules:view"><MaintenancePage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute permission="settings:view"><SettingsPage /></ProtectedRoute>} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/feedbacks" element={<ProtectedRoute permission="feedbacks:view"><FeedbacksPage /></ProtectedRoute>} />
              <Route path="/operation-logs" element={<ProtectedRoute permission="operation_logs:view"><OperationLogsPage /></ProtectedRoute>} />
              <Route path="/equipment/:id/operation-log-form" element={<ProtectedRoute permission="operation_logs:view"><OperationLogFormPage /></ProtectedRoute>} />
              <Route path="/utilities" element={<ProtectedRoute permission="utilities:view"><UtilitiesPage /></ProtectedRoute>} />
              <Route path="/utilities/scan" element={<ProtectedRoute permission="utilities:view"><UtilityScanPage /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <ToastProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoadingFallback />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/*" element={
                  <RequireAuth>
                    <AppLayout />
                  </RequireAuth>
                } />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ToastProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
