import React from 'react';
import { Settings } from 'lucide-react';

interface OverviewTabProps {
  parsedSpecs: Record<string, string>;
  openSpecsModal: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ parsedSpecs, openSpecsModal }) => {
  return (
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
  );
};
