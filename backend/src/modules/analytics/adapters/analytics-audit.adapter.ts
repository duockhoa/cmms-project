import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ANALYTICS_AUDIT_ACTION } from '../analytics.constants';

export interface StagedArtifact {
  path?: string;
  buffer?: Buffer;
  recordCount: number;
  checksum?: string;
  cleanUp?: () => void;
}

@Injectable()
export class AnalyticsAuditAdapter {
  constructor(private prisma: PrismaService) {}

  /**
   * Logs sensitive analytics report view event to WorkflowHistory.
   * Fail-Closed: If audit writing fails, throws InternalServerErrorException (500).
   */
  async logReportView(
    actedById: string,
    reportCode: string,
    metadata: any,
    correlationId?: string
  ): Promise<boolean> {
    try {
      const sanitizedMeta = this.sanitizeMetadata(metadata, correlationId);

      await this.prisma.workflowHistory.create({
        data: {
          entityType: 'AnalyticsReport',
          entityId: reportCode,
          action: ANALYTICS_AUDIT_ACTION.ANALYTICS_REPORT_VIEWED,
          actedById,
          comment: `Xem báo cáo Analytics: ${reportCode}`,
          metadata: JSON.stringify(sanitizedMeta),
        },
      });

      return true;
    } catch (e: any) {
      console.error('[PRISMA AUDIT FAIL DETAILED]:', e);
      throw new InternalServerErrorException(
        'Lỗi ghi nhật ký kiểm vết (Audit Log Failed). Hệ thống đã chặn trả dữ liệu theo chính sách Fail-Closed.'
      );
    }
  }

  /**
   * Logs report export event to WorkflowHistory.
   * Fail-Closed: If audit writing fails, cleans up staged artifact and throws 500.
   */
  async logReportExport(
    actedById: string,
    exportCode: string,
    stagedArtifact: StagedArtifact,
    metadata: any,
    correlationId?: string
  ): Promise<boolean> {
    try {
      const sanitizedMeta = this.sanitizeMetadata(
        {
          ...metadata,
          recordCount: stagedArtifact.recordCount,
          checksum: stagedArtifact.checksum,
        },
        correlationId
      );

      await this.prisma.workflowHistory.create({
        data: {
          entityType: 'AnalyticsExport',
          entityId: exportCode,
          action: ANALYTICS_AUDIT_ACTION.ANALYTICS_REPORT_EXPORTED,
          actedById,
          comment: `Xuất file báo cáo Analytics: ${exportCode}`,
          metadata: JSON.stringify(sanitizedMeta),
        },
      });

      return true;
    } catch (e: any) {
      console.error(`[AnalyticsAuditAdapter] Report Export Audit Failed: ${e?.message}`);

      // Fail-Closed: Clean up staged artifact immediately
      if (stagedArtifact && typeof stagedArtifact.cleanUp === 'function') {
        try {
          stagedArtifact.cleanUp();
        } catch (cleanupErr) {
          console.error('[AnalyticsAuditAdapter] Staged artifact cleanup error:', cleanupErr);
        }
      }

      throw new InternalServerErrorException(
        'Lỗi ghi nhật ký kiểm vết xuất file (Audit Log Failed). Thao tác xuất file đã bị hủy theo chính sách Fail-Closed.'
      );
    }
  }

  /**
   * Removes sensitive credentials, passwords, and authorization tokens from audit metadata.
   */
  private sanitizeMetadata(rawMeta: any, correlationId?: string): Record<string, any> {
    if (!rawMeta || typeof rawMeta !== 'object') {
      return { correlationId };
    }

    const clean: Record<string, any> = { ...rawMeta, correlationId };

    delete clean.authorization;
    delete clean.password;
    delete clean.token;
    delete clean.secret;
    delete clean.bearer;

    return clean;
  }
}
