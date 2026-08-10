import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { Dashboard } from './pages/Dashboard';
import { EquipmentPage } from './pages/EquipmentPage';
import { RequestsPage } from './pages/RequestsPage';
import { WorkOrdersPage } from './pages/WorkOrdersPage';
import { ChecklistsPage } from './pages/ChecklistsPage';
import { SparePartsPage } from './pages/SparePartsPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';
import { MaintenancePage } from './pages/MaintenancePage';
import { TechniciansPage } from './pages/TechniciansPage';
import { SettingsPage } from './pages/SettingsPage';
import { AboutPage } from './pages/AboutPage';
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

export function App() {
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
                <Route path="/spare-parts" element={<SparePartsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/maintenance" element={<MaintenancePage />} />
                <Route path="/technicians" element={<TechniciansPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/about" element={<AboutPage />} />
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
