import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AnalyticsDateWindowService } from './analytics-date-window.service';
import { AnalyticsScopeService, UserContext } from './analytics-scope.service';
import { AnalyticsQueryService } from './analytics-query.service';
import { KpiQueryDto } from '../dto/kpi-query.dto';
import {
  COMPLETED_WORK_ORDER_STATUSES,
  WORK_ORDER_CLASSIFICATION,
} from '../analytics.constants';
import { classifyWorkOrder } from '../utils/kpi-classifier.utility';
import { roundHalfUp } from '../utils/kpi-math.utility';
import { AnalyticsResponseDto } from '../contracts/analytics-response.contract';

export interface KpiMetricDetail {
  value: number | null;
  unit: string;
  isEstimated?: boolean;
  status?: 'OK' | 'ESTIMATED' | 'N/A';
  note?: string;
  sampleCount?: number;
  eligibleCount?: number;
  excludedCount?: number;
}

export interface DataQualityMeta {
  totalEvaluatedRecords: number;
  validRecords: number;
  uniqueExcludedRecords: number;
  qualityWarning?: string;
}

export interface KpiSummaryData {
  mttr: KpiMetricDetail;
  mtbf: KpiMetricDetail;
  repairDurationProxy: KpiMetricDetail;
  calendarAvailability: KpiMetricDetail;
  preventiveRatio: KpiMetricDetail;
  correctiveRatio: KpiMetricDetail;
  unclassifiedRatio: KpiMetricDetail;
  onTimeCompletionRate: KpiMetricDetail;
  averageResponseTime: KpiMetricDetail;
  averageRequestToWoCreationTime?: KpiMetricDetail;
  dataQuality: DataQualityMeta;
}

export function transformScopeForEquipment(scope: any): any {
  if (!scope || typeof scope !== 'object') return {};

  if (Array.isArray(scope.AND)) {
    return {
      ...scope,
      AND: scope.AND.map((item: any) => transformScopeForEquipment(item)),
    };
  }

  if (Array.isArray(scope.OR)) {
    return {
      ...scope,
      OR: scope.OR.map((item: any) => transformScopeForEquipment(item)),
    };
  }

  const transformed: any = {};
  for (const [key, val] of Object.entries(scope)) {
    if (key === 'schedule' && val && typeof val === 'object') {
      const schVal = val as any;
      if (schVal.assignedTechnicianId) {
        transformed.schedules = {
          some: {
            assignedTechnicianId: schVal.assignedTechnicianId,
          },
        };
      } else {
        transformed.schedules = { some: schVal };
      }
    } else if (key === 'technicianName' && typeof val === 'string') {
      transformed.workOrders = {
        some: {
          technicianName: val,
        },
      };
    } else if (key === 'request' && val && typeof val === 'object') {
      transformed.requests = {
        some: val,
      };
    } else if (key === 'department' && typeof val === 'string') {
      transformed.requests = {
        some: {
          department: val,
        },
      };
    } else {
      transformed[key] = val;
    }
  }

  return transformed;
}

@Injectable()
export class KpiEngineService {
  constructor(
    private prisma: PrismaService,
    private dateWindowService: AnalyticsDateWindowService,
    private queryService: AnalyticsQueryService,
    private scopeService: AnalyticsScopeService
  ) {}

  /**
   * Computes business KPI summary for CMMS executive & operational reporting.
   */
  async computeKpiSummary(
    dto: KpiQueryDto,
    user?: UserContext
  ): Promise<AnalyticsResponseDto<KpiSummaryData>> {
    const timezone = dto.timezone || 'Asia/Ho_Chi_Minh';
    const dateWindow = this.dateWindowService.resolveDateWindow(
      dto.startDate,
      dto.endDate,
      timezone
    );

    let serverScope: any = {};
    if (user) {
      if (user.role === 'MANAGER' && user.department && user.department.trim()) {
        const dept = user.department.trim();
        serverScope = {
          request: { department: dept },
        };
      } else {
        serverScope = this.scopeService.buildServerEnforcedScope(user);
      }
    }

    // 1. Calculate Equipment Count (Denominator for Availability) - Only for ADMIN where Availability is computed
    let nValidEquipment = 0;
    const skipEquipmentCount = user?.role === 'TECHNICIAN' || user?.role === 'MANAGER';

    if (!skipEquipmentCount) {
      const eqScope = transformScopeForEquipment(serverScope);
      if (dto.equipmentId) {
        const eqWhere = this.scopeService.combineFilters(eqScope, {
          id: dto.equipmentId,
          isActive: true,
        });
        const eqCount = await this.prisma.equipment.count({ where: eqWhere });
        nValidEquipment = eqCount > 0 ? 1 : 0;
      } else {
        const allEqWhere = this.scopeService.combineFilters(eqScope, { isActive: true });
        nValidEquipment = await this.prisma.equipment.count({ where: allEqWhere });
      }
    }

    // 2. Build Work Order query filter
    const userWoFilter: any = {
      createdAt: {
        gte: new Date(dateWindow.startInclusive),
        lt: new Date(dateWindow.endExclusive),
      },
    };
    if (dto.equipmentId) userWoFilter.equipmentId = dto.equipmentId;
    if (dto.technicianId) userWoFilter.technicianId = dto.technicianId;
    if (dto.priority) userWoFilter.priority = dto.priority;

    const finalWoWhere = this.scopeService.combineFilters(serverScope, userWoFilter);

    // 3. Fetch Work Orders for evaluation
    const allWorkOrders = await this.prisma.workOrder.findMany({
      where: finalWoWhere,
      select: {
        id: true,
        orderCode: true,
        scheduleId: true,
        requestId: true,
        status: true,
        priority: true,
        scheduledDueDate: true,
        plannedStartDate: true,
        actualStartDate: true,
        actualEndDate: true,
        completedAt: true,
        totalCost: true,
        createdAt: true,
        equipmentId: true,
        equipment: {
          select: { id: true, name: true },
        },
      },
    });

    // 4. Build scoped MaintenanceRequest filter
    const reqWhere: any = {
      createdAt: {
        gte: new Date(dateWindow.startInclusive),
        lt: new Date(dateWindow.endExclusive),
      },
    };
    if (dto.equipmentId) reqWhere.equipmentId = dto.equipmentId;

    if (user) {
      if (user.role === 'TECHNICIAN') {
        reqWhere.workOrders = {
          some: serverScope,
        };
      } else if (user.role === 'MANAGER' && user.department && user.department.trim()) {
        reqWhere.department = user.department.trim();
      }
    }

    const maintenanceRequests = await this.prisma.maintenanceRequest.findMany({
      where: reqWhere,
      select: {
        id: true,
        requestCode: true,
        createdAt: true,
        equipmentId: true,
        workOrders: {
          select: { id: true },
        },
      },
    });

    // Build map of workOrderId -> MaintenanceRequest with duplicate relation anomaly tracking
    const woToRequestMap = new Map<string, { id: string; createdAt: Date }>();
    const duplicateRequestWoIds = new Set<string>();

    for (const req of maintenanceRequests) {
      if (req.workOrders && req.workOrders.length > 0) {
        for (const wo of req.workOrders) {
          if (woToRequestMap.has(wo.id)) {
            // Anomaly: WO linked to multiple Maintenance Requests. Flag for exclusion instead of silent overwrite.
            duplicateRequestWoIds.add(wo.id);
          } else {
            woToRequestMap.set(wo.id, { id: req.id, createdAt: req.createdAt });
          }
        }
      }
    }

    // Anomaly & Data Quality tracking
    const uniqueExcludedRecordIds = new Set<string>();
    let totalEvaluated = allWorkOrders.length;

    // Filter completed WOs
    const completedWorkOrders = allWorkOrders.filter((wo) =>
      COMPLETED_WORK_ORDER_STATUSES.includes(wo.status as any)
    );

    // Classification buckets
    let preventiveCount = 0;
    let correctiveCount = 0;
    let unclassifiedCount = 0;
    let conflictedCount = 0;

    let totalRepairDurationHours = 0;
    let validMttrCount = 0;
    let mttrExcludedCount = 0;

    let onTimeCount = 0;
    let onTimeEligibleCount = 0;
    let onTimeExcludedCount = 0;

    for (const wo of completedWorkOrders) {
      const linkedReq = woToRequestMap.get(wo.id);
      const classification = classifyWorkOrder({
        scheduleId: wo.scheduleId,
        requestId: linkedReq ? linkedReq.id : null,
      });

      if (duplicateRequestWoIds.has(wo.id)) {
        conflictedCount++;
        uniqueExcludedRecordIds.add(wo.id);
      } else {
        switch (classification) {
          case WORK_ORDER_CLASSIFICATION.PREVENTIVE:
            preventiveCount++;
            break;
          case WORK_ORDER_CLASSIFICATION.CORRECTIVE:
            correctiveCount++;
            break;
          case WORK_ORDER_CLASSIFICATION.UNCLASSIFIED:
            unclassifiedCount++;
            break;
          case WORK_ORDER_CLASSIFICATION.CONFLICTED:
            conflictedCount++;
            uniqueExcludedRecordIds.add(wo.id);
            break;
        }
      }

      // MTTR & Repair Duration Proxy (Only for CORRECTIVE WOs)
      if (classification === WORK_ORDER_CLASSIFICATION.CORRECTIVE) {
        if (wo.actualStartDate && wo.actualEndDate) {
          const startMs = new Date(wo.actualStartDate).getTime();
          const endMs = new Date(wo.actualEndDate).getTime();

          if (endMs >= startMs) {
            const durationHours = (endMs - startMs) / (1000 * 3600);
            totalRepairDurationHours += durationHours;
            validMttrCount++;
          } else {
            // Anomaly: actualEndDate < actualStartDate
            uniqueExcludedRecordIds.add(wo.id);
            mttrExcludedCount++;
          }
        } else {
          mttrExcludedCount++;
        }
      }

      // On-Time Completion (Strictly uses completedAt and scheduledDueDate != null)
      if (wo.scheduledDueDate && wo.completedAt) {
        const completedMs = new Date(wo.completedAt).getTime();
        const dueMs = new Date(wo.scheduledDueDate).getTime();

        onTimeEligibleCount++;
        if (completedMs <= dueMs) {
          onTimeCount++;
        }
      } else {
        onTimeExcludedCount++;
      }
    }

    // Average Response Time & Request-to-WO Creation Time
    let totalResponseTimeHours = 0;
    let validResponseCount = 0;
    let responseExcludedCount = 0;

    let totalCreationTimeHours = 0;
    let validCreationCount = 0;

    for (const wo of allWorkOrders) {
      const linkedReq = woToRequestMap.get(wo.id);
      if (linkedReq) {
        const reqCreatedMs = new Date(linkedReq.createdAt).getTime();
        const woCreatedMs = new Date(wo.createdAt).getTime();

        if (woCreatedMs >= reqCreatedMs) {
          totalCreationTimeHours += (woCreatedMs - reqCreatedMs) / (1000 * 3600);
          validCreationCount++;
        }

        // Response time requires valid actualStartDate
        if (wo.actualStartDate) {
          const startMs = new Date(wo.actualStartDate).getTime();
          if (startMs >= reqCreatedMs) {
            totalResponseTimeHours += (startMs - reqCreatedMs) / (1000 * 3600);
            validResponseCount++;
          } else {
            uniqueExcludedRecordIds.add(wo.id);
            responseExcludedCount++;
          }
        } else {
          responseExcludedCount++;
        }
      }
    }

    // 5. Calculate KPI Metrics

    // A. MTTR
    const rawMttr = validMttrCount > 0 ? totalRepairDurationHours / validMttrCount : 0;
    let mttrMetric: KpiMetricDetail = {
      value: roundHalfUp(rawMttr),
      unit: 'hours',
      status: 'OK',
      sampleCount: validMttrCount,
      excludedCount: mttrExcludedCount,
    };

    // B. MTBF (Returns N/A in Phase 3.8B - Operating Hours history per period unavailable)
    const mtbfMetric: KpiMetricDetail = {
      value: null,
      unit: 'hours',
      isEstimated: false,
      status: 'N/A',
      note: 'Nguồn dữ liệu Operating Hours theo kỳ chưa sẵn có trong schema. MTBF trả về N/A.',
    };

    // C. Corrective Repair Duration Proxy
    let repairDurationMetric: KpiMetricDetail = {
      value: roundHalfUp(totalRepairDurationHours),
      unit: 'hours',
      isEstimated: true,
      status: 'ESTIMATED',
      note: 'Thời gian sửa chữa sự cố thực tế từ các WO Corrective',
      sampleCount: validMttrCount,
    };

    // D. Calendar-Based Availability
    let availabilityMetric: KpiMetricDetail;
    if (user?.role === 'TECHNICIAN') {
      availabilityMetric = {
        value: null,
        unit: 'percent',
        isEstimated: false,
        status: 'N/A',
        note: 'Không đủ quan hệ định danh để xác định đầy đủ Corrective downtime theo kỹ thuật viên.',
      };
    } else if (user?.role === 'MANAGER') {
      availabilityMetric = {
        value: null,
        unit: 'percent',
        isEstimated: false,
        status: 'N/A',
        note: 'Schema hiện tại chưa có trường department trực tiếp trên Equipment. Calendar Availability cho Manager trả về N/A để tránh suy luận sai từ lịch sử Request.',
      };
    } else if (nValidEquipment === 0) {
      availabilityMetric = {
        value: null,
        unit: 'percent',
        isEstimated: false,
        status: 'N/A',
        note: 'Không có thiết bị hợp lệ trong phạm vi truy cập',
      };
    } else {
      const windowStartMs = new Date(dateWindow.startInclusive).getTime();
      const windowEndMs = new Date(dateWindow.endExclusive).getTime();
      const calendarHoursPerEquipment = (windowEndMs - windowStartMs) / (1000 * 3600);
      const totalCalendarEquipmentHours = calendarHoursPerEquipment * nValidEquipment;

      const rawAvailability =
        totalCalendarEquipmentHours > 0
          ? Math.max(0, ((totalCalendarEquipmentHours - totalRepairDurationHours) / totalCalendarEquipmentHours) * 100)
          : 100;

      availabilityMetric = {
        value: roundHalfUp(rawAvailability),
        unit: 'percent',
        isEstimated: true,
        status: 'ESTIMATED',
        note: `Tính toán trên ${nValidEquipment} thiết bị với tổng ${roundHalfUp(totalCalendarEquipmentHours)} Calendar Equipment-Hours`,
        sampleCount: nValidEquipment,
      };
    }

    // E. Preventive, Corrective & Unclassified Ratios
    const totalCompleted = completedWorkOrders.length;
    const rawPrevRatio = totalCompleted > 0 ? (preventiveCount / totalCompleted) * 100 : 0;
    const rawCorrRatio = totalCompleted > 0 ? (correctiveCount / totalCompleted) * 100 : 0;
    const rawUnclassRatio = totalCompleted > 0 ? (unclassifiedCount / totalCompleted) * 100 : 0;

    let prevRatioMetric: KpiMetricDetail = {
      value: roundHalfUp(rawPrevRatio),
      unit: 'percent',
      status: 'OK',
      sampleCount: preventiveCount,
      eligibleCount: totalCompleted,
    };

    let corrRatioMetric: KpiMetricDetail = {
      value: roundHalfUp(rawCorrRatio),
      unit: 'percent',
      status: 'OK',
      sampleCount: correctiveCount,
      eligibleCount: totalCompleted,
    };

    let unclassRatioMetric: KpiMetricDetail = {
      value: roundHalfUp(rawUnclassRatio),
      unit: 'percent',
      status: 'OK',
      sampleCount: unclassifiedCount,
      eligibleCount: totalCompleted,
    };

    // F. On-Time Completion Rate
    const rawOnTimeRate = onTimeEligibleCount > 0 ? (onTimeCount / onTimeEligibleCount) * 100 : 100;
    let onTimeMetric: KpiMetricDetail = {
      value: roundHalfUp(rawOnTimeRate),
      unit: 'percent',
      status: 'OK',
      sampleCount: onTimeCount,
      eligibleCount: onTimeEligibleCount,
      excludedCount: onTimeExcludedCount,
    };

    // G. Average Response Time
    const rawAvgResponse = validResponseCount > 0 ? totalResponseTimeHours / validResponseCount : 0;
    let avgResponseMetric: KpiMetricDetail = {
      value: roundHalfUp(rawAvgResponse),
      unit: 'hours',
      status: 'OK',
      sampleCount: validResponseCount,
      excludedCount: responseExcludedCount,
    };

    // H. Supporting Metric: Average Request-to-WO Creation Time
    const rawAvgCreation = validCreationCount > 0 ? totalCreationTimeHours / validCreationCount : 0;
    let avgCreationMetric: KpiMetricDetail = {
      value: roundHalfUp(rawAvgCreation),
      unit: 'hours',
      status: 'OK',
      note: 'Supporting diagnostic metric – không thuộc 8 KPI nghiệp vụ chính.',
      sampleCount: validCreationCount,
    };

    // TECHNICIAN Role Metrics Policy:
    // Schema lacks assignedTechnicianId FK on Corrective WorkOrders.
    // Incomplete dataset -> ALL aggregate metrics return N/A instead of false 100%/0% values.
    if (user?.role === 'TECHNICIAN') {
      const techNaNote = 'Không thể xác định đầy đủ phạm vi Work Order (thiếu quan hệ khóa ngoại ID cho Corrective Work Order).';
      mttrMetric = {
        value: null,
        unit: 'hours',
        isEstimated: false,
        status: 'N/A',
        note: techNaNote,
      };
      repairDurationMetric = {
        value: null,
        unit: 'hours',
        isEstimated: false,
        status: 'N/A',
        note: techNaNote,
      };
      prevRatioMetric = {
        value: null,
        unit: 'percent',
        isEstimated: false,
        status: 'N/A',
        note: techNaNote,
      };
      corrRatioMetric = {
        value: null,
        unit: 'percent',
        isEstimated: false,
        status: 'N/A',
        note: techNaNote,
      };
      unclassRatioMetric = {
        value: null,
        unit: 'percent',
        isEstimated: false,
        status: 'N/A',
        note: techNaNote,
      };
      onTimeMetric = {
        value: null,
        unit: 'percent',
        isEstimated: false,
        status: 'N/A',
        note: techNaNote,
      };
      avgResponseMetric = {
        value: null,
        unit: 'hours',
        isEstimated: false,
        status: 'N/A',
        note: techNaNote,
      };
      avgCreationMetric = {
        value: null,
        unit: 'hours',
        isEstimated: false,
        status: 'N/A',
        note: techNaNote,
      };
    }

    // MANAGER Role Preventive Scope Gap Handling:
    // Schema lacks department on Equipment/Schedule. Manager cannot scope Preventive WOs.
    if (user?.role === 'MANAGER') {
      const mgrRatioNote = 'Schema hiện tại chưa có trường department trên Equipment/Schedule. Manager không thể scope đầy đủ Preventive Work Orders.';
      prevRatioMetric = {
        value: null,
        unit: 'percent',
        isEstimated: false,
        status: 'N/A',
        note: mgrRatioNote,
      };
      corrRatioMetric = {
        value: null,
        unit: 'percent',
        isEstimated: false,
        status: 'N/A',
        note: mgrRatioNote,
      };
      unclassRatioMetric = {
        value: null,
        unit: 'percent',
        isEstimated: false,
        status: 'N/A',
        note: mgrRatioNote,
      };
      onTimeMetric = {
        value: null,
        unit: 'percent',
        isEstimated: false,
        status: 'N/A',
        note: 'Schema hiện tại chưa có trường department trên Equipment/Schedule. On-Time Completion Rate tổng thể cho Manager trả về N/A.',
      };
    }



    // 6. Data Quality Metadata
    const validCount = totalEvaluated - uniqueExcludedRecordIds.size;
    const dataQuality: DataQualityMeta = {
      totalEvaluatedRecords: totalEvaluated,
      validRecords: Math.max(0, validCount),
      uniqueExcludedRecords: uniqueExcludedRecordIds.size,
      ...(uniqueExcludedRecordIds.size > 0
        ? { qualityWarning: `Có ${uniqueExcludedRecordIds.size} bản ghi vi phạm quy tắc dữ liệu (thời gian âm hoặc phân loại xung đột) đã bị loại khỏi các phép tính.` }
        : {}),
    };

    const kpiSummaryData: KpiSummaryData = {
      mttr: mttrMetric,
      mtbf: mtbfMetric,
      repairDurationProxy: repairDurationMetric,
      calendarAvailability: availabilityMetric,
      preventiveRatio: prevRatioMetric,
      correctiveRatio: corrRatioMetric,
      unclassifiedRatio: unclassRatioMetric,
      onTimeCompletionRate: onTimeMetric,
      averageResponseTime: avgResponseMetric,
      averageRequestToWoCreationTime: avgCreationMetric,
      dataQuality,
    };

    return this.queryService.formatResponse(
      kpiSummaryData,
      dateWindow,
      timezone,
      dto,
      undefined,
      dto.correlationId
    );
  }
}
