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
      case 'INSPECTION': return { className: 'badge-warning', text: 'Nghiệm thu' };
      case 'COMPLETED': return { className: 'badge-success', text: 'Hoàn thành' };
      case 'VERIFIED': return { className: 'badge-success', text: 'Đã nghiệm thu' };
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
