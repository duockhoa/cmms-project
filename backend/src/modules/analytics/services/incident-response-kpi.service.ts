import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { calculateWorkingHoursBetween, isExemptFrom4hSla } from '../../../common/utils/working-hours.helper';

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
    assignedAt?: string;
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

    // Loại trừ các yêu cầu đã bị hủy (CANCELLED) hoặc bị từ chối (REJECTED)
    where.status = { notIn: ['CANCELLED', 'REJECTED'] };

    const requests: any[] = await this.prisma.maintenanceRequest.findMany({
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
            assignedTechnicianId: true,
            assignedTechnicianIds: true,
            technicianName: true,
            assignedTechnician: {
              select: { name: true, department: true },
            },
            createdAt: true,
            initialRespondedAt: true,
            initialAssessment: true,
            executionLogs: {
              where: { actionType: 'ASSIGN' },
              orderBy: { recordedAt: 'asc' },
              take: 1,
              select: { recordedAt: true },
            },
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
      const linkedWo = req.workOrders?.[0];

      // 1. Loại trừ nếu xưởng tự xử lý (không tính vào KPI bộ phận hỗ trợ)
      if (linkedWo && linkedWo.handlingRoute === 'WORKSHOP_SELF_HANDLE') {
        continue;
      }

      // 2. Xác định mốc thời điểm giao việc cho KTV (assignedAt)
      let assignedAt: Date | null = null;
      if (linkedWo) {
        if (linkedWo.executionLogs && linkedWo.executionLogs.length > 0) {
          assignedAt = new Date(linkedWo.executionLogs[0].recordedAt);
        } else if (
          linkedWo.assignedTechnicianId ||
          (Array.isArray(linkedWo.assignedTechnicianIds as any) && (linkedWo.assignedTechnicianIds as any[]).length > 0)
        ) {
          assignedAt = new Date(linkedWo.createdAt);
        }
      }

      // 3. Nếu chưa giao KTV: sự cố vẫn đang chờ quản đốc phân công, chưa tính vào SLA phản hồi của KTV
      if (!assignedAt) {
        continue;
      }

      const workshopName = req.department || req.equipment?.department || 'Khác';
      const assessment = req.initialAssessment || linkedWo?.initialAssessment;

      // Xác định bộ phận hỗ trợ
      let supportDept = assessment?.assessorDepartment || linkedWo?.assignedTechnician?.department || 'Cơ điện';

      // Lọc theo bộ phận hỗ trợ nếu query yêu cầu
      if (query.supportDepartment && supportDept !== query.supportDepartment) {
        continue;
      }

      totalIncidents++;

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

      // 4. Kiểm tra sự cố trước mốc cutoff 10/11/2026 -> mặc định PASS
      const isHistorical = isExemptFrom4hSla(assignedAt);

      if (assessment && assessment.assessedAt) {
        // Đã có form đánh giá sơ bộ của KTV
        const assessDate = new Date(assessment.assessedAt);
        const durationHours = calculateWorkingHoursBetween(assignedAt, assessDate);
        sumResponseHours += durationHours;
        respondedCount++;
        deptStat.sumHours += durationHours;
        deptStat.respondedCount++;

        if (isHistorical || durationHours <= 4.0) {
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
            assignedAt: assignedAt.toISOString(),
            requestCreatedAt: req.createdAt.toISOString(),
            respondedAt: assessDate.toISOString(),
            hoursWaited: durationHours,
            status: 'Đã phản hồi (Trễ hạn làm việc)',
            preliminaryCause: assessment.preliminaryCause,
          });
        }
      } else {
        // Chưa có form đánh giá sơ bộ
        if (isHistorical) {
          // Lịch sử cũ trước cutoff: mặc định PASS
          respondedWithin4hCount++;
          deptStat.within4h++;
          wsStat.within4h++;
        } else {
          const workingHoursPassed = calculateWorkingHoursBetween(assignedAt, now);
          if (workingHoursPassed > 4.0) {
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
              assignedAt: assignedAt.toISOString(),
              requestCreatedAt: req.createdAt.toISOString(),
              respondedAt: undefined,
              hoursWaited: workingHoursPassed,
              status: 'Chưa có đánh giá sơ bộ (>4h làm việc)',
              preliminaryCause: undefined,
            });
          } else {
            pendingAwaitingResponseCount++;
          }
        }
      }
    }

    // Mẫu số chỉ tính các sự cố đã có kết quả (đã phản hồi trong 4h hoặc đã trễ hạn), loại trừ pending đang trong hạn
    const evaluatedTotal = respondedWithin4hCount + overdueResponseCount;
    const overallRate = evaluatedTotal > 0
      ? Math.round((respondedWithin4hCount / evaluatedTotal) * 10000) / 100
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
      const evaluated = st.within4h + st.overdue;
      const rate = evaluated > 0 ? Math.round((st.within4h / evaluated) * 10000) / 100 : 100;
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
      const evaluated = st.within4h + st.overdue;
      const rate = evaluated > 0 ? Math.round((st.within4h / evaluated) * 10000) / 100 : 100;
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
