import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  color?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, subtext, icon: Icon, color = 'var(--accent-primary)' }) => {
  return (
    <div className="card flex-between">
      <div>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>{title}</span>
        <h3 style={{ fontSize: '26px', fontWeight: 800, marginTop: '4px', color: 'var(--text-primary)' }}>{value}</h3>
        {subtext && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{subtext}</p>}
      </div>
      <div style={{
        width: '48px', height: '48px', borderRadius: '12px',
        backgroundColor: `${color}18`, display: 'flex',
        alignItems: 'center', justifyContent: 'center', color: color
      }}>
        <Icon size={24} />
      </div>
    </div>
  );
};
