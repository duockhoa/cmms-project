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
exports.AnalyticsAuditAdapter = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const analytics_constants_1 = require("../analytics.constants");
let AnalyticsAuditAdapter = class AnalyticsAuditAdapter {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async logReportView(actedById, reportCode, metadata, correlationId) {
        try {
            const sanitizedMeta = this.sanitizeMetadata(metadata, correlationId);
            await this.prisma.workflowHistory.create({
                data: {
                    entityType: 'AnalyticsReport',
                    entityId: reportCode,
                    action: analytics_constants_1.ANALYTICS_AUDIT_ACTION.ANALYTICS_REPORT_VIEWED,
                    actedById,
                    comment: `Xem báo cáo Analytics: ${reportCode}`,
                    metadata: JSON.stringify(sanitizedMeta),
                },
            });
            return true;
        }
        catch (e) {
            console.error('[PRISMA AUDIT FAIL DETAILED]:', e);
            throw new common_1.InternalServerErrorException('Lỗi ghi nhật ký kiểm vết (Audit Log Failed). Hệ thống đã chặn trả dữ liệu theo chính sách Fail-Closed.');
        }
    }
    async logReportExport(actedById, exportCode, stagedArtifact, metadata, correlationId) {
        try {
            const sanitizedMeta = this.sanitizeMetadata({
                ...metadata,
                recordCount: stagedArtifact.recordCount,
                checksum: stagedArtifact.checksum,
            }, correlationId);
            await this.prisma.workflowHistory.create({
                data: {
                    entityType: 'AnalyticsExport',
                    entityId: exportCode,
                    action: analytics_constants_1.ANALYTICS_AUDIT_ACTION.ANALYTICS_REPORT_EXPORTED,
                    actedById,
                    comment: `Xuất file báo cáo Analytics: ${exportCode}`,
                    metadata: JSON.stringify(sanitizedMeta),
                },
            });
            return true;
        }
        catch (e) {
            console.error(`[AnalyticsAuditAdapter] Report Export Audit Failed: ${e?.message}`);
            if (stagedArtifact && typeof stagedArtifact.cleanUp === 'function') {
                try {
                    stagedArtifact.cleanUp();
                }
                catch (cleanupErr) {
                    console.error('[AnalyticsAuditAdapter] Staged artifact cleanup error:', cleanupErr);
                }
            }
            throw new common_1.InternalServerErrorException('Lỗi ghi nhật ký kiểm vết xuất file (Audit Log Failed). Thao tác xuất file đã bị hủy theo chính sách Fail-Closed.');
        }
    }
    sanitizeMetadata(rawMeta, correlationId) {
        if (!rawMeta || typeof rawMeta !== 'object') {
            return { correlationId };
        }
        const clean = { ...rawMeta, correlationId };
        delete clean.authorization;
        delete clean.password;
        delete clean.token;
        delete clean.secret;
        delete clean.bearer;
        return clean;
    }
};
exports.AnalyticsAuditAdapter = AnalyticsAuditAdapter;
exports.AnalyticsAuditAdapter = AnalyticsAuditAdapter = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnalyticsAuditAdapter);
//# sourceMappingURL=analytics-audit.adapter.js.map