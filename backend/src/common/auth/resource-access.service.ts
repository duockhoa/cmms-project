import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { equipmentScope, fabricationScope, scheduleScope } from './resource-scope';
import { buildRequestScopeWhere, buildWorkOrderScopeWhere } from '../utils/data-scope.helper';
import { hasPermission } from '../utils/rbac.helper';

@Injectable()
export class ResourceAccessService {
  constructor(private prisma: PrismaService) {}

  async assertRequest(controller: string, request: any) {
    const actor = request.user;
    const params = request.params || {};
    const body = request.body || {};
    if (controller === 'UsersController' && (body.role !== undefined || body.roleId !== undefined) && !hasPermission(actor, 'settings:roles')) {
      throw new ForbiddenException('Cần quyền quản lý nhóm quyền để thay đổi vai trò.');
    }
    if (controller === 'EquipmentController' && request.method === 'POST' && !params.id && !body.department && Object.keys(equipmentScope(actor)).length) {
      throw new ForbiddenException('Cần chọn bộ phận thiết bị thuộc phạm vi được phép.');
    }
    const equipmentId = params.equipmentId || (controller === 'EquipmentController' ? params.id : undefined) || body.equipmentId;
    if (equipmentId) await this.assert('equipment', { id: equipmentId }, equipmentScope(actor));
    if (controller === 'EquipmentController' && body.department) {
      const scope = equipmentScope(actor);
      if (Object.keys(scope).length && !scope.department?.in.includes(body.department)) throw new ForbiddenException('Thiết bị nằm ngoài bộ phận được phép.');
    }
    const sourceId = body.sourceEquipmentId;
    if (sourceId) await this.assert('equipment', { id: sourceId }, equipmentScope(actor));
    if (controller === 'RequestsController' && params.id) await this.assert('maintenanceRequest', { id: params.id }, buildRequestScopeWhere(actor));
    if (controller === 'WorkOrdersController' && (params.id || params.workOrderId)) {
      await this.assert('workOrder', { id: params.id || params.workOrderId }, buildWorkOrderScopeWhere(actor));
    }
    if (controller === 'ChecklistExecutionsController' && params.id) await this.assert('workOrder', { id: params.id }, buildWorkOrderScopeWhere(actor));
    if (controller === 'SchedulesController' && params.id) await this.assert('maintenanceSchedule', { id: params.id }, scheduleScope(actor));
    if (controller === 'FabricationController' && params.id) await this.assert('fabricationOrder', { id: params.id }, fabricationScope(actor));
    if (controller === 'GlobalOeeRecordsController' && params.recordId) {
      await this.assert('equipmentOeeRecord', { id: params.recordId }, { equipment: equipmentScope(actor) });
    }
    if (controller === 'RequestsController' && !equipmentId && body.equipmentCode) {
      const code = String(body.equipmentCode).replace(/^(cmms-equipment|equipment):/i, '').trim();
      await this.assert('equipment', { OR: [{ id: code }, { code }] }, equipmentScope(actor));
    }
  }
  private async assert(model: string, identity: any, scope: any) {
    if (!Object.keys(scope).length) return;
    const result = await (this.prisma as any)[model].findFirst({ where: { AND: [identity, scope] }, select: { id: true } });
    if (!result) throw new ForbiddenException('Tài nguyên không tồn tại trong phạm vi được phép.');
  }
}
