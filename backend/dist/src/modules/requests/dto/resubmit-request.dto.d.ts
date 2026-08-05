export declare class ResubmitRequestDto {
    expectedVersion: number;
    actedById: string;
    comment?: string;
    updatedFields?: {
        title?: string;
        description?: string;
        priority?: string;
        reporterName?: string;
        department?: string;
        images?: string;
    };
}
