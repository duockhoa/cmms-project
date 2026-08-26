import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

function LoginRedirect() {
  useEffect(() => {
    const authUrl = import.meta.env.VITE_HRM_ROOT_URL || 'https://hrm.example.com';
    const redirectUrl = encodeURIComponent(window.location.origin);
    window.location.href = `${authUrl}/login?redirect=${redirectUrl}`;
  }, []);
  return null;
}

export function App() {
  const [theme, setTheme] = useState('light');
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // SSO Token Interceptor
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('access_token', token);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      // Check if logged in, if not, redirect to HRM
      const currentToken = localStorage.getItem('access_token');
      if (!currentToken && window.location.pathname !== '/login') {
        const authUrl = import.meta.env.VITE_HRM_ROOT_URL || 'https://hrm.example.com';
        const redirectUrl = encodeURIComponent(window.location.href);
        window.location.href = `${authUrl}/login?redirect=${redirectUrl}`;
      }
    }
  }, []);

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
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <ToastProvider>
        <BrowserRouter>
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
                <Route path="/login" element={<LoginRedirect />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </div>
      </BrowserRouter>
        </ToastProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
