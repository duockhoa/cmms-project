import { PrismaService } from '../../../prisma/prisma.service';
export interface StagedArtifact {
    path?: string;
    buffer?: Buffer;
    recordCount: number;
    checksum?: string;
    cleanUp?: () => void;
}
export declare class AnalyticsAuditAdapter {
    private prisma;
    constructor(prisma: PrismaService);
    logReportView(actedById: string, reportCode: string, metadata: any, correlationId?: string): Promise<boolean>;
    logReportExport(actedById: string, exportCode: string, stagedArtifact: StagedArtifact, metadata: any, correlationId?: string): Promise<boolean>;
    private sanitizeMetadata;
}
