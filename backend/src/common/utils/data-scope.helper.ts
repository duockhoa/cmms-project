import { isGlobalAdmin, UserWithPermissions } from './rbac.helper';

/**
 * Xây dựng điều kiện lọc (Prisma WHERE clause) cho MaintenanceRequest
 * dựa trên vai trò và phòng ban của người dùng đang đăng nhập.
 */
export function buildRequestScopeWhere(actor?: UserWithPermissions | null): any {
  if (!actor) return {};

  // 1. Quản trị viên tối cao: Toàn quyền xem mọi sự cố trong nhà máy
  if (isGlobalAdmin(actor)) {
    return {};
  }

  const role = (actor.role || '').toUpperCase();
  const dept = (actor.department || '').trim();

  // 2. Quản lý phân xưởng (MANAGER): Chỉ xem các sự cố thuộc phân xưởng/phòng ban mình phụ trách
  if (role === 'MANAGER') {
    if (dept) {
      return {
        OR: [
          { department: { contains: dept } },
          { equipment: { department: { contains: dept } } },
        ],
      };
    }
    return {};
  }

  // 3. Nhân viên vận hành (OPERATOR) hoặc người dùng thông thường (USER):
  // Chỉ xem các sự cố do chính mình báo cáo hoặc thuộc phân xưởng của mình
  if (role === 'OPERATOR' || role === 'USER') {
    if (dept) {
      return {
        OR: [
          { reporterId: actor.id },
          { department: { contains: dept } },
          { equipment: { department: { contains: dept } } },
        ],
      };
    }
    return { reporterId: actor.id };
  }

  // 4. Kỹ thuật viên bảo trì (TECHNICIAN):
  // Được xem các sự cố để tiếp nhận xử lý, hoặc thuộc tổ kỹ thuật
  return {};
}

/**
 * Xây dựng điều kiện lọc (Prisma WHERE clause) cho WorkOrder
 * dựa trên vai trò và phòng ban của người dùng đang đăng nhập.
 */
export function buildWorkOrderScopeWhere(actor?: UserWithPermissions | null): any {
  if (!actor) return {};

  // 1. Quản trị viên tối cao: Toàn quyền xem mọi phiếu sửa chữa
  if (isGlobalAdmin(actor)) {
    return {};
  }

  const role = (actor.role || '').toUpperCase();
  const dept = (actor.department || '').trim();

  // 2. Quản lý phân xưởng: Xem các phiếu sửa chữa của máy móc thuộc xưởng mình
  if (role === 'MANAGER') {
    if (dept) {
      return {
        OR: [
          { equipment: { department: { contains: dept } } },
          { request: { department: { contains: dept } } },
        ],
      };
    }
    return {};
  }

  // 3. Nhân viên vận hành máy (OPERATOR):
  // Chỉ xem các phiếu sửa chữa phát sinh từ sự cố của mình hoặc xưởng mình để chuẩn bị nghiệm thu bàn giao
  if (role === 'OPERATOR' || role === 'USER') {
    if (dept) {
      return {
        OR: [
          { request: { reporterId: actor.id } },
          { equipment: { department: { contains: dept } } },
          { request: { department: { contains: dept } } },
        ],
      };
    }
    return { request: { reporterId: actor.id } };
  }

  // 4. Kỹ thuật viên (TECHNICIAN):
  // Thấy các phiếu được phân công cho mình (hoặc chưa phân công để nhận việc)
  return {};
}
