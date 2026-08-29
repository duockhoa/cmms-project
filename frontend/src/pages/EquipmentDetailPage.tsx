import React, { useState, useEffect } from 'react';
import { StatusBadge } from '../components/common/Badge';
import { 
  ArrowLeft, Cpu, Edit, Plus, Wrench, Settings, FileText, BookOpen, Clock, Activity, MessageSquare, Calendar, X, Eye, Download 
} from 'lucide-react';
import { useToast } from '../components/common/Toast';
import { OverviewTab } from '../components/equipment/OverviewTab';
import { RepairHistoryTab } from '../components/equipment/RepairHistoryTab';
import { MaintenanceSchedulesTab } from '../components/equipment/MaintenanceSchedulesTab';
import { SparePartsTab } from '../components/equipment/SparePartsTab';
import { DocumentsTab } from '../components/equipment/DocumentsTab';
import { QRCodeTab } from '../components/equipment/QRCodeTab';
import { LogsTab } from '../components/equipment/LogsTab';
import { OperationParametersTab } from '../components/equipment/OperationParametersTab';
import { EquipmentOperationLogsTab } from '../components/equipment/EquipmentOperationLogsTab';

import { api } from '../services/api';

const API_BASE = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

interface EquipmentDetailPageProps {
  item: any;
  onBack: () => void;
}

export const EquipmentDetailPage: React.FC<EquipmentDetailPageProps> = ({ item, onBack }) => {
  const [activeSubTab, setActiveSubTab] = useState('Tổng quan');
  const [loading, setLoading] = useState(true);
  const [detailData, setDetailData] = useState<any>(null);
  const toast = useToast();

  // States for Specs management (Dynamic multi-row inputs)
  const [showSpecModal, setShowSpecModal] = useState(false);
  const [tempSpecs, setTempSpecs] = useState<{ key: string; val: string }[]>([]);

  // States for Spare Parts mapping
  const [showPartModal, setShowPartModal] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partMinQty, setPartMinQty] = useState(1);

  // States for SOP Preview
  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState('');

  const fetchDetail = () => {
    setLoading(true);
    api.getEquipmentById(item.id)
      .then(data => {
        setDetailData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDetail();
  }, [item.id]);

  const subTabs = ['Tổng quan', 'Lịch sử sửa chữa', 'Lịch bảo trì', 'Phụ tùng', 'SOP & Tài liệu', 'Mã QR', 'Thông số vận hành', 'Sổ vận hành', 'Nhật ký'];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', fontSize: '15px', color: 'var(--text-secondary)' }}>
        Đang tải dữ liệu thiết bị...
      </div>
    );
  }

  const data = detailData || item;
  const workOrdersList = data.workOrders || [];
  const schedulesList = data.schedules || [];
  const sparePartsList = data.spareParts || [];
  const attachmentsList = data.attachments || [];

  // Parse specs dynamically
  let parsedSpecs: Record<string, string> = {};
  try {
    if (data.specs) {
      parsedSpecs = JSON.parse(data.specs);
    }
  } catch (e) {
    parsedSpecs = { 'Thông số': data.specs };
  }

  const handleAddSpec = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Construct new specs from temporary inputs
    const newSpecs: Record<string, string> = {};
    for (const item of tempSpecs) {
      if (item.key.trim() && item.val.trim()) {
        newSpecs[item.key.trim()] = item.val.trim();
      }
    }

    try {
      await api.updateEquipment(data.id, {
        expectedVersion: data.version,
        specs: JSON.stringify(newSpecs)
      });

      setShowSpecModal(false);
      toast.success('Thành công', 'Đã cập nhật thông số thiết bị.');
      fetchDetail();
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Lỗi cập nhật thông số');
    }
  };

  const openSpecsModal = () => {
    // Populate modal with existing specs as rows
    const rows = Object.entries(parsedSpecs).map(([key, val]) => ({ key, val }));
    setTempSpecs(rows.length > 0 ? rows : [{ key: '', val: '' }]);
    setShowSpecModal(true);
  };

  const handleLinkPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartId) return;

    try {
      await api.updateEquipment(data.id, {
        expectedVersion: data.version,
        notes: data.notes
      });

      setShowPartModal(false);
      fetchDetail();
      toast.success('Thành công', 'Đã liên kết phụ tùng thành công.');
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Không thể liên kết phụ tùng');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('entityType', 'Equipment');
    formData.append('entityId', data.id);
    formData.append('description', 'Tài liệu SOP');

    try {
      await api.uploadAttachment(formData);
      toast.success('Thành công', 'Tải lên tài liệu thành công.');
      fetchDetail();
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Lỗi khi tải lên tài liệu');
    }
  };

  const logsList = (data.logs || []).map((l: any) => ({
    title: l.action === 'CREATE' ? 'Tạo yêu cầu' : l.action === 'COMPLETE' ? 'Bảo trì hoàn thành' : l.action,
    desc: l.comment || l.reason || 'Nhật ký hoạt động thiết bị',
    meta: `${l.actedBy?.name || 'Hệ thống'} • ${new Date(l.createdAt).toLocaleString('vi-VN')}`,
    icon: l.action === 'CREATE' ? 'New' : l.action === 'COMPLETE' ? 'Done' : 'Info',
    color: l.action === 'CREATE' ? '#2563eb' : l.action === 'COMPLETE' ? '#16a34a' : '#d97706'
  }));

  return (
    <div>
      {/* Breadcrumbs / Back button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
        <button 
          onClick={onBack}
          style={{ 
            background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px',
            color: 'var(--text-secondary)', padding: '4px 8px', borderRadius: '4px'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <ArrowLeft size={14} /> Thiết bị
        </button>
        <span>&gt;</span>
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{data.code}</span>
      </div>

      {/* Main Title Block */}
      <div className="flex-between" style={{ marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            backgroundColor: '#eff6ff', color: '#2563eb',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Cpu size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>{data.name}</h1>
              <StatusBadge status={data.status} />
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Mã: <strong>{data.code}</strong> 
              {data.accountingCode && <><span style={{ margin: '0 8px' }}>|</span> Phụ (KT): <strong>{data.accountingCode}</strong></>}
              <span style={{ margin: '0 8px' }}>|</span> 
              Số Serial: <strong>{data.serialNumber || '---'}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Quick Info Grid */}
      <div className="kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Ngày lắp đặt', value: data.purchaseDate ? new Date(data.purchaseDate).toLocaleDateString('vi-VN') : '---' },
          { label: 'Serial Number', value: data.serialNumber || '---' },
          { label: 'Vị trí', value: data.location || '---' },
          { label: 'Hạn bảo hành', value: data.warrantyPeriod || '---' },
        ].map((info, idx) => (
          <div key={idx} className="kpi-card" style={{ padding: '12px 16px', minWidth: 'unset', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>{info.label}</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', wordBreak: 'break-all' }}>{info.value}</span>
          </div>
        ))}
      </div>

      {/* Tabs Row */}
      <div className="card mb-4" style={{ padding: '0 20px' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '16px', overflowX: 'auto' }}>
          {subTabs.map((t) => (
            <button
              key={t}
              onClick={() => setActiveSubTab(t)}
              style={{
                padding: '14px 12px',
                border: 'none',
                background: 'none',
                borderBottom: activeSubTab === t ? '2px solid var(--text-primary)' : '2px solid transparent',
                color: activeSubTab === t ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: activeSubTab === t ? 700 : 500,
                cursor: 'pointer',
                fontSize: '13px',
                whiteSpace: 'nowrap'
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeSubTab === 'Tổng quan' && (
          <OverviewTab parsedSpecs={parsedSpecs} openSpecsModal={openSpecsModal} />
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
      {showSpecModal && (
        <div style={{ 
          position: 'fixed', inset: 0, 
          backgroundColor: 'rgba(15, 23, 42, 0.4)', 
          backdropFilter: 'blur(8px)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          zIndex: 1000 
        }}>
          <div className="card" style={{ 
            width: '540px', 
            padding: '28px', 
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex', flexDirection: 'column', gap: '20px',
            backgroundColor: 'var(--bg-primary)',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Thiết lập thông số kỹ thuật</h3>
              <button 
                onClick={() => setShowSpecModal(false)} 
                style={{ 
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-secondary)', padding: '6px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddSpec} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {tempSpecs.map((spec, index) => (
                  <div key={index} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Tên thông số (ví dụ: Điện áp)" 
                      value={spec.key} 
                      onChange={e => {
                        const updated = [...tempSpecs];
                        updated[index].key = e.target.value;
                        setTempSpecs(updated);
                      }} 
                      required 
                      style={{ flex: 1, borderRadius: '8px', padding: '8px 12px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                    />
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Giá trị (ví dụ: 380V)" 
                      value={spec.val} 
                      onChange={e => {
                        const updated = [...tempSpecs];
                        updated[index].val = e.target.value;
                        setTempSpecs(updated);
                      }} 
                      required 
                      style={{ flex: 1, borderRadius: '8px', padding: '8px 12px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                    />
                    <button 
                      type="button" 
                      style={{ 
                        background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', 
                        padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center' 
                      }}
                      onClick={() => {
                        setTempSpecs(tempSpecs.filter((_, i) => i !== index));
                      }}
                      title="Xóa dòng"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                style={{ alignSelf: 'flex-start', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => setTempSpecs([...tempSpecs, { key: '', val: '' }])}
              >
                <Plus size={14} /> Thêm dòng mới
              </button>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => setShowSpecModal(false)}
                  style={{ borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600 }}
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary btn-sm"
                  style={{ borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, backgroundColor: '#2563eb', color: '#ffffff', border: 'none' }}
                >
                  Lưu tất cả
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Liên kết Phụ tùng */}
      {showPartModal && (
        <div style={{ 
          position: 'fixed', inset: 0, 
          backgroundColor: 'rgba(15, 23, 42, 0.4)', 
          backdropFilter: 'blur(8px)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          zIndex: 1000 
        }}>
          <div className="card" style={{ 
            width: '420px', 
            padding: '28px', 
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex', flexDirection: 'column', gap: '20px',
            backgroundColor: 'var(--bg-primary)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Liên kết phụ tùng</h3>
              <button 
                onClick={() => setShowPartModal(false)} 
                style={{ 
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-secondary)', padding: '6px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleLinkPart} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Chọn phụ tùng</label>
                <select 
                  className="form-select" 
                  value={selectedPartId} 
                  onChange={e => setSelectedPartId(e.target.value)} 
                  required
                  style={{ borderRadius: '8px', padding: '10px 12px', border: '1px solid var(--border-color)', fontSize: '13px', width: '100%' }}
                >
                  <option value="">-- Chọn phụ tùng từ kho --</option>
                  <option value="part-1">Vòng bi SKF 6204</option>
                  <option value="part-2">Dây curoa đai răng</option>
                  <option value="part-3">Dầu bôi trơn Roto-Inject</option>
                </select>
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Định mức tối thiểu</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={partMinQty} 
                  onChange={e => setPartMinQty(parseInt(e.target.value, 10))} 
                  min={1} 
                  required 
                  style={{ borderRadius: '8px', padding: '10px 12px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => setShowPartModal(false)}
                  style={{ borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600 }}
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary btn-sm"
                  style={{ borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, backgroundColor: '#2563eb', color: '#ffffff', border: 'none' }}
                >
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Preview Tài liệu SOP */}
      {previewFileUrl && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
          <div className="card" style={{ width: '80%', height: '80%', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', borderRadius: '16px', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Xem trực tiếp: {previewFileName}</h3>
              <button onClick={() => setPreviewFileUrl(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ flex: 1, border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden', backgroundColor: '#f1f5f9' }}>
              <iframe 
                src={previewFileUrl} 
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="SOP Preview Frame"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
