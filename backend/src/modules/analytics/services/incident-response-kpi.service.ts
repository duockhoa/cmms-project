import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface IncidentResponseKpiSummary {
  period: {
    startDate?: string;
    endDate?: string;
  };
  overall: {
    totalIncidents: number;
    respondedWithin4hCount: number;
    overdueResponseCount: number;
    pendingAwaitingResponseCount: number;
    responseRateWithin4h: number; // Tỉ lệ % phản hồi <= 4h (đạt chuẩn SLA)
    averageResponseHours: number; // Số giờ phản hồi trung bình
    targetRate: number; // Chỉ tiêu KPI (mặc định 95%)
    status: 'EXCELLENT' | 'PASS' | 'WARNING' | 'FAIL';
  };
  bySupportDepartment: Array<{
    department: string;
    totalIncidents: number;
    respondedWithin4hCount: number;
    overdueResponseCount: number;
    responseRateWithin4h: number;
    averageResponseHours: number;
    status: 'PASS' | 'FAIL';
  }>;
  byWorkshop: Array<{
    workshop: string;
    totalIncidents: number;
    respondedWithin4hCount: number;
    overdueResponseCount: number;
    responseRateWithin4h: number;
  }>;
  overdueIncidents: Array<{
    requestId: string;
    requestCode: string;
    workOrderId?: string;
    orderCode?: string;
    equipmentCode?: string;
    equipmentName?: string;
    workshop?: string;
    supportDepartment?: string;
    requestCreatedAt: string;
    respondedAt?: string;
    hoursWaited: number;
    status: string;
    preliminaryCause?: string;
  }>;
}

@Injectable()
export class IncidentResponseKpiService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateIncidentResponseKpi(query: {
    startDate?: string;
    endDate?: string;
    supportDepartment?: string;
    workshop?: string;
  }): Promise<IncidentResponseKpiSummary> {
    const where: any = {};

    // Lọc theo khoảng thời gian sự cố phát sinh (request.createdAt)
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    // Lọc theo xưởng yêu cầu nếu có
    if (query.workshop) {
      where.department = query.workshop;
    }

    // Loại trừ các yêu cầu đã bị hủy (CANCELLED)
    where.status = { notIn: ['CANCELLED'] };

    const requests = await this.prisma.maintenanceRequest.findMany({
      where,
      include: {
        equipment: {
          select: { code: true, name: true, department: true },
        },
        workOrders: {
          select: {
            id: true,
            orderCode: true,
            handlingRoute: true,
            status: true,
            initialRespondedAt: true,
            initialAssessment: true,
          },
        },
        initialAssessment: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = Date.now();
    let totalIncidents = 0;
    let respondedWithin4hCount = 0;
    let overdueResponseCount = 0;
    let pendingAwaitingResponseCount = 0;
    let sumResponseHours = 0;
    let respondedCount = 0;

    const deptMap = new Map<string, { total: number; within4h: number; overdue: number; sumHours: number; respondedCount: number }>();
    const workshopMap = new Map<string, { total: number; within4h: number; overdue: number }>();
    const overdueList: any[] = [];

    for (const req of requests) {
      totalIncidents++;
      const reqCreatedMs = new Date(req.createdAt).getTime();
      const workshopName = req.department || req.equipment?.department || 'Khác';

      // Tìm thông tin đánh giá sơ bộ từ request hoặc workOrder liên kết
      const assessment = req.initialAssessment || req.workOrders?.[0]?.initialAssessment;
      const linkedWo = req.workOrders?.[0];

      // Xác định bộ phận hỗ trợ
      let supportDept = assessment?.assessorDepartment || 'Cơ điện';
      if (!assessment && linkedWo?.handlingRoute === 'WORKSHOP_SELF_HANDLE') {
        supportDept = 'Xưởng tự xử lý';
      }

      // Bộ lọc theo bộ phận hỗ trợ nếu query yêu cầu
      if (query.supportDepartment && supportDept !== query.supportDepartment) {
        totalIncidents--;
        continue;
      }

      // Khởi tạo stats theo bộ phận
      if (!deptMap.has(supportDept)) {
        deptMap.set(supportDept, { total: 0, within4h: 0, overdue: 0, sumHours: 0, respondedCount: 0 });
      }
      const deptStat = deptMap.get(supportDept)!;
      deptStat.total++;

      // Khởi tạo stats theo xưởng
      if (!workshopMap.has(workshopName)) {
        workshopMap.set(workshopName, { total: 0, within4h: 0, overdue: 0 });
      }
      const wsStat = workshopMap.get(workshopName)!;
      wsStat.total++;

      if (assessment && assessment.assessedAt) {
        // Đã có form đánh giá sơ bộ của KTV
        const assessMs = new Date(assessment.assessedAt).getTime();
        const durationHours = Math.round(((assessMs - reqCreatedMs) / (1000 * 3600)) * 100) / 100;
        sumResponseHours += durationHours;
        respondedCount++;
        deptStat.sumHours += durationHours;
        deptStat.respondedCount++;

        if (durationHours <= 4.0) {
          respondedWithin4hCount++;
          deptStat.within4h++;
          wsStat.within4h++;
        } else {
          overdueResponseCount++;
          deptStat.overdue++;
          wsStat.overdue++;
          overdueList.push({
            requestId: req.id,
            requestCode: req.requestCode,
            workOrderId: linkedWo?.id,
            orderCode: linkedWo?.orderCode,
            equipmentCode: req.equipment?.code,
            equipmentName: req.equipment?.name,
            workshop: workshopName,
            supportDepartment: supportDept,
            requestCreatedAt: req.createdAt.toISOString(),
            respondedAt: assessment.assessedAt.toISOString(),
            hoursWaited: durationHours,
            status: 'Đã phản hồi (Trễ hạn)',
            preliminaryCause: assessment.preliminaryCause,
          });
        }
      } else {
        // Chưa có form đánh giá sơ bộ
        const hoursPassed = (now - reqCreatedMs) / (1000 * 3600);
        if (hoursPassed > 4.0) {
          overdueResponseCount++;
          deptStat.overdue++;
          wsStat.overdue++;
          overdueList.push({
            requestId: req.id,
            requestCode: req.requestCode,
            workOrderId: linkedWo?.id,
            orderCode: linkedWo?.orderCode,
            equipmentCode: req.equipment?.code,
            equipmentName: req.equipment?.name,
            workshop: workshopName,
            supportDepartment: supportDept,
            requestCreatedAt: req.createdAt.toISOString(),
            respondedAt: undefined,
            hoursWaited: Math.round(hoursPassed * 10) / 10,
            status: 'Chưa có đánh giá sơ bộ (>4h)',
            preliminaryCause: undefined,
          });
        } else {
          pendingAwaitingResponseCount++;
        }
      }
    }

    const overallRate = totalIncidents > 0
      ? Math.round((respondedWithin4hCount / totalIncidents) * 10000) / 100
      : 100;
    const avgResponseHours = respondedCount > 0
      ? Math.round((sumResponseHours / respondedCount) * 100) / 100
      : 0;

    const targetRate = 95.0;
    let status: 'EXCELLENT' | 'PASS' | 'WARNING' | 'FAIL' = 'FAIL';
    if (overallRate >= 98.0) status = 'EXCELLENT';
    else if (overallRate >= targetRate) status = 'PASS';
    else if (overallRate >= 90.0) status = 'WARNING';

    const bySupportDepartment = Array.from(deptMap.entries()).map(([department, st]) => {
      const rate = st.total > 0 ? Math.round((st.within4h / st.total) * 10000) / 100 : 100;
      const avg = st.respondedCount > 0 ? Math.round((st.sumHours / st.respondedCount) * 100) / 100 : 0;
      return {
        department,
        totalIncidents: st.total,
        respondedWithin4hCount: st.within4h,
        overdueResponseCount: st.overdue,
        responseRateWithin4h: rate,
        averageResponseHours: avg,
        status: (rate >= targetRate ? 'PASS' : 'FAIL') as 'PASS' | 'FAIL',
      };
    });

    const byWorkshop = Array.from(workshopMap.entries()).map(([workshop, st]) => {
      const rate = st.total > 0 ? Math.round((st.within4h / st.total) * 10000) / 100 : 100;
      return {
        workshop,
        totalIncidents: st.total,
        respondedWithin4hCount: st.within4h,
        overdueResponseCount: st.overdue,
        responseRateWithin4h: rate,
      };
    });

    return {
      period: {
        startDate: query.startDate,
        endDate: query.endDate,
      },
      overall: {
        totalIncidents,
        respondedWithin4hCount,
        overdueResponseCount,
        pendingAwaitingResponseCount,
        responseRateWithin4h: overallRate,
        averageResponseHours: avgResponseHours,
        targetRate,
        status,
      },
      bySupportDepartment,
      byWorkshop,
      overdueIncidents: overdueList,
    };
  }
}
