import { ChecklistItemStatus } from '@prisma/client';
export declare class PatchChecklistItemDto {
    itemIndex: number;
    status: ChecklistItemStatus;
    comment?: string;
    expectedVersion: number;
}
