import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { Dashboard } from './pages/Dashboard';
import { EquipmentPage } from './pages/EquipmentPage';
import { RequestsPage } from './pages/RequestsPage';
import { WorkOrdersPage } from './pages/WorkOrdersPage';
import { ChecklistsPage } from './pages/ChecklistsPage';
import { ChecklistDetailPage } from './pages/ChecklistDetailPage';
import { SparePartsPage } from './pages/SparePartsPage';
import { ReportsPage } from './pages/ReportsPage';
import { MaintenancePage } from './pages/MaintenancePage';
import { SettingsPage } from './pages/SettingsPage';
import { AboutPage } from './pages/AboutPage';
import { OperationLogFormPage } from './pages/OperationLogFormPage';
import { OperationLogsPage } from './pages/OperationLogsPage';
import { LoginPage } from './pages/LoginPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ToastProvider } from './components/common/Toast';

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

  // SSO Token Interceptor — accept token from query param (backward compat with HRM SSO)
  const params = new URLSearchParams(window.location.search);
  const queryToken = params.get('token');
  if (queryToken) {
    localStorage.setItem('accessToken', queryToken);
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  const token = localStorage.getItem('accessToken');

  if (!token) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
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
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/equipment" element={<EquipmentPage />} />
            <Route path="/equipment/:id" element={<EquipmentPage />} />
            <Route path="/requests" element={<RequestsPage />} />
            <Route path="/work-orders" element={<WorkOrdersPage />} />
            <Route path="/checklists" element={<ChecklistsPage />} />
            <Route path="/checklists/:id" element={<ChecklistDetailPage />} />
            <Route path="/spare-parts" element={<SparePartsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/maintenance" element={<MaintenancePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/operation-logs" element={<OperationLogsPage />} />
            <Route path="/equipment/:id/operation-log-form" element={<OperationLogFormPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
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
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/*" element={
                <RequireAuth>
                  <AppLayout />
                </RequireAuth>
              } />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;

