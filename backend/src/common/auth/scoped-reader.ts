import { ForbiddenException } from '@nestjs/common';
import { hasPermission, isGlobalAdmin } from '../utils/rbac.helper';
import { equipmentScope, fabricationScope, scheduleScope } from './resource-scope';
import { buildRequestScopeWhere, buildWorkOrderScopeWhere } from '../utils/data-scope.helper';

/** Read-only, principal-bound DB adapter used by MCP tools. Actor is reloaded for each message. */
export function scopedReader(prisma: any, actor: any): any {
  const permissions: Record<string, string> = {
    equipment: 'equipment:view', maintenanceRequest: 'requests:view', workOrder: 'work_orders:view',
    maintenanceSchedule: 'schedules:view', inventoryItem: 'inventory:view', inventoryTransaction: 'inventory:view',
    checklistExecution: 'checklists:view', fabricationOrder: 'fabrication:view',
  };
  const scope = (model: string) => {
    if (!actor?.id || !hasPermission(actor, permissions[model])) throw new ForbiddenException('Không có quyền dùng công cụ cho dữ liệu này.');
    if (model === 'equipment') return equipmentScope(actor);
    if (model === 'maintenanceRequest') return buildRequestScopeWhere(actor);
    if (model === 'workOrder') return buildWorkOrderScopeWhere(actor);
    if (model === 'maintenanceSchedule') return scheduleScope(actor);
    if (model === 'fabricationOrder') return fabricationScope(actor);
    if (model === 'checklistExecution') return { workOrder: buildWorkOrderScopeWhere(actor) };
    return {};
  };
  return new Proxy({}, { get(_target, model: string) {
    if (model === '$queryRawUnsafe') return (...args: any[]) => {
      if (!isGlobalAdmin(actor) || process.env.MCP_SQL_ENABLED !== 'true') throw new ForbiddenException('SQL trực tiếp chưa được bật cho phiên này.');
      const sql = args[0];
      if (typeof sql !== 'string' || !/^\s*select\b/i.test(sql) || /;|\b(into|outfile|dumpfile|sleep|benchmark|for\s+update|lock)\b/i.test(sql)) throw new ForbiddenException('Chỉ cho phép một truy vấn SELECT giới hạn.');
      return prisma.$queryRawUnsafe(...args);
    };
    if (!permissions[model]) throw new ForbiddenException('Loại dữ liệu không có chính sách công cụ.');
    return new Proxy({}, { get(_delegate, operation: string) {
      if (!['findMany', 'findFirst', 'findUnique', 'count', 'groupBy', 'aggregate'].includes(operation)) throw new ForbiddenException('Công cụ chỉ được đọc dữ liệu.');
      return (options: any = {}) => {
        const filter = scope(model);
        const query = { ...options, where: { AND: [options.where || {}, filter] } };
        if (query.include || query.select) {
          const field = query.include ? 'include' : 'select';
          query[field] = { ...query[field] };
          for (const [relation, relatedModel] of Object.entries({ requests: 'maintenanceRequest', workOrders: 'workOrder', schedules: 'maintenanceSchedule' })) {
            if (!query[field][relation]) continue;
            query[field][relation] = hasPermission(actor, permissions[relatedModel])
              ? { ...(typeof query[field][relation] === 'object' ? query[field][relation] : {}), where: { AND: [query[field][relation]?.where || {}, scope(relatedModel)] } }
              : false;
          }
        }
        return prisma[model][operation === 'findUnique' ? 'findFirst' : operation](query);
      };
    } });
  } });
}
