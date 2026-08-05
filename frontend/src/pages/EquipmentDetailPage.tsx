import React, { useState, useEffect } from 'react';
import { StatusBadge } from '../components/common/Badge';
import { ArrowLeft, Cpu, Edit, Plus, Wrench, Settings, FileText, BookOpen, Clock, Activity, MessageSquare, Calendar } from 'lucide-react';

interface EquipmentDetailPageProps {
  item: any;
  onBack: () => void;
}

export const EquipmentDetailPage: React.FC<EquipmentDetailPageProps> = ({ item, onBack }) => {
  const [activeSubTab, setActiveSubTab] = useState('Tổng quan');
  const [loading, setLoading] = useState(true);
  const [detailData, setDetailData] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/equipment/${item.id}`)
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
  }, [item.id]);

  const subTabs = ['Tổng quan', 'Lịch sử sửa chữa', 'Lịch bảo trì', 'Phụ tùng', 'SOP & Tài liệu', 'Nhật ký'];

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

  const sparePartsList = (data.spareParts || []).map((p: any) => ({
    name: p.name,
    itemCode: p.itemCode,
    quantity: p.quantity,
    minQuantity: p.minQuantity,
    lastChange: '---',
    life: '---',
    unitPrice: p.unitPrice
  })).slice(0, 6);

  const attachmentsList = data.attachments || [];

  const logsList = (data.logs || []).map((l: any) => ({
    title: l.action === 'CREATE' ? 'Tạo yêu cầu' : l.action === 'COMPLETE' ? 'Bảo trì hoàn thành' : l.action,
    desc: l.comment || l.reason || 'Nhật ký hoạt động thiết bị',
    meta: `👤 ${l.actedBy?.name || 'Hệ thống'} • 📅 ${new Date(l.createdAt).toLocaleString('vi-VN')}`,
    icon: l.action === 'CREATE' ? '➕' : l.action === 'COMPLETE' ? '✅' : '⚙️',
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
              <span className="badge badge-info" style={{ fontSize: '11px' }}>{data.category}</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Mã: <strong>{data.code}</strong> <span style={{ margin: '0 8px' }}>|</span> 
              Số Serial: <strong>{data.serialNumber || 'AC-2023-4521'}</strong>
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              {data.specs || 'Máy nén khí trục vít chính cho dây chuyền sản xuất'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary"><Edit size={14} /> Chỉnh sửa</button>
          <button className="btn btn-primary"><Plus size={14} /> Tạo Work Order</button>
        </div>
      </div>

      {/* Quick Info Grid */}
      <div className="kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Ngày lắp đặt', value: data.purchaseDate ? new Date(data.purchaseDate).toLocaleDateString('vi-VN') : '---' },
          { label: 'Hãng sản xuất', value: '---' },
          { label: 'Model', value: '---' },
          { label: 'Serial Number', value: data.serialNumber || '---' },
          { label: 'Vị trí', value: data.location || '---' },
          { label: 'Người phụ trách', value: '---' },
          { label: 'Giá trị tài sản', value: '---' },
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
            <div className="responsive-detail-grid">
              {/* Technical Specifications */}
              <div className="card" style={{ padding: '20px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Settings size={16} color="var(--text-muted)" />
                  <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Thông số kỹ thuật</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px', fontSize: '13px' }}>
                  {[
                    { label: 'Hãng sản xuất', val: '---' },
                    { label: 'Model', val: '---' },
                    { label: 'Thông số', val: data.specs || '---' },
                    { label: 'Ghi chú', val: data.notes || '---' },
                  ].map((spec, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{spec.label}</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{spec.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Equipment Condition / Life */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="card" style={{ padding: '20px', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <Activity size={16} color="var(--text-muted)" />
                    <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Tình trạng thiết bị</h3>
                  </div>
                  
                  {/* Equipment Image Placeholder */}
                  <div style={{
                    height: '160px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px dashed var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '12px',
                    gap: '8px',
                    marginBottom: '16px'
                  }}>
                    <Wrench size={32} style={{ opacity: 0.5 }} />
                    <span>Ảnh thiết bị</span>
                  </div>

                  {/* Overall status info */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                    <div className="flex-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Tình trạng tổng thể</span>
                      <StatusBadge status={data.status} />
                    </div>
                    <div className="flex-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Tuổi thọ còn lại</span>
                      <span style={{ fontWeight: 600 }}>~10 năm</span>
                    </div>
                    {/* Progress bar */}
                    <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden', margin: '4px 0' }}>
                      <div style={{ width: '80%', height: '100%', backgroundColor: 'var(--primary)' }}></div>
                    </div>
                    <div className="flex-between" style={{ marginTop: '4px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Bảo trì gần nhất</span>
                      <span style={{ fontWeight: 600 }}>2026-05-20</span>
                    </div>
                    <div className="flex-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Bảo trì tiếp theo</span>
                      <span style={{ fontWeight: 600 }}>
                        {data.schedules?.[0]?.nextDueDate 
                          ? new Date(data.schedules[0].nextDueDate).toLocaleDateString('vi-VN') 
                          : 'Chưa lập lịch'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom KPI Indicators */}
            <div className="responsive-kpi-grid">
              {[
                { label: 'Tổng số lần sửa chữa', value: '2', color: '#2563eb' },
                { label: 'Tổng downtime', value: '7h', color: '#d97706' },
                { label: 'MTTR', value: '3.5h', color: '#7c3aed' },
                { label: 'MTBF', value: '183 ngày', color: '#16a34a' },
                { label: 'Chi phí bảo trì', value: '7.000.000 ₫', color: '#dc2626' },
              ].map((kpi, idx) => (
                <div key={idx} className="kpi-card" style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: `4px solid ${kpi.color}`, padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: kpi.color }}></div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{kpi.label}</span>
                  </div>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>{kpi.value}</span>
                </div>
              ))}
            </div>

            {/* 12-Month Maintenance Chart Card */}
            <div className="card" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <Clock size={16} color="var(--text-muted)" />
                <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Biểu đồ bảo trì 12 tháng</h3>
              </div>

              {/* Custom Stylized CSS Chart */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px 0' }}>
                <div style={{ display: 'flex', height: '140px', alignItems: 'flex-end', justifyContent: 'space-between', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', position: 'relative' }}>
                  {/* Grid background lines */}
                  {[0, 1, 2, 3, 4].map((gridLine) => (
                    <div key={gridLine} style={{
                      position: 'absolute', left: 0, right: 0, 
                      bottom: `${(gridLine / 4) * 100}%`,
                      borderBottom: '1px dashed var(--border-color)',
                      opacity: 0.3, zIndex: 1
                    }}></div>
                  ))}

                  {/* Bars */}
                  {[
                    { label: 'T7/25', bars: [{ val: 1, col: '#2563eb' }] },
                    { label: 'T8/25', bars: [{ val: 1, col: '#2563eb' }, { val: 1, col: '#d97706' }] },
                    { label: 'T9/25', bars: [] },
                    { label: 'T10/25', bars: [{ val: 1, col: '#2563eb' }] },
                    { label: 'T11/25', bars: [] },
                    { label: 'T12/25', bars: [{ val: 1, col: '#2563eb' }] },
                    { label: 'T1/26', bars: [{ val: 1, col: '#d97706' }] },
                    { label: 'T2/26', bars: [] },
                    { label: 'T3/26', bars: [] },
                    { label: 'T4/26', bars: [] },
                    { label: 'T5/26', bars: [] },
                    { label: 'T6/26', bars: [{ val: 1, col: '#d97706' }, { val: 1, col: '#dc2626' }] },
                  ].map((barGroup, idx) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, zIndex: 2 }}>
                      <div style={{ display: 'flex', gap: '4px', height: '100px', alignItems: 'flex-end' }}>
                        {barGroup.bars.map((bar, bIdx) => (
                          <div 
                            key={bIdx} 
                            style={{ 
                              width: '16px', 
                              height: `${(bar.val / 2) * 80}px`, 
                              backgroundColor: bar.col, 
                              borderRadius: '3px 3px 0 0',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                            }}
                            title={`${bar.col === '#2563eb' ? 'Sửa chữa' : bar.col === '#d97706' ? 'Downtime' : 'Chi phí'}`}
                          ></div>
                        ))}
                        {barGroup.bars.length === 0 && <div style={{ height: '2px' }}></div>}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', fontWeight: 500 }}>{barGroup.label}</span>
                    </div>
                  ))}
                </div>

                {/* Chart Legend */}
                <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#2563eb' }}></div>
                    <span>Sửa chữa (lần)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#d97706' }}></div>
                    <span>Downtime (giờ)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#dc2626' }}></div>
                    <span>Chi phí (triệu ₫)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeSubTab === 'Lịch sử sửa chữa' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px 0' }}>
            {/* Timeline bảo trì */}
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 20px 0', color: 'var(--text-primary)' }}>Timeline bảo trì</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative', paddingLeft: '20px' }}>
                {/* Vertical line */}
                <div style={{ position: 'absolute', left: '4px', top: '8px', bottom: '8px', width: '2px', backgroundColor: 'var(--border-color)' }}></div>

                {workOrdersList.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>
                    Không có lịch sử sửa chữa
                  </div>
                ) : workOrdersList.map((wo: any) => (
                  <div key={wo.id} style={{ position: 'relative' }}>
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
                      <span>👤 {wo.technicianName || 'Chưa phân công'}</span>
                      <span>⏱️ {wo.actualEndDate ? 'Đã hoàn thành' : 'Đang xử lý'}</span>
                      <span>💰 {wo.totalCost ? wo.totalCost.toLocaleString('vi-VN') + ' ₫' : '0 ₫'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Work Order liên quan */}
            <div className="card" style={{ padding: '20px' }}>
              <div className="flex-between" style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Work Order liên quan</h3>
                <select className="form-select" style={{ width: '120px', height: '32px', padding: '0 8px', fontSize: '12px' }}>
                  <option>Tất cả</option>
                </select>
              </div>

              <div className="table-wrapper">
                <table className="custom-table" style={{ fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th>Mã</th>
                      <th>Tiêu đề</th>
                      <th>Loại</th>
                      <th>Mức ưu tiên</th>
                      <th>Trạng thái</th>
                      <th>Phân công</th>
                      <th>Ngày tạo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workOrdersList.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '16px 0' }}>
                          Không có dữ liệu Work Order liên quan
                        </td>
                      </tr>
                    ) : workOrdersList.map((wo: any) => (
                      <tr key={wo.id}>
                        <td style={{ fontWeight: 700 }}>{wo.orderCode}</td>
                        <td style={{ fontWeight: 600 }}>{wo.title}</td>
                        <td>
                          <span className="badge badge-secondary" style={{ fontSize: '11px' }}>
                            {wo.requestId ? 'Yêu cầu sửa chữa' : 'Bảo trì định kỳ'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${wo.priority === 'HIGH' || wo.priority === 'URGENT' ? 'badge-danger' : 'badge-info'}`} style={{ fontSize: '11px' }}>
                            {wo.priority}
                          </span>
                        </td>
                        <td><span className="badge badge-neutral" style={{ fontSize: '11px' }}>{wo.status}</span></td>
                        <td>{wo.technicianName || 'Chưa phân công'}</td>
                        <td>{new Date(wo.createdAt).toLocaleDateString('vi-VN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : activeSubTab === 'Lịch bảo trì' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px 0' }}>
            {/* Kế hoạch bảo trì */}
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 16px 0', color: 'var(--text-primary)' }}>Kế hoạch bảo trì</h3>
              
              {schedulesList.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>
                  Không có kế hoạch bảo trì nào được thiết lập
                </div>
              ) : schedulesList.map((sch: any) => (
                <div key={sch.id} style={{
                  display: 'flex', gap: '16px', padding: '16px',
                  backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                  borderRadius: '8px', alignItems: 'center', marginBottom: '12px'
                }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '8px',
                    backgroundColor: '#eff6ff', color: '#2563eb',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Calendar size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{sch.title}</span>
                      <span className="badge badge-warning" style={{ fontSize: '10px' }}>{sch.status}</span>
                      <span className="badge badge-info" style={{ fontSize: '10px' }}>{sch.frequencyType}</span>
                    </div>
                    {sch.description && (
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                        {sch.description}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      <span>📅 {sch.nextDueDate ? new Date(sch.nextDueDate).toLocaleDateString('vi-VN') : 'Chưa đến hạn'}</span>
                      <span>👤 {sch.assignedTechnician?.name || 'Chưa phân công'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Lịch bảo trì tháng */}
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 20px 0', color: 'var(--text-primary)' }}>Lịch bảo trì tháng 7/2026</h3>
              
              {/* Calendar Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', backgroundColor: 'var(--border-color)' }}>
                {/* Week Header */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', backgroundColor: 'var(--bg-secondary)', textAlign: 'center', fontWeight: 700, fontSize: '12px', padding: '10px 0' }}>
                  <span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span>
                </div>
                {/* Days */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', backgroundColor: '#ffffff', rowGap: '16px', padding: '16px 0', textAlign: 'center', fontSize: '13px' }}>
                  <span>1</span>
                  <span style={{ backgroundColor: '#2563eb', color: '#ffffff', borderRadius: '4px', padding: '2px 0', fontWeight: 700 }}>2</span>
                  <span>3</span><span>4</span><span>5</span><span>6</span><span>7</span>
                  <span>8</span><span>9</span><span>10</span><span>11</span><span>12</span><span>13</span><span>14</span>
                  <span>15</span><span>16</span><span>17</span><span>18</span><span>19</span>
                  <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', borderRadius: '4px', padding: '2px 0', fontWeight: 700, border: '1px solid #bfdbfe' }}>20<div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#2563eb', margin: '2px auto 0 auto' }}></div></span>
                  <span>21</span>
                  <span>22</span><span>23</span><span>24</span><span>25</span><span>26</span><span>27</span><span>28</span>
                  <span>29</span><span>30</span><span>31</span>
                </div>
              </div>
            </div>
          </div>
        ) : activeSubTab === 'Phụ tùng' ? (
          <div style={{ padding: '24px 0' }}>
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 16px 0', color: 'var(--text-primary)' }}>⚙️ Danh sách phụ tùng</h3>
              
              <div className="table-wrapper">
                <table className="custom-table" style={{ fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th>Tên phụ tùng</th>
                      <th>Mã phụ tùng</th>
                      <th>Tồn kho</th>
                      <th>Lần thay gần nhất</th>
                      <th>Tuổi thọ</th>
                      <th>Đơn giá</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sparePartsList.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '16px 0' }}>
                          Không có phụ tùng liên kết với thiết bị này
                        </td>
                      </tr>
                    ) : sparePartsList.map((part: any, idx: number) => {
                      const low = part.quantity <= part.minQuantity;
                      const progress = Math.min(100, (part.quantity / (part.minQuantity * 2 || 1)) * 100) + '%';
                      return (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{part.name}</td>
                          <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{part.itemCode}</td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '150px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                                <span>{part.quantity} / {part.minQuantity} tối thiểu</span>
                                {low && <span className="badge badge-danger" style={{ fontSize: '9px', padding: '1px 4px' }}>Thấp</span>}
                              </div>
                              <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: progress, height: '100%', backgroundColor: low ? '#dc2626' : '#2563eb' }}></div>
                              </div>
                            </div>
                          </td>
                          <td>{part.lastChange}</td>
                          <td>{part.life}</td>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {part.unitPrice ? part.unitPrice.toLocaleString('vi-VN') + ' ₫' : '0 ₫'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : activeSubTab === 'SOP & Tài liệu' ? (
          <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ width: '150px' }}>
              <select className="form-select" style={{ height: '32px', fontSize: '12px' }}>
                <option>Tất cả</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {attachmentsList.length === 0 ? (
                <div className="card" style={{ padding: '24px', textAlign: 'center', gridColumn: '1 / -1', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Không có tài liệu hoặc SOP nào được tải lên cho thiết bị này
                </div>
              ) : attachmentsList.map((doc: any, idx: number) => {
                const isVideo = doc.originalName.endsWith('.mp4');
                const isPdf = doc.originalName.endsWith('.pdf');
                const sizeStr = doc.fileSize > 1024 * 1024 
                  ? (doc.fileSize / (1024 * 1024)).toFixed(1) + ' MB' 
                  : (doc.fileSize / 1024).toFixed(0) + ' KB';
                return (
                  <div key={doc.id || idx} className="card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '6px',
                        backgroundColor: isVideo ? '#fdf2f8' : isPdf ? '#f0fdf4' : '#eff6ff',
                        color: isVideo ? '#db2777' : isPdf ? '#16a34a' : '#2563eb',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <FileText size={18} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{doc.originalName}</h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                          <span className="badge badge-secondary" style={{ fontSize: '9px', padding: '1px 6px' }}>{doc.description || 'Tài liệu'}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sizeStr}</span>
                        </div>
                        <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                          {new Date(doc.createdAt).toLocaleDateString('vi-VN')} • {doc.uploadedBy?.name || 'Hệ thống'}
                        </p>
                      </div>
                    </div>
                    <button 
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '12px' }}
                      onClick={() => {
                        if (doc.id.startsWith('doc-mock')) {
                          alert(`Bắt đầu tải file mock: ${doc.originalName}`);
                        } else {
                          window.open(`/api/attachments/${doc.id}/download`, '_blank');
                        }
                      }}
                    >
                      📥 Tải
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ padding: '24px 0' }}>
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 20px 0', color: 'var(--text-primary)' }}>⚡ Nhật ký hoạt động</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', paddingLeft: '24px' }}>
                <div style={{ position: 'absolute', left: '6px', top: '8px', bottom: '8px', width: '2px', backgroundColor: 'var(--border-color)' }}></div>
                
                {logsList.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>
                    Không có nhật ký hoạt động nào
                  </div>
                ) : logsList.map((log: any, idx: number) => (
                  <div key={idx} style={{ position: 'relative' }}>
                    <div style={{
                      position: 'absolute', left: '-24px', top: '2px',
                      width: '14px', height: '14px', borderRadius: '50%',
                      backgroundColor: '#ffffff', border: `2px solid ${log.color}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px'
                    }}></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <h4 style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{log.icon} {log.title}</h4>
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
    </div>
  );
};
