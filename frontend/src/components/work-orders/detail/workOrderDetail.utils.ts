export type PerformerUnitType = 'WORKSHOP' | 'TECHNICAL' | 'MAINTENANCE';

export const getPerformerUnitType = (user: any): PerformerUnitType => {
  if (!user) return 'MAINTENANCE';
  const department = (user.department || '').toLowerCase();
  if (department.includes('cơ điện') || department.includes('kỹ thuật') || department.includes('technical') || user.role === 'ADMIN' || user.role === 'MANAGER') {
    return 'TECHNICAL';
  }
  if (department.includes('xưởng') || department.includes('px') || department.includes('workshop') || user.role === 'OPERATOR') {
    return 'WORKSHOP';
  }
  return 'MAINTENANCE';
};

export const getWorkOrderStatusLabel = (status: string) => {
  switch (status) {
    case 'PENDING': return 'Chờ xử lý';
    case 'ASSIGNED': return 'Đã phân công';
    case 'IN_PROGRESS': return 'Đang sửa chữa';
    case 'ON_HOLD': return 'Tạm dừng';
    case 'COMPLETED': return 'Chờ nghiệm thu';
    case 'VERIFIED': return 'Đã nghiệm thu';
    case 'CLOSED': return 'Đã đóng';
    case 'CANCELLED': return 'Đã hủy';
    default: return status;
  }
};

export const getWorkOrderStatusColor = (status: string) => {
  switch (status) {
    case 'ASSIGNED': return '#3b82f6';
    case 'IN_PROGRESS': return '#f59e0b';
    case 'ON_HOLD': return '#ef4444';
    case 'COMPLETED': return '#10b981';
    case 'VERIFIED': return '#059669';
    case 'CLOSED': return '#6b7280';
    case 'CANCELLED': return '#9ca3af';
    default: return '#374151';
  }
};
