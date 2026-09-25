import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumb?: BreadcrumbItem[];
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badge,
  actions,
  breadcrumb,
  className = '',
}) => {
  return (
    <div className={`page-header ${className}`.trim()}>
      <div>
        {breadcrumb && breadcrumb.length > 0 && (
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: 'var(--text-muted)',
              marginBottom: '6px',
            }}
            aria-label="Breadcrumb"
          >
            {breadcrumb.map((item, index) => {
              const isLast = index === breadcrumb.length - 1;
              return (
                <React.Fragment key={index}>
                  {item.path && !isLast ? (
                    <Link
                      to={item.path}
                      style={{
                        color: 'var(--text-secondary)',
                        textDecoration: 'none',
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span style={{ color: isLast ? 'var(--text-primary)' : 'inherit', fontWeight: isLast ? 600 : 400 }}>
                      {item.label}
                    </span>
                  )}
                  {!isLast && <ChevronRight size={12} style={{ opacity: 0.6 }} />}
                </React.Fragment>
              );
            })}
          </nav>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <h1 className="page-title">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>

      {actions && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {actions}
        </div>
      )}
    </div>
  );
};
