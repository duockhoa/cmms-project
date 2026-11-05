import { Prisma } from '@prisma/client';
import { ConflictException } from '@nestjs/common';

export type MergeReference = { model: string; field: string; json: boolean; versioned: boolean };
const extraReferences = [
  ['WorkflowHistory', 'performedById', false],
  ['Notification', 'userId', false],
  ['UtilityReading', 'voidedById', false],
  ['FabricationOrder', 'acceptedById', false],
  ['WorkOrder', 'assignedTechnicianIds', true],
  ['WorkOrder', 'supporterIds', true],
  ['FabricationOrder', 'supporterIds', true],
] as const;

export function userMergeReferences(): MergeReference[] {
  const references = new Map<string, MergeReference>();
  for (const model of Prisma.dmmf.datamodel.models) {
    if (model.name === 'User') continue;
    const versioned = model.fields.some(field => field.name === 'version' && field.type === 'Int');
    for (const relation of model.fields.filter(field => field.kind === 'object' && field.type === 'User')) {
      for (const field of relation.relationFromFields || []) {
        references.set(`${model.name}.${field}`, { model: model.name, field, json: false, versioned });
      }
    }
  }
  for (const [model, field, json] of extraReferences) {
    const definition = Prisma.dmmf.datamodel.models.find(item => item.name === model);
    if (!definition?.fields.some(item => item.name === field)) throw new Error(`Unknown merge reference: ${model}.${field}`);
    references.set(`${model}.${field}`, { model, field, json, versioned: definition.fields.some(item => item.name === 'version' && item.type === 'Int') });
  }
  return [...references.values()].sort((first, second) => `${first.model}.${first.field}`.localeCompare(`${second.model}.${second.field}`));
}

export function mergedUserIds(value: unknown, sourceId: string, targetId: string): unknown[] | null {
  let list = value;
  if (typeof list === 'string') {
    const encoded = list;
    try { list = JSON.parse(encoded); } catch {
      if (encoded.includes(sourceId)) throw new ConflictException('Danh sách phân công cũ không hợp lệ; cần chuẩn hóa trước khi gộp.');
      return null;
    }
  }
  if (!Array.isArray(list)) {
    if (JSON.stringify(value)?.includes(sourceId)) throw new ConflictException('Danh sách phân công không phải mảng ID hợp lệ.');
    return null;
  }
  if (list.some(id => typeof id !== 'string' && typeof id !== 'number') && JSON.stringify(list).includes(sourceId)) {
    throw new ConflictException('Danh sách phân công chứa phần tử không phải ID; cần đối soát trước khi gộp.');
  }
  if (!list.some(id => String(id) === sourceId)) return null;
  const seen = new Set<string>();
  return list.map(id => String(id) === sourceId ? targetId : id).filter(id => {
    const key = String(id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
