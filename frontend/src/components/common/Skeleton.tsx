import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  borderRadius,
  className = '',
  style = {},
}) => {
  return (
    <span
      className={`skeleton ${className}`}
      style={{
        width: width !== undefined ? width : '100%',
        height: height !== undefined ? height : '16px',
        borderRadius: borderRadius !== undefined ? borderRadius : undefined,
        ...style,
      }}
    />
  );
};

// ─── TABLE SKELETON ───
interface TableSkeletonProps {
  columns?: number;
  rows?: number;
  columnWidths?: (string | number)[];
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  columns = 6,
  rows = 5,
  columnWidths,
}) => {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} className="table-skeleton-row">
          {Array.from({ length: columns }).map((_, cIdx) => {
            const width = columnWidths?.[cIdx] || (cIdx === 0 ? '75px' : cIdx === columns - 1 ? '85px' : '90%');
            const isBadge = cIdx === columns - 2 || (columns > 5 && cIdx === columns - 3);
            const isAction = cIdx === columns - 1;

            return (
              <td key={cIdx} style={{ verticalAlign: 'middle' }}>
                {isAction ? (
                  <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'center' }}>
                    <Skeleton width={28} height={28} borderRadius={6} />
                    <Skeleton width={28} height={28} borderRadius={6} />
                  </div>
                ) : isBadge ? (
                  <Skeleton width={70} height={22} borderRadius={12} />
                ) : (
                  <div>
                    <Skeleton width={width} height={14} borderRadius={4} />
                    {cIdx === 1 && <Skeleton width="55%" height={10} borderRadius={3} style={{ marginTop: '4px' }} />}
                  </div>
                )}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
};

// ─── CARD LIST SKELETON (Split-pane Left View) ───
interface CardListSkeletonProps {
  count?: number;
}

export const CardListSkeleton: React.FC<CardListSkeletonProps> = ({ count = 4 }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          style={{
            padding: '14px',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <Skeleton width={80} height={16} borderRadius={4} />
            <Skeleton width={65} height={20} borderRadius={10} />
          </div>
          <Skeleton width="92%" height={15} borderRadius={4} style={{ marginBottom: '8px' }} />
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Skeleton width={110} height={12} borderRadius={3} />
            <Skeleton width={60} height={12} borderRadius={3} />
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── DETAIL VIEW SKELETON (Split-pane Right View / Modal Detail) ───
export const DetailViewSkeleton: React.FC = () => {
  return (
    <div
      style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: '10px',
        border: '1px solid var(--border-color)',
        padding: '24px',
      }}
    >
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <Skeleton width={100} height={22} borderRadius={6} />
            <Skeleton width={80} height={22} borderRadius={12} />
            <Skeleton width={60} height={22} borderRadius={12} />
          </div>
          <Skeleton width="65%" height={24} borderRadius={6} />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Skeleton width={90} height={34} borderRadius={6} />
          <Skeleton width={90} height={34} borderRadius={6} />
        </div>
      </div>

      {/* 2-column info grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          padding: '16px',
          backgroundColor: 'var(--bg-hover)',
          borderRadius: '8px',
          marginBottom: '24px',
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <Skeleton width={70} height={11} borderRadius={3} style={{ marginBottom: '6px' }} />
            <Skeleton width="80%" height={15} borderRadius={4} />
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '18px' }}>
        <Skeleton width={100} height={28} borderRadius={6} />
        <Skeleton width={120} height={28} borderRadius={6} />
        <Skeleton width={90} height={28} borderRadius={6} />
      </div>

      {/* Content lines */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Skeleton width="100%" height={16} borderRadius={4} />
        <Skeleton width="90%" height={16} borderRadius={4} />
        <Skeleton width="75%" height={16} borderRadius={4} />
      </div>
    </div>
  );
};

// ─── DASHBOARD SKELETON ───
export const DashboardSkeleton: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 4 KPI Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            style={{
              padding: '20px',
              borderRadius: '10px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <Skeleton width={110} height={14} borderRadius={4} />
              <Skeleton width={36} height={36} borderRadius={8} />
            </div>
            <Skeleton width={60} height={32} borderRadius={6} style={{ marginBottom: '8px' }} />
            <Skeleton width={130} height={12} borderRadius={3} />
          </div>
        ))}
      </div>

      {/* 2 Big Blocks (Chart + Recent Requests Table) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
        <div style={{ padding: '20px', borderRadius: '10px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', minHeight: '300px' }}>
          <Skeleton width={180} height={20} borderRadius={6} style={{ marginBottom: '20px' }} />
          <Skeleton width="100%" height={220} borderRadius={8} />
        </div>
        <div style={{ padding: '20px', borderRadius: '10px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', minHeight: '300px' }}>
          <Skeleton width={180} height={20} borderRadius={6} style={{ marginBottom: '20px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Skeleton width="45%" height={16} borderRadius={4} />
                <Skeleton width={65} height={20} borderRadius={10} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
