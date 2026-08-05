import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { Dashboard } from './pages/Dashboard';
import { EquipmentPage } from './pages/EquipmentPage';
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
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
      <div className={`app-container ${!sidebarOpen ? 'sidebar-collapsed' : ''}`}>
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          collapsed={!sidebarOpen} 
          onCloseSidebar={() => setSidebarOpen(false)}
        />
        
        <div className="main-content">
          <Navbar theme={theme} setTheme={setTheme} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          
          <main className="page-body">
            {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
            {activeTab === 'equipment' && <EquipmentPage />}
            {activeTab === 'work-orders' && <WorkOrdersPage />}
            {activeTab === 'checklists' && <ChecklistsPage />}
            {activeTab === 'spare-parts' && <SparePartsPage />}
            {activeTab === 'reports' && <ReportsPage />}
            {activeTab === 'users' && <UsersPage />}
            {activeTab === 'maintenance' && <MaintenancePage />}
            {activeTab === 'technicians' && <TechniciansPage />}
            {activeTab === 'settings' && <SettingsPage />}
            {activeTab === 'about' && <AboutPage setActiveTab={setActiveTab} />}
          </main>
        </div>
      </div>
    </QueryClientProvider>
  );
}

export default App;
