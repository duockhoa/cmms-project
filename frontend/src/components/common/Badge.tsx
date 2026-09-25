import React from 'react';

interface BadgeProps {
  status: string;
}

export const StatusBadge: React.FC<BadgeProps> = ({ status }) => {
  const getBadgeStyle = (st: string) => {
    switch (st) {
      case 'OPERATIONAL': return { className: 'badge-success', text: 'Hoạt động tốt' };
      case 'UNDER_MAINTENANCE': return { className: 'badge-warning', text: 'Đang bảo trì' };
      case 'INCIDENT': return { className: 'badge-danger', text: 'Sự cố / Hỏng' };
      case 'DISCOMMISSIONED': return { className: 'badge-neutral', text: 'Ngừng sử dụng' };

      case 'PENDING': return { className: 'badge-warning', text: 'Chờ xử lý' };
      case 'APPROVED': return { className: 'badge-info', text: 'Đã duyệt' };
      case 'REJECTED': return { className: 'badge-neutral', text: 'Từ chối' };
      case 'RETURNED': return { className: 'badge-warning', text: 'Trả lại' };

      case 'DRAFT': return { className: 'badge-neutral', text: 'Bản nháp' };
      case 'ASSIGNED': return { className: 'badge-info', text: 'Đã phân công' };
      case 'IN_PROGRESS': return { className: 'badge-info', text: 'Đang thực hiện' };
      case 'ON_HOLD': return { className: 'badge-warning', text: 'Tạm dừng' };
      case 'COMPLETED': return { className: 'badge-info', text: 'Chờ xưởng nghiệm thu' };
      case 'INSPECTION': return { className: 'badge-warning', text: 'Chờ QA nghiệm thu' };
      case 'VERIFIED': return { className: 'badge-success', text: 'Đã nghiệm thu (QA)' };
      case 'RESOLVED': return { className: 'badge-success', text: 'Đã xử lý' };
      case 'CLOSED': return { className: 'badge-neutral', text: 'Đã đóng' };
      case 'CANCELLED': return { className: 'badge-neutral', text: 'Đã hủy' };

      case 'ACTIVE': return { className: 'badge-success', text: 'Hoạt động' };
      case 'INACTIVE': return { className: 'badge-danger', text: 'Ngừng hoạt động' };

      case 'BUG': return { className: 'badge-danger', text: 'Báo lỗi' };
      case 'FEATURE': return { className: 'badge-info', text: 'Tính năng mới' };
      case 'IMPROVEMENT': return { className: 'badge-warning', text: 'Cải tiến' };
      case 'OTHER': return { className: 'badge-neutral', text: 'Khác' };

      case 'URGENT': return { className: 'badge-danger', text: 'Khẩn cấp' };
      case 'HIGH': return { className: 'badge-warning', text: 'Cao' };
      case 'MEDIUM': return { className: 'badge-info', text: 'Trung bình' };
      case 'LOW': return { className: 'badge-neutral', text: 'Thấp' };

      default: return { className: 'badge-neutral', text: st };
    }
  };

  const { className, text } = getBadgeStyle(status);

  return <span className={`badge ${className}`}>{text}</span>;
};

interface PriorityBadgeProps {
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW' | string;
  showIcon?: boolean;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, showIcon = true }) => {
  const getStyle = (p: string) => {
    switch (p?.toUpperCase()) {
      case 'URGENT':
        return { className: 'badge-danger', text: 'Khẩn cấp', dotColor: '#ef4444' };
      case 'HIGH':
        return { className: 'badge-warning', text: 'Cao', dotColor: '#f97316' };
      case 'MEDIUM':
        return { className: 'badge-info', text: 'Trung bình', dotColor: '#3b82f6' };
      case 'LOW':
        return { className: 'badge-neutral', text: 'Thấp', dotColor: '#94a3b8' };
      default:
        return { className: 'badge-neutral', text: p || 'Thường', dotColor: '#94a3b8' };
    }
  };

  const { className, text, dotColor } = getStyle(priority);

  return (
    <span className={`badge ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      {showIcon && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: dotColor,
            display: 'inline-block',
          }}
        />
      )}
      {text}
    </span>
  );
};

interface FrequencyBadgeProps {
  frequency: string;
}

export const FrequencyBadge: React.FC<FrequencyBadgeProps> = ({ frequency }) => {
  const formatFreq = (freq: string) => {
    switch (freq?.toUpperCase()) {
      case 'DAILY': return 'Hàng ngày';
      case 'WEEKLY': return 'Hàng tuần';
      case 'MONTHLY': return 'Hàng tháng';
      case 'QUARTERLY': return 'Hàng quý (3 tháng)';
      case 'SEMI_ANNUALLY': return 'Nửa năm (6 tháng)';
      case 'YEARLY': return 'Hàng năm';
      default: return freq || 'Định kỳ';
    }
  };

  return <span className="badge badge-info">{formatFreq(frequency)}</span>;
};

