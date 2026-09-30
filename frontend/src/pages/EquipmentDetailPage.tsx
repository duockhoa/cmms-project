import React from 'react';
import { StatusBadge } from '../components/common/Badge';
import { Cpu } from 'lucide-react';
import { OverviewTab } from '../components/equipment/OverviewTab';
import { RepairHistoryTab } from '../components/equipment/RepairHistoryTab';
import { MaintenanceSchedulesTab } from '../components/equipment/MaintenanceSchedulesTab';
import { SparePartsTab } from '../components/equipment/SparePartsTab';
import { DocumentsTab } from '../components/equipment/DocumentsTab';
import { QRCodeTab } from '../components/equipment/QRCodeTab';
import { LogsTab } from '../components/equipment/LogsTab';
import { OperationParametersTab } from '../components/equipment/OperationParametersTab';
import { EquipmentOperationLogsTab } from '../components/equipment/EquipmentOperationLogsTab';
import { FunctionalUnitsTab } from '../components/equipment/FunctionalUnitsTab';
import { EquipmentSpecModal } from '../components/equipment/EquipmentSpecModal';
import { EquipmentPartModal } from '../components/equipment/EquipmentPartModal';
import { DocumentPreviewModal } from '../components/equipment/DocumentPreviewModal';
import { KpiCard, PageHeader, Tabs } from '../components/common';
import { useEquipmentDetail } from '../hooks/useEquipmentDetail';

interface EquipmentDetailPageProps {
  item: any;
  onBack?: () => void;
}

export const EquipmentDetailPage: React.FC<EquipmentDetailPageProps> = ({ item, onBack }) => {
  const {
    activeSubTab,
    setActiveSubTab,
    subTabs,
    data,
    workOrdersList,
    schedulesList,
    sparePartsList,
    attachmentsList,
    parsedSpecs,
    logsList,
    showSpecModal,
    setShowSpecModal,
    tempSpecs,
    setTempSpecs,
    openSpecsModal,
    handleAddSpec,
    showPartModal,
    setShowPartModal,
    selectedPartId,
    setSelectedPartId,
    partMinQty,
    setPartMinQty,
    handleLinkPart,
    previewFileUrl,
    setPreviewFileUrl,
    previewFileName,
    setPreviewFileName,
    handleFileUpload,
    fetchDetail,
    API_BASE,
  } = useEquipmentDetail(item?.id);

  return (
    <div>
      <PageHeader
        title={data.name}
        subtitle={`Mã: ${data.code}${data.accountingCode ? ` | Phụ (KT): ${data.accountingCode}` : ''} | Số Serial: ${data.serialNumber || '---'}`}
        breadcrumb={[{ label: 'Thiết bị', path: '/equipment' }, { label: data.code }]}
        badge={(
          <>
            <span style={{ display: 'inline-flex', color: '#2563eb' }}><Cpu size={22} /></span>
            <StatusBadge status={data.status} />
          </>
        )}
      />

      {/* Quick Info Grid */}
      <div className="kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Bộ phận quản lý', value: data.department || 'Chưa phân công' },
          { label: 'Ngày lắp đặt', value: data.purchaseDate ? new Date(data.purchaseDate).toLocaleDateString('vi-VN') : '---' },
          { label: 'Serial Number', value: data.serialNumber || '---' },
          { label: 'Vị trí', value: data.location || '---' },
          { label: 'Hạn bảo hành', value: data.warrantyPeriod || '---' },
        ].map((info) => (
          <KpiCard key={info.label} title={info.label} value={info.value} />
        ))}
      </div>

      {/* Tabs Row */}
      <div className="card mb-4" style={{ padding: '0 20px' }}>
        <Tabs
          items={subTabs.map((tab) => ({ key: tab, label: tab }))}
          activeKey={activeSubTab}
          onChange={setActiveSubTab}
        />

        {/* Tab content */}
        {activeSubTab === 'Tổng quan' && (
          <OverviewTab parsedSpecs={parsedSpecs} openSpecsModal={openSpecsModal} />
        )}
        {activeSubTab === 'Cụm chức năng chính' && (
          <FunctionalUnitsTab 
            equipmentId={data.id} 
            equipmentCode={data.code} 
            equipmentName={data.name} 
            onUnitsUpdated={fetchDetail}
          />
        )}
        {activeSubTab === 'Lịch sử sửa chữa' && (
          <RepairHistoryTab workOrdersList={workOrdersList} />
        )}
        {activeSubTab === 'Lịch bảo trì' && (
          <MaintenanceSchedulesTab schedulesList={schedulesList} />
        )}
        {activeSubTab === 'Phụ tùng' && (
          <SparePartsTab sparePartsList={sparePartsList} setShowPartModal={setShowPartModal} />
        )}
        {activeSubTab === 'SOP & Tài liệu' && (
          <DocumentsTab 
            attachmentsList={attachmentsList} 
            handleFileUpload={handleFileUpload} 
            setPreviewFileUrl={setPreviewFileUrl}
            setPreviewFileName={setPreviewFileName}
            API_BASE={API_BASE}
          />
        )}
        {activeSubTab === 'Mã QR' && (
          <QRCodeTab data={data} />
        )}
        {activeSubTab === 'Nhật ký' && (
          <LogsTab logsList={logsList} />
        )}
        {activeSubTab === 'Thông số vận hành' && (
          <OperationParametersTab equipmentId={data.id} />
        )}
        {activeSubTab === 'Sổ vận hành' && (
          <EquipmentOperationLogsTab equipmentId={data.id} />
        )}
      </div>

      {/* Modal - Thêm/Sửa Thông Số Kỹ Thuật Nhiều Dòng */}
      <EquipmentSpecModal
        show={showSpecModal}
        onClose={() => setShowSpecModal(false)}
        tempSpecs={tempSpecs}
        setTempSpecs={setTempSpecs}
        onSubmit={handleAddSpec}
      />

      {/* Modal - Liên kết Phụ tùng */}
      <EquipmentPartModal
        show={showPartModal}
        onClose={() => setShowPartModal(false)}
        selectedPartId={selectedPartId}
        setSelectedPartId={setSelectedPartId}
        partMinQty={partMinQty}
        setPartMinQty={setPartMinQty}
        onSubmit={handleLinkPart}
      />

      {/* Modal - Preview Tài liệu SOP */}
      <DocumentPreviewModal
        previewFileUrl={previewFileUrl}
        previewFileName={previewFileName}
        onClose={() => setPreviewFileUrl(null)}
      />
    </div>
  );
};
