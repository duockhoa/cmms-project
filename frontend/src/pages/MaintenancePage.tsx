import React, { useState } from 'react';
import { Calendar, History } from 'lucide-react';
import { PageHeader, Tabs } from '../components/common';
import { MonthlyMaintenanceTab } from '../components/maintenance/MonthlyMaintenanceTab';
import { MaintenanceHistoryTab } from '../components/maintenance/MaintenanceHistoryTab';
import { useMaintenancePage } from '../hooks/useMaintenancePage';

export const MaintenancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'monthly' | 'history'>('monthly');

  const {
    equipmentList,
    technicians,
    checklistTemplates,
    history,
    loadingHistory,
    page,
    setPage,
    limit,
    total,
    totalPages,
    totalCost,
    totalHours,
    loadHistory,
  } = useMaintenancePage();

  return (
    <div>
      <PageHeader
        title="Lịch bảo trì"
        subtitle="Danh sách các công việc bảo trì định kỳ trong tháng, việc bảo trì đột xuất và tra cứu lịch sử thực hiện"
      />

      {/* Tabs Switcher */}
      <Tabs
        variant="pills"
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as 'monthly' | 'history')}
        items={[
          { key: 'monthly', label: 'Lịch bảo trì trong tháng', shortLabel: 'Lịch tháng', icon: Calendar },
          { key: 'history', label: 'Lịch sử thực hiện & Chi phí', shortLabel: 'Lịch sử', icon: History, count: total },
        ]}
        style={{ marginBottom: '20px' }}
      />

      {activeTab === 'monthly' && (
        <MonthlyMaintenanceTab
          equipmentList={equipmentList}
          technicians={technicians}
          checklistTemplates={checklistTemplates}
          onRefreshHistory={loadHistory}
        />
      )}

      {activeTab === 'history' && (
        <MaintenanceHistoryTab
          history={history}
          loading={loadingHistory}
          page={page}
          pageSize={limit}
          total={total}
          totalPages={totalPages}
          totalCost={totalCost}
          totalHours={totalHours}
          onPageChange={setPage}
        />
      )}
    </div>
  );
};
