import React, { useState, useMemo } from 'react';
import { Package, Search, CheckCircle, AlertTriangle, Cpu } from 'lucide-react';

interface SparePartsTabProps {
  sparePartsList: any[];
  setShowPartModal?: (show: boolean) => void;
}

export const SparePartsTab: React.FC<SparePartsTabProps> = ({ sparePartsList, setShowPartModal }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Normalize list supporting both BOM structure and legacy flat items
  const normalizedList = useMemo(() => {
    return (sparePartsList || []).map((p: any) => {
      const part = p.sparePart || p;
      return {
        id: p.id,
        linkId: p.id,
        sparePartId: p.sparePartId || p.id,
        name: part.name || '---',
        itemCode: part.itemCode || '---',
        specs: part.specs || '',
        category: part.category || 'Linh kiện tiêu hao',
        quantity: typeof part.quantity === 'number' ? part.quantity : 0,
        minQuantity: typeof part.minQuantity === 'number' ? part.minQuantity : 1,
        unit: part.unit || 'Cái',
        location: part.location || 'Kho Cơ điện',
        role: p.role || '---',
        quantityPerEquipment: p.quantityPerEquipment || 1,
        notes: p.notes || '',
      };
    });
  }, [sparePartsList]);

  // Filter by search term
  const filteredList = useMemo(() => {
    if (!searchTerm.trim()) return normalizedList;
    const q = searchTerm.toLowerCase().trim();
    return normalizedList.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.itemCode.toLowerCase().includes(q) ||
        item.specs.toLowerCase().includes(q) ||
        item.role.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [normalizedList, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const total = normalizedList.length;
    const inStock = normalizedList.filter((item) => item.quantity > 0).length;
    const outOfStock = normalizedList.filter((item) => item.quantity === 0).length;
    return { total, inStock, outOfStock };
  }, [normalizedList]);

  return (
    <div style={{ padding: '20px 0' }}>
      {/* Quick summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '10px' }}>
          <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#2563eb' }}>
            <Cpu size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Tổng linh kiện máy</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>{stats.total}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '10px' }}>
          <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#ecfdf5', color: '#10b981' }}>
            <CheckCircle size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Sẵn sàng trong kho</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#10b981' }}>{stats.inStock}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '10px' }}>
          <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#fef2f2', color: '#ef4444' }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>Cần bổ sung / Hết tồn</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#ef4444' }}>{stats.outOfStock}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '20px', borderRadius: '12px' }}>
        {/* Header & Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={18} color="#2563eb" />
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Danh mục Phụ tùng & Linh kiện (BOM)
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
              ({filteredList.length} / {stats.total} linh kiện)
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '260px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Tìm linh kiện, model, vai trò..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '32px', fontSize: '12.5px', height: '34px' }}
              />
            </div>
            {setShowPartModal && (
              <button
                type="button"
                onClick={() => setShowPartModal(true)}
                className="btn btn-primary btn-sm"
                style={{ fontSize: '12.5px', height: '34px', whiteSpace: 'nowrap' }}
              >
                + Liên kết phụ tùng
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="table-wrapper" style={{ overflowX: 'auto' }}>
          <table className="custom-table" style={{ fontSize: '13px' }}>
            <thead>
              <tr>
                <th style={{ width: '45px', textAlign: 'center' }}>STT</th>
                <th style={{ minWidth: '190px' }}>Tên linh kiện</th>
                <th style={{ minWidth: '220px' }}>Thông số kỹ thuật / Model</th>
                <th style={{ minWidth: '180px' }}>Vai trò / Vị trí trên máy</th>
                <th style={{ width: '90px', textAlign: 'center' }}>Định mức</th>
                <th style={{ width: '130px', textAlign: 'center' }}>Tồn kho</th>
                <th style={{ width: '110px' }}>Vị trí kho</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0' }}>
                    {searchTerm ? 'Không tìm thấy linh kiện phù hợp với từ khóa' : 'Chưa có linh kiện liên kết với thiết bị này'}
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => {
                  const isAvailable = item.quantity > 0;
                  return (
                    <tr key={item.id || idx}>
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>{idx + 1}</td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.name}</div>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '2px', alignItems: 'center' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#2563eb', backgroundColor: '#eff6ff', padding: '1px 6px', borderRadius: '4px' }}>
                            {item.itemCode}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>• {item.category}</span>
                        </div>
                      </td>
                      <td>
                        {item.specs ? (
                          <div style={{ whiteSpace: 'pre-line', color: 'var(--text-secondary)', lineHeight: '1.4', fontSize: '12.5px' }}>
                            {item.specs}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>---</span>
                        )}
                      </td>
                      <td>
                        {item.role !== '---' ? (
                          <span style={{ fontWeight: 600, color: '#334155' }}>{item.role}</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>---</span>
                        )}
                        {item.notes && (
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', fontStyle: 'italic' }}>
                            {item.notes}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>
                        {item.quantityPerEquipment} <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>{item.unit}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {isAvailable ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              backgroundColor: '#ecfdf5',
                              color: '#059669',
                              border: '1px solid #a7f3d0',
                            }}
                          >
                            Còn: {item.quantity} {item.unit}
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              backgroundColor: '#fef2f2',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                            }}
                          >
                            Hết hàng (Dự trù: {item.minQuantity})
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {item.location}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
