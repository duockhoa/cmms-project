import React, { useState, useEffect } from 'react';
import { StatusBadge } from '../components/common/Badge';
import { 
  ArrowLeft, Cpu, Edit, Plus, Wrench, Settings, FileText, BookOpen, Clock, Activity, MessageSquare, Calendar, X, Eye, Download 
} from 'lucide-react';

const API_BASE = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

interface EquipmentDetailPageProps {
  item: any;
  onBack: () => void;
}

export const EquipmentDetailPage: React.FC<EquipmentDetailPageProps> = ({ item, onBack }) => {
  const [activeSubTab, setActiveSubTab] = useState('Tổng quan');
  const [loading, setLoading] = useState(true);
  const [detailData, setDetailData] = useState<any>(null);

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
    fetch(`${API_BASE}/api/v1/equipment/${item.id}`, {
      headers: {
        'x-user-id': 'tech-demo-id',
        'x-test-user-id': 'tech-demo-id',
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Không thể tải chi tiết thiết bị');
        return res.json();
      })
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

  const subTabs = ['Tổng quan', 'Lịch sử sửa chữa', 'Lịch bảo trì', 'Phụ tùng', 'SOP & Tài liệu', 'Mã QR', 'Nhật ký'];

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
      const res = await fetch(`${API_BASE}/api/v1/equipment/${data.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'tech-demo-id',
          'x-test-user-id': 'tech-demo-id',
        },
        body: JSON.stringify({
          expectedVersion: data.version,
          specs: JSON.stringify(newSpecs)
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Lỗi cập nhật thông số');
      }

      setShowSpecModal(false);
      fetchDetail();
    } catch (err: any) {
      alert(err.message);
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
      const res = await fetch(`${API_BASE}/api/v1/equipment/${data.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'tech-demo-id',
          'x-test-user-id': 'tech-demo-id',
        },
        body: JSON.stringify({
          expectedVersion: data.version,
          notes: data.notes
        })
      });

      if (!res.ok) throw new Error('Không thể liên kết phụ tùng');
      setShowPartModal(false);
      fetchDetail();
      alert('Đã liên kết phụ tùng thành công (giả lập trên DB)');
    } catch (err: any) {
      alert(err.message);
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
      const res = await fetch(`${API_BASE}/api/v1/attachments`, {
        method: 'POST',
        headers: {
          'x-user-id': 'tech-demo-id',
          'x-test-user-id': 'tech-demo-id',
        },
        body: formData
      });

      if (!res.ok) throw new Error('Lỗi khi tải lên tài liệu');
      alert('Tải lên tài liệu thành công');
      fetchDetail();
    } catch (err: any) {
      alert(err.message);
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
              Mã: <strong>{data.code}</strong> <span style={{ margin: '0 8px' }}>|</span> 
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
        {activeSubTab === 'Tổng quan' ? (
          <div>
            <div className="responsive-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', padding: '20px 0' }}>
              {/* Technical Specifications */}
              <div className="card" style={{ padding: '20px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Settings size={16} color="var(--text-muted)" />
                    <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Thông số kỹ thuật</h3>
                  </div>
                  <button 
                    onClick={openSpecsModal}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '12px', padding: '4px 8px' }}
                  >
                    + Thiết lập thông số
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px', fontSize: '13px' }}>
                  {Object.entries(parsedSpecs).map(([key, val], idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{key}</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{val}</span>
                    </div>
                  ))}
                  {Object.keys(parsedSpecs).length === 0 && (
                    <div style={{ gridColumn: '1 / -1', color: 'var(--text-muted)', textAlign: 'center' }}>
                      Chưa cập nhật thông số kỹ thuật nào
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : activeSubTab === 'Lịch sử sửa chữa' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px 0' }}>
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 20px 0', color: 'var(--text-primary)' }}>Timeline bảo trì</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative', paddingLeft: '20px' }}>
                <div style={{ position: 'absolute', left: '4px', top: '8px', bottom: '8px', width: '2px', backgroundColor: 'var(--border-color)' }}></div>
                {workOrdersList.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>
                    Không có lịch sử sửa chữa nào
                  </div>
                ) : workOrdersList.map((wo: any, idx: number) => (
                  <div key={wo.id || idx} style={{ position: 'relative' }}>
                    <div style={{
                      position: 'absolute', left: '-20px', top: '4px',
                      width: '10px', height: '10px', borderRadius: '50%',
                      backgroundColor: wo.priority === 'HIGH' || wo.priority === 'URGENT' ? '#d97706' : '#16a34a',
                      border: '2px solid #ffffff'
                    }}></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span className={`badge ${wo.priority === 'HIGH' || wo.priority === 'URGENT' ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                        {wo.priority === 'HIGH' || wo.priority === 'URGENT' ? 'Sửa chữa' : 'Phòng ngừa'}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {new Date(wo.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>{wo.title}</h4>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <span>Người phụ trách: {wo.technicianName || 'Chưa phân công'}</span>
                      <span>Trạng thái: {wo.actualEndDate ? 'Đã hoàn thành' : 'Đang xử lý'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : activeSubTab === 'Lịch bảo trì' ? (
          <div style={{ padding: '24px 0' }}>
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 20px 0', color: 'var(--text-primary)' }}>Kế hoạch bảo trì phòng ngừa định kỳ</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {schedulesList.map((sch: any) => (
                  <div key={sch.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-secondary)' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{sch.title}</span>
                        <span className="badge badge-warning" style={{ fontSize: '10px' }}>{sch.status}</span>
                        <span className="badge badge-info" style={{ fontSize: '10px' }}>{sch.frequencyType}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        <span>Đến hạn: {sch.nextDueDate ? new Date(sch.nextDueDate).toLocaleDateString('vi-VN') : 'Chưa đến hạn'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : activeSubTab === 'Phụ tùng' ? (
          <div style={{ padding: '24px 0' }}>
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Danh sách phụ tùng liên kết</h3>
                <button 
                  onClick={() => setShowPartModal(true)}
                  className="btn btn-primary btn-sm"
                >
                  + Liên kết phụ tùng
                </button>
              </div>
              <div className="table-wrapper">
                <table className="custom-table" style={{ fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th>Tên phụ tùng</th>
                      <th>Mã phụ tùng</th>
                      <th>Tồn kho</th>
                      <th>Đơn giá</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sparePartsList.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '16px 0' }}>
                          Không có phụ tùng liên kết với thiết bị này
                        </td>
                      </tr>
                    ) : sparePartsList.map((part: any, idx: number) => (
                      <tr key={part.id || idx}>
                        <td style={{ fontWeight: 600 }}>{part.name}</td>
                        <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{part.itemCode || '---'}</td>
                        <td>{part.quantity}</td>
                        <td style={{ fontWeight: 600 }}>{part.unitPrice ? part.unitPrice.toLocaleString('vi-VN') + ' ₫' : '---'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : activeSubTab === 'SOP & Tài liệu' ? (
          <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ width: '150px' }}>
                <select className="form-select" style={{ height: '32px', fontSize: '12px' }}>
                  <option>Tất cả tài liệu</option>
                </select>
              </div>
              <div>
                <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  + Tải lên tài liệu
                  <input type="file" style={{ display: 'none' }} onChange={handleFileUpload} />
                </label>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {attachmentsList.length === 0 ? (
                <div className="card" style={{ padding: '24px', textAlign: 'center', gridColumn: '1 / -1', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Không có tài liệu hoặc SOP nào được tải lên cho thiết bị này
                </div>
              ) : attachmentsList.map((doc: any, idx: number) => {
                const sizeStr = doc.fileSize > 1024 * 1024 
                  ? (doc.fileSize / (1024 * 1024)).toFixed(1) + ' MB' 
                  : (doc.fileSize / 1024).toFixed(0) + ' KB';
                const downloadUrl = `${API_BASE}/api/v1/attachments/${doc.id}/download`;
                const viewUrl = `${API_BASE}/api/v1/attachments/${doc.id}/view`;

                return (
                  <div key={doc.id || idx} className="card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '6px',
                        backgroundColor: '#f0fdf4',
                        color: '#16a34a',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <FileText size={18} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{doc.originalName}</h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                          <span className="badge badge-secondary" style={{ fontSize: '9px', padding: '1px 6px' }}>{doc.description || 'SOP'}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sizeStr}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        title="Xem trực tiếp"
                        onClick={() => {
                          setPreviewFileUrl(viewUrl);
                          setPreviewFileName(doc.originalName);
                        }}
                      >
                        <Eye size={14} />
                      </button>
                      <a href={downloadUrl} className="btn btn-secondary btn-sm" title="Tải về" target="_blank" rel="noreferrer">
                        <Download size={14} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : activeSubTab === 'Mã QR' ? (
          <div style={{ padding: '24px 0', display: 'flex', justifyContent: 'center' }}>
            <div className="card" style={{ 
              width: '320px', 
              padding: '24px', 
              textAlign: 'center', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '16px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px'
            }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Mã QR nhận diện thiết bị</h3>
              <div style={{ 
                padding: '16px', 
                backgroundColor: '#ffffff', 
                borderRadius: '8px', 
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`cmms-equipment:${data.id}`)}`}
                  alt={`QR Code ${data.code}`}
                  style={{ width: '200px', height: '200px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>{data.name}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontWeight: 600 }}>{data.code}</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '8px' }}>
                <button 
                  className="btn btn-secondary btn-sm" 
                  style={{ flex: 1, fontSize: '12px', padding: '8px' }}
                  onClick={() => {
                    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`cmms-equipment:${data.id}`)}`;
                    window.open(qrUrl, '_blank');
                  }}
                >
                  Tải ảnh QR
                </button>
                <button 
                  className="btn btn-primary btn-sm" 
                  style={{ flex: 1, fontSize: '12px', padding: '8px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none' }}
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>In nhãn QR - ${data.code}</title>
                            <style>
                              body { font-family: sans-serif; text-align: center; padding: 40px; }
                              .label-container { border: 2px dashed #000; padding: 20px; display: inline-block; border-radius: 8px; }
                              img { width: 200px; height: 200px; }
                              h2 { margin: 10px 0 5px 0; }
                              p { margin: 0; font-family: monospace; font-size: 14px; font-weight: bold; }
                            </style>
                          </head>
                          <body onload="window.print(); window.close();">
                            <div class="label-container">
                              <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`cmms-equipment:${data.id}`)}" />
                              <h2>${data.name}</h2>
                              <p>${data.code}</p>
                            </div>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                    }
                  }}
                >
                  In nhãn QR
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '24px 0' }}>
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 20px 0', color: 'var(--text-primary)' }}>Nhật ký hoạt động</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', paddingLeft: '24px' }}>
                <div style={{ position: 'absolute', left: '6px', top: '8px', bottom: '8px', width: '2px', backgroundColor: 'var(--border-color)' }}></div>
                {logsList.map((log: any, idx: number) => (
                  <div key={idx} style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <h4 style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{log.title}</h4>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>{log.desc}</p>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{log.meta}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
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
