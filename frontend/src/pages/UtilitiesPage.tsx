import React, { lazy, Suspense } from 'react';
import { BarChart3, Calendar, Cpu, FileText, QrCode, RefreshCw, Settings, Zap } from 'lucide-react';
import { PageHeader, Tabs } from '../components/common';
import { UtilityOverviewTab } from '../components/utilities/UtilityOverviewTab';
import { UtilityPointsTab } from '../components/utilities/UtilityPointsTab';
import { RecordReadingModal } from '../components/utilities/RecordReadingModal';
import { UtilityReadingsTab } from '../components/utilities/UtilityReadingsTab';
import { UtilityPointModal } from '../components/utilities/UtilityPointModal';
import { UtilityQrPrintModal } from '../components/utilities/UtilityQrPrintModal';
import { UtilityStatusLogsTab } from '../components/utilities/UtilityStatusLogsTab';
import { VoidReadingModal } from '../components/utilities/VoidReadingModal';
import { useUtilitiesPage } from '../hooks/useUtilitiesPage';
import './utilities.css';

const UtilityCumulativeTab = lazy(() => import('../components/utilities/UtilityCumulativeTab').then(module => ({ default: module.UtilityCumulativeTab })));

export const UtilitiesPage: React.FC = () => {
  const {
    navigate,
    activeTab,
    setActiveTab,
    loadData,
    loading,
    filteredReadings,
    statusLogs,
    points,
    utilityViewModel,
    showPointModal,
    printPoint,
    voidModalReading,
    editModalReading,
  } = useUtilitiesPage();
  return (
    <div className="util-page-root">
      {/* 1. Header Trang & Nút Quét QR */}
      <PageHeader
        className="util-page-header"
        title="TIỆN ÍCH & NĂNG LƯỢNG"
        subtitle="Theo dõi Điện, Nước và Giám sát Bật/Tắt hệ thống phụ trợ."
        badge={<Zap size={22} color="#eab308" className="util-title-icon" />}
        actions={(
          <>
          {/* Nút Quét QR Lớn Nổi Bật cho Nhân Viên */}
          <button
            onClick={() => navigate('/utilities/scan')}
            className="util-scan-btn"
          >
            <QrCode size={18} />
            <span>QUÉT MÃ QR ĐO ĐẾM</span>
          </button>

          <button
            onClick={loadData}
            title="Làm mới dữ liệu"
            className="util-refresh-btn"
          >
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          </button>
          </>
        )}
      />

      {/* 2. Thanh Tabs Điều Hướng */}
      <Tabs
        className="util-tabs-wrapper"
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as typeof activeTab)}
        items={[
          { key: 'overview', label: 'Tổng Quan & Giám Sát', shortLabel: 'Tổng Quan', icon: BarChart3 },
          { key: 'readings', label: 'Sổ Ghi Điện & Nước', shortLabel: 'Sổ Ghi', icon: FileText, count: filteredReadings.length },
          { key: 'statusLogs', label: 'Lịch Sử Bật / Tắt', shortLabel: 'Bật / Tắt', icon: Cpu, count: statusLogs.length },
          { key: 'points', label: 'Danh Mục Điểm Đo & Tem', shortLabel: 'Điểm Đo', icon: Settings, count: points.length },
          { key: 'cumulative', label: 'Báo Cáo Tích Lũy Điện / Nước', shortLabel: 'Báo Cáo Kỳ', icon: Calendar },
        ]}
      />

      {/* 3. NỘI DUNG THEO TAB */}

      {/* TAB 1: TỔNG QUAN & GIÁM SÁT */}
      {activeTab === 'overview' && <UtilityOverviewTab model={utilityViewModel} />}

      {/* TAB 2: SỔ GHI ĐIỆN & NƯỚC */}
      {activeTab === 'readings' && <UtilityReadingsTab model={utilityViewModel} />}

      {/* TAB 3: LỊCH SỬ BẬT / TẮT HỆ THỐNG */}
      {activeTab === 'statusLogs' && <UtilityStatusLogsTab model={utilityViewModel} />}

      {/* TAB 4: DANH MỤC ĐIỂM ĐO & IN TEM QR */}
      {activeTab === 'points' && <UtilityPointsTab model={utilityViewModel} />}

      {/* TAB 5: BÁO CÁO TÍCH LŨY THEO KỲ (ĐIỆN & NƯỚC) */}
      {activeTab === 'cumulative' && (
        <Suspense fallback={<div className="util-loading">Đang tải báo cáo tích lũy...</div>}>
          <UtilityCumulativeTab model={utilityViewModel} />
        </Suspense>
      )}

      {/* MODAL: THÊM / SỬA ĐIỂM ĐO */}
      {showPointModal && <UtilityPointModal model={utilityViewModel} />}

      {/* MODAL: PREVIEW IN TEM MÃ QR */}
      {printPoint && <UtilityQrPrintModal model={utilityViewModel} />}

      {/* MODAL: ĐÁNH DẤU HỦY KẾT QUẢ GHI SAI (AUDIT TRAIL) */}
      {/* MODAL: HỦY KẾT QUẢ SAI */}
      {voidModalReading && <VoidReadingModal model={utilityViewModel} />}

      {/* MODAL: CHỈNH SỬA BẢN GHI CHỈ SỐ */}
      {editModalReading && <RecordReadingModal model={utilityViewModel} />}

    </div>
  );
};
