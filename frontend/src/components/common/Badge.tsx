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

      case 'IN_PROGRESS': return { className: 'badge-info', text: 'Đang thực hiện' };
      case 'INSPECTION': return { className: 'badge-warning', text: 'Nghiệm thu' };
      case 'COMPLETED': return { className: 'badge-success', text: 'Hoàn thành' };
      case 'CANCELLED': return { className: 'badge-neutral', text: 'Đã hủy' };

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
