"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttachmentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const RETENTION_POLICIES = {
    Equipment: 'HARD_DELETE',
    MaintenanceRequest: 'SOFT_DELETE',
    WorkOrder: 'SOFT_DELETE',
    ChecklistExecutionItem: 'SOFT_DELETE',
};
let AttachmentsService = class AttachmentsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.uploadDir = path.join(process.cwd(), 'uploads');
        this.allowedMimes = [
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
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }
    validateMagicNumber(buffer, mimetype) {
        if (!buffer || buffer.length < 4)
            return false;
        if (mimetype === 'image/png') {
            return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
        }
        if (mimetype === 'image/jpeg') {
            return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
        }
        if (mimetype === 'image/gif') {
            return buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;
        }
        if (mimetype === 'image/webp') {
            if (buffer.length < 12)
                return false;
            return buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
        }
        if (mimetype === 'application/pdf') {
            return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
        }
        if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
            return buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04;
        }
        if (mimetype === 'application/msword' || mimetype === 'application/vnd.ms-excel') {
            const isOle = buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0;
            const isZip = buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04;
            return isOle || isZip;
        }
        return false;
    }
    async validateParentEntity(entityType, entityId) {
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
            default:
                throw new common_1.BadRequestException(`Phân loại thực thể không hợp lệ: ${entityType}`);
        }
        if (!exists) {
            throw new common_1.BadRequestException(`Không tìm thấy thực thể liên kết với loại ${entityType} và ID ${entityId}`);
        }
    }
    async uploadFile(file, entityType, entityId, uploadedById, description) {
        if (!file) {
            throw new common_1.BadRequestException('Vui lòng cung cấp tệp tải lên');
        }
        await this.validateParentEntity(entityType, entityId);
        if (entityType === 'ChecklistExecutionItem') {
            const item = await this.prisma.checklistExecutionItem.findUnique({
                where: { id: entityId },
                include: { execution: true },
            });
            if (item && item.execution.status !== 'DRAFT') {
                throw new common_1.BadRequestException('Không thể thêm tệp đính kèm khi Checklist đã hoàn thành hoặc hủy.');
            }
        }
        if (file.size > 10 * 1024 * 1024) {
            throw new common_1.BadRequestException('Kích thước tệp vượt quá giới hạn cho phép (Tối đa 10MB)');
        }
        if (!this.allowedMimes.includes(file.mimetype)) {
            throw new common_1.BadRequestException(`Định dạng tệp không được hỗ trợ: ${file.mimetype}`);
        }
        if (!this.validateMagicNumber(file.buffer, file.mimetype)) {
            throw new common_1.BadRequestException(`Nội dung nhị phân của tệp không khớp với MIME type được khai báo: ${file.mimetype}`);
        }
        if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
            throw new common_1.BadRequestException('Tên tệp không hợp lệ (nghi vấn path traversal)');
        }
        const originalName = path.basename(file.originalname);
        const fileUuid = crypto.randomUUID();
        const ext = path.extname(originalName).toLowerCase();
        const fileName = `${fileUuid}${ext}`;
        const storagePath = path.join(this.uploadDir, fileName);
        fs.writeFileSync(storagePath, file.buffer);
        const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');
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
            },
        });
    }
    async getFileDetails(id) {
        const attachment = await this.prisma.attachment.findFirst({
            where: { id, isDeleted: false },
        });
        if (!attachment) {
            throw new common_1.NotFoundException(`Không tìm thấy tệp đính kèm với ID: ${id}`);
        }
        return attachment;
    }
    async downloadFile(id) {
        const attachment = await this.prisma.attachment.findFirst({
            where: { id, isDeleted: false },
        });
        if (!attachment) {
            throw new common_1.NotFoundException(`Không tìm thấy tệp đính kèm với ID: ${id}`);
        }
        const fullPath = path.join(process.cwd(), attachment.storagePath);
        if (!fs.existsSync(fullPath)) {
            throw new common_1.NotFoundException('Tệp vật lý không tồn tại trên hệ thống lưu trữ');
        }
        return {
            fullPath,
            originalName: attachment.originalName,
            fileType: attachment.fileType,
        };
    }
    async getAttachmentsForEntity(entityType, entityId) {
        return this.prisma.attachment.findMany({
            where: { entityType, entityId, isDeleted: false },
            orderBy: { createdAt: 'desc' },
        });
    }
    async deleteFile(id, expectedVersion) {
        return this.prisma.$transaction(async (tx) => {
            const attachment = await tx.attachment.findUnique({
                where: { id },
            });
            if (!attachment) {
                throw new common_1.NotFoundException(`Không tìm thấy tệp đính kèm với ID: ${id}`);
            }
            if (attachment.version !== expectedVersion) {
                throw new common_1.ConflictException('Xung đột đồng thời: Tệp đính kèm đã bị thay đổi bởi phiên làm việc khác.');
            }
            if (attachment.entityType === 'ChecklistExecutionItem') {
                const item = await tx.checklistExecutionItem.findUnique({
                    where: { id: attachment.entityId },
                    include: { execution: true },
                });
                if (item && item.execution.status !== 'DRAFT') {
                    throw new common_1.BadRequestException('Không thể xóa tệp đính kèm khi Checklist đã hoàn thành hoặc hủy.');
                }
            }
            const policy = RETENTION_POLICIES[attachment.entityType] || 'SOFT_DELETE';
            if (policy === 'HARD_DELETE') {
                const fullPath = path.join(process.cwd(), attachment.storagePath);
                if (fs.existsSync(fullPath)) {
                    try {
                        fs.unlinkSync(fullPath);
                    }
                    catch (e) {
                        console.error(`Lỗi xóa file vật lý: ${fullPath}`, e);
                    }
                }
                return tx.attachment.delete({
                    where: { id, version: expectedVersion },
                });
            }
            else {
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
};
exports.AttachmentsService = AttachmentsService;
exports.AttachmentsService = AttachmentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AttachmentsService);
//# sourceMappingURL=attachments.service.js.map