import { Response } from 'express';
import { AttachmentsService } from './attachments.service';
export declare class AttachmentsController {
    private readonly attachmentsService;
    constructor(attachmentsService: AttachmentsService);
    uploadFile(file: any, entityType: string, entityId: string, uploadedById?: string, description?: string): Promise<{
        id: string;
        createdAt: Date;
        version: number;
        description: string | null;
        entityType: string;
        entityId: string;
        fileName: string;
        originalName: string;
        fileType: string;
        fileSize: number;
        storagePath: string;
        uploadedById: string | null;
        checksum: string;
        isDeleted: boolean;
        deletedAt: Date | null;
    }>;
    getAttachments(entityType: string, entityId: string): Promise<{
        id: string;
        createdAt: Date;
        version: number;
        description: string | null;
        entityType: string;
        entityId: string;
        fileName: string;
        originalName: string;
        fileType: string;
        fileSize: number;
        storagePath: string;
        uploadedById: string | null;
        checksum: string;
        isDeleted: boolean;
        deletedAt: Date | null;
    }[]>;
    downloadFile(id: string, res: Response): Promise<void>;
    deleteFile(id: string, expectedVersionStr: string): Promise<void>;
}
