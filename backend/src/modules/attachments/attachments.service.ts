import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const RETENTION_POLICIES: Record<string, 'HARD_DELETE' | 'SOFT_DELETE'> = {
  Equipment: 'HARD_DELETE',
  MaintenanceRequest: 'SOFT_DELETE',
  WorkOrder: 'SOFT_DELETE',
  ChecklistExecutionItem: 'SOFT_DELETE',
  WorkOrderExecutionLog: 'SOFT_DELETE',
};

@Injectable()
export class AttachmentsService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads');
  private readonly allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  constructor(private readonly prisma: PrismaService) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  private validateMagicNumber(buffer: Buffer, mimetype: string): boolean {
    if (!buffer || buffer.length < 4) return false;

    // PNG
    if (mimetype === 'image/png') {
      return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
    }
    // JPEG
    if (mimetype === 'image/jpeg') {
      return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
    }
    // GIF
    if (mimetype === 'image/gif') {
      return buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;
    }
    // WEBP
    if (mimetype === 'image/webp') {
      if (buffer.length < 12) return false;
      return buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
    }
    // PDF
    if (mimetype === 'application/pdf') {
      return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
    }
    // DOCX, XLSX (ZIP Container)
    if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      return buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04;
    }
    // DOC, XLS (OLE or ZIP Container)
    if (mimetype === 'application/msword' || mimetype === 'application/vnd.ms-excel') {
      const isOle = buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0;
      const isZip = buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04;
      return isOle || isZip;
    }

    return false;
  }

  private async validateParentEntity(entityType: string, entityId: string) {
    let exists = false;
    switch (entityType) {
      case 'Equipment':
        const eq = await this.prisma.equipment.findUnique({ where: { id: entityId } });
        exists = !!eq;
        break;
      case 'MaintenanceRequest':
        const req = await this.prisma.maintenanceRequest.findUnique({ where: { id: entityId } });
        exists = !!req;
        break;
      case 'WorkOrder':
        const wo = await this.prisma.workOrder.findUnique({ where: { id: entityId } });
        exists = !!wo;
        break;
      case 'ChecklistExecutionItem':
        const item = await this.prisma.checklistExecutionItem.findUnique({ where: { id: entityId } });
        exists = !!item;
        break;
      case 'WorkOrderExecutionLog':
        const log = await this.prisma.workOrderExecutionLog.findUnique({ where: { id: entityId } });
        exists = !!log;
        break;
      default:
        throw new BadRequestException(`Phân loại thực thể không hợp lệ: ${entityType}`);
    }

    if (!exists) {
      throw new BadRequestException(`Không tìm thấy thực thể liên kết với loại ${entityType} và ID ${entityId}`);
    }
  }

  async uploadFile(
    file: any,
    entityType: string,
    entityId: string,
    uploadedById?: string,
    description?: string,
    workOrderId?: string,
    executionLogId?: string,
    photoCategory?: string
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng cung cấp tệp tải lên');
    }

    // Validation: Entity
    await this.validateParentEntity(entityType, entityId);

    if (entityType === 'ChecklistExecutionItem') {
      const item = await this.prisma.checklistExecutionItem.findUnique({
        where: { id: entityId },
        include: { execution: true },
      });
      if (item && item.execution.status !== 'DRAFT') {
        throw new BadRequestException('Không thể thêm tệp đính kèm khi Checklist đã hoàn thành hoặc hủy.');
      }
    }

    // Validation: File Size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('Kích thước tệp vượt quá giới hạn cho phép (Tối đa 10MB)');
    }

    // Validation: MIME Type header check
    if (!this.allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(`Định dạng tệp không được hỗ trợ: ${file.mimetype}`);
    }

    // Magic number validation on binary content
    if (!this.validateMagicNumber(file.buffer, file.mimetype)) {
      throw new BadRequestException(`Nội dung nhị phân của tệp không khớp với MIME type được khai báo: ${file.mimetype}`);
    }

    // Check Path Traversal
    if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
      throw new BadRequestException('Tên tệp không hợp lệ (nghi vấn path traversal)');
    }
    const originalName = path.basename(file.originalname);

    // Generate safe UUID name
    const fileUuid = crypto.randomUUID();
    const ext = path.extname(originalName).toLowerCase();
    const fileName = `${fileUuid}${ext}`;
    const storagePath = path.join(this.uploadDir, fileName);

    // Write file physically
    fs.writeFileSync(storagePath, file.buffer);

    // Calculate SHA-256 Checksum on binary content
    const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');

    // Save Attachment record
    return this.prisma.attachment.create({
      data: {
        entityType,
        entityId,
        fileName,
        originalName,
        fileType: file.mimetype,
        fileSize: file.size,
        storagePath: `uploads/${fileName}`,
        uploadedById: uploadedById || null,
        description: description || null,
        checksum,
        workOrderId: workOrderId || null,
        executionLogId: executionLogId || null,
        photoCategory: photoCategory || null,
      },
    });
  }

  async getFileDetails(id: string) {
    const attachment = await this.prisma.attachment.findFirst({
      where: { id, isDeleted: false },
    });
    if (!attachment) {
      throw new NotFoundException(`Không tìm thấy tệp đính kèm với ID: ${id}`);
    }
    return attachment;
  }

  async downloadFile(id: string) {
    const attachment = await this.prisma.attachment.findFirst({
      where: { id, isDeleted: false },
    });
    if (!attachment) {
      throw new NotFoundException(`Không tìm thấy tệp đính kèm với ID: ${id}`);
    }

    const fullPath = path.join(process.cwd(), attachment.storagePath);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException('Tệp vật lý không tồn tại trên hệ thống lưu trữ');
    }

    return {
      fullPath,
      originalName: attachment.originalName,
      fileType: attachment.fileType,
    };
  }

  async getAttachmentsForEntity(entityType: string, entityId: string) {
    return this.prisma.attachment.findMany({
      where: { entityType, entityId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteFile(id: string, expectedVersion: number) {
    return this.prisma.$transaction(async (tx) => {
      const attachment = await tx.attachment.findUnique({
        where: { id },
      });
      if (!attachment) {
        throw new NotFoundException(`Không tìm thấy tệp đính kèm với ID: ${id}`);
      }

      if (attachment.version !== expectedVersion) {
        throw new ConflictException('Xung đột đồng thời: Tệp đính kèm đã bị thay đổi bởi phiên làm việc khác.');
      }

      if (attachment.entityType === 'ChecklistExecutionItem') {
        const item = await tx.checklistExecutionItem.findUnique({
          where: { id: attachment.entityId },
          include: { execution: true },
        });
        if (item && item.execution.status !== 'DRAFT') {
          throw new BadRequestException('Không thể xóa tệp đính kèm khi Checklist đã hoàn thành hoặc hủy.');
        }
      }

      const policy = RETENTION_POLICIES[attachment.entityType] || 'SOFT_DELETE';

      if (policy === 'HARD_DELETE') {
        const fullPath = path.join(process.cwd(), attachment.storagePath);
        if (fs.existsSync(fullPath)) {
          try {
            fs.unlinkSync(fullPath);
          } catch (e) {
            console.error(`Lỗi xóa file vật lý: ${fullPath}`, e);
          }
        }
        return tx.attachment.delete({
          where: { id, version: expectedVersion },
        });
      } else {
        return tx.attachment.update({
          where: { id, version: expectedVersion },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
            version: { increment: 1 },
          },
        });
      }
    });
  }
}
