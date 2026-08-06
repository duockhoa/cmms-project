import React from 'react';

interface LogsTabProps {
  logsList: any[];
}

export const LogsTab: React.FC<LogsTabProps> = ({ logsList }) => {
  return (
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
  );
};
