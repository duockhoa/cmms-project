import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UtilitiesService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // 1. QUẢN LÝ ĐIỂM ĐO & HỆ THỐNG PHỤ TRỢ
  // ==========================================
  async getPoints(query: {
    type?: string;
    location?: string;
    search?: string;
    isActive?: boolean;
  }) {
    const where: any = {};
    if (query.type) {
      where.type = query.type;
    }
    if (query.location) {
      where.location = { contains: query.location };
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }
    if (query.search) {
      where.OR = [
        { code: { contains: query.search } },
        { name: { contains: query.search } },
        { location: { contains: query.search } },
      ];
    }

    return this.prisma.utilityPoint.findMany({
      where,
      orderBy: [{ type: 'asc' }, { code: 'asc' }],
      include: {
        readings: {
          take: 1,
          orderBy: { recordedAt: 'desc' },
        },
        statusLogs: {
          take: 1,
          orderBy: { recordedAt: 'desc' },
        },
      },
    });
  }

  async getPointByIdOrCode(idOrCode: string) {
    const point = await this.prisma.utilityPoint.findFirst({
      where: {
        OR: [{ id: idOrCode }, { code: idOrCode }],
      },
      include: {
        readings: {
          take: 10,
          orderBy: { recordedAt: 'desc' },
        },
        statusLogs: {
          take: 10,
          orderBy: { recordedAt: 'desc' },
        },
      },
    });

    if (!point) {
      throw new NotFoundException(`Không tìm thấy điểm đo/hệ thống với mã hoặc ID: ${idOrCode}`);
    }

    return point;
  }

  async createPoint(data: any) {
    const existing = await this.prisma.utilityPoint.findUnique({
      where: { code: data.code.trim().toUpperCase() },
    });
    if (existing) {
      throw new BadRequestException(`Mã điểm đo ${data.code} đã tồn tại trên hệ thống.`);
    }

    return this.prisma.utilityPoint.create({
      data: {
        code: data.code.trim().toUpperCase(),
        name: data.name.trim(),
        type: data.type,
        location: data.location || 'Chưa xác định',
        tariffType: data.tariffType || 'SINGLE',
        multiplier: Number(data.multiplier) || 1.0,
        unit: data.unit || (data.type === 'ELECTRICITY' ? 'kWh' : data.type === 'WATER' ? 'm3' : 'Giờ'),
        currentStatus: data.currentStatus || 'RUNNING',
        lastReadingValue: Number(data.lastReadingValue) || 0,
        isSupplyMeter: Boolean(data.isSupplyMeter),
        description: data.description,
        isActive: data.isActive !== false,
      },
    });
  }

  async updatePoint(id: string, data: any) {
    await this.getPointByIdOrCode(id);

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.location !== undefined) updateData.location = data.location;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.tariffType !== undefined) updateData.tariffType = data.tariffType;
    if (data.multiplier !== undefined) updateData.multiplier = Number(data.multiplier);
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.currentStatus !== undefined) updateData.currentStatus = data.currentStatus;
    if (data.lastReadingValue !== undefined) updateData.lastReadingValue = Number(data.lastReadingValue);
    if (data.isSupplyMeter !== undefined) updateData.isSupplyMeter = Boolean(data.isSupplyMeter);
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    return this.prisma.utilityPoint.update({
      where: { id },
      data: updateData,
    });
  }

  async deletePoint(id: string) {
    return this.prisma.utilityPoint.delete({
      where: { id },
    });
  }

  // ==========================================
  // 2. GHI NHẬN CHỈ SỐ ĐIỆN / NƯỚC THEO CA
  // ==========================================
  async recordReading(
    data: {
      pointId?: string;
      code?: string;
      shift?: string;
      readingValue: number;
      normalValue?: number;
      peakValue?: number;
      offPeakValue?: number;
      powerKw?: number;
      powerFactorCosPhi?: number;
      imageUrl?: string;
      notes?: string;
    },
    actor: any,
  ) {
    // 1. Tìm điểm đo theo ID hoặc Code
    const point = await this.prisma.utilityPoint.findFirst({
      where: {
        OR: [
          ...(data.pointId ? [{ id: data.pointId }] : []),
          ...(data.code ? [{ code: data.code }] : []),
        ],
      },
      include: {
        readings: {
          take: 1,
          orderBy: { recordedAt: 'desc' },
        },
      },
    });

    if (!point) {
      throw new NotFoundException('Không tìm thấy điểm đo cần ghi nhận chỉ số.');
    }

    const previousValue =
      point.readings.length > 0
        ? point.readings[0].readingValue
        : point.lastReadingValue || 0;

    const multiplier = point.multiplier || 1.0;
    const diff = Number(data.readingValue) - previousValue;
    const consumption = diff >= 0 ? diff * multiplier : 0;
    const isAbnormal = diff < 0 || (diff > 0 && previousValue > 0 && diff > previousValue * 1.5);

    // 2. Tạo bản ghi chỉ số
    const reading = await this.prisma.utilityReading.create({
      data: {
        pointId: point.id,
        shift: data.shift || null,
        readingValue: Number(data.readingValue),
        previousValue: previousValue,
        consumption: Number(consumption.toFixed(2)),
        normalValue: data.normalValue ? Number(data.normalValue) : null,
        peakValue: data.peakValue ? Number(data.peakValue) : null,
        offPeakValue: data.offPeakValue ? Number(data.offPeakValue) : null,
        powerKw: data.powerKw ? Number(data.powerKw) : null,
        powerFactorCosPhi: data.powerFactorCosPhi ? Number(data.powerFactorCosPhi) : null,
        imageUrl: data.imageUrl,
        notes: data.notes,
        isAbnormal: isAbnormal,
        recordedById: actor?.id || 'system',
        recordedByName: actor?.name || actor?.email || 'Kỹ thuật viên',
      },
    });

    // 3. Cập nhật chỉ số mới nhất vào điểm đo
    await this.prisma.utilityPoint.update({
      where: { id: point.id },
      data: {
        lastReadingValue: Number(data.readingValue),
        lastReadingAt: new Date(),
      },
    });

    return reading;
  }

  async getReadings(query: {
    pointId?: string;
    type?: string;
    shift?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const where: any = {};
    if (query.pointId) {
      where.pointId = query.pointId;
    }
    if (query.type) {
      where.point = { type: query.type as any };
    }
    if (query.shift) {
      where.shift = query.shift;
    }
    if (query.startDate || query.endDate) {
      where.recordedAt = {};
      if (query.startDate) {
        where.recordedAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.recordedAt.lte = end;
      }
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.utilityReading.findMany({
        where,
        skip,
        take: limit,
        orderBy: { recordedAt: 'desc' },
        include: {
          point: true,
          recordedByUser: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      this.prisma.utilityReading.count({ where }),
    ]);

    const mappedItems = items.map((r) => ({
      ...r,
      consumptionDelta: r.consumption,
      recordedBy: r.recordedByUser || { name: r.recordedByName || '---' },
    }));

    return {
      items: mappedItems,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==========================================
  // 3. THEO DÕI BẬT / TẮT HỆ THỐNG PHỤ TRỢ
  // ==========================================
  async recordSystemStatus(
    data: {
      pointId?: string;
      code?: string;
      status: 'RUNNING' | 'OFF' | 'STANDBY' | 'FAULT' | 'MAINTENANCE';
      runningHours?: number;
      reason?: string;
      parametersJson?: string;
    },
    actor: any,
  ) {
    const point = await this.prisma.utilityPoint.findFirst({
      where: {
        OR: [
          ...(data.pointId ? [{ id: data.pointId }] : []),
          ...(data.code ? [{ code: data.code }] : []),
        ],
      },
      include: {
        statusLogs: {
          take: 1,
          orderBy: { recordedAt: 'desc' },
        },
      },
    });

    if (!point) {
      throw new NotFoundException('Không tìm thấy hệ thống phụ trợ.');
    }

    let runningDelta: number | null = null;
    if (data.runningHours !== undefined && data.runningHours !== null) {
      const prevHours = point.statusLogs.length > 0 ? point.statusLogs[0].runningHours || 0 : point.lastReadingValue || 0;
      runningDelta = Number(data.runningHours) >= prevHours ? Number(data.runningHours) - prevHours : 0;
    }

    const statusLog = await this.prisma.utilitySystemStatusLog.create({
      data: {
        pointId: point.id,
        status: data.status,
        runningHours: data.runningHours !== undefined ? Number(data.runningHours) : null,
        runningDelta: runningDelta,
        reason: data.reason,
        parametersJson: data.parametersJson,
        recordedById: actor?.id || 'system',
        recordedByName: actor?.name || actor?.email || 'Kỹ thuật viên',
      },
    });

    // Cập nhật trạng thái hệ thống
    await this.prisma.utilityPoint.update({
      where: { id: point.id },
      data: {
        currentStatus: data.status,
        ...(data.runningHours !== undefined ? { lastReadingValue: Number(data.runningHours) } : {}),
        lastReadingAt: new Date(),
      },
    });

    return statusLog;
  }

  async getStatusLogs(query: {
    pointId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const where: any = {};
    if (query.pointId) {
      where.pointId = query.pointId;
    }
    if (query.startDate || query.endDate) {
      where.recordedAt = {};
      if (query.startDate) {
        where.recordedAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.recordedAt.lte = end;
      }
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.utilitySystemStatusLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { recordedAt: 'desc' },
        include: {
          point: true,
          recordedByUser: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      this.prisma.utilitySystemStatusLog.count({ where }),
    ]);

    const mappedItems = items.map((log) => ({
      ...log,
      recordedBy: log.recordedByUser || { name: log.recordedByName || '---' },
    }));

    return {
      items: mappedItems,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==========================================
  // 4. BÁO CÁO & PHÂN TÍCH TIÊU THỤ NĂNG LƯỢNG
  // ==========================================
  async getAnalytics(query: { days?: number }) {
    const days = Number(query.days) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 1. Lấy tất cả readings trong khoảng thời gian
    const readings = await this.prisma.utilityReading.findMany({
      where: {
        recordedAt: { gte: startDate },
      },
      include: {
        point: true,
      },
      orderBy: { recordedAt: 'asc' },
    });

    // 2. Điểm đo và trạng thái hệ thống phụ trợ
    const allPoints = await this.prisma.utilityPoint.findMany({
      where: { isActive: true },
    });

    let totalElectricityToday = 0;
    let totalWaterToday = 0;
    let totalElectricityPeriod = 0;
    let totalWaterPeriod = 0;

    const dailyBreakdown: Record<string, { date: string; electricity: number; water: number }> = {};

    // Khởi tạo các ngày
    for (let i = 0; i <= days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      dailyBreakdown[key] = { date: key, electricity: 0, water: 0 };
    }

    readings.forEach((r) => {
      const dateKey = r.recordedAt.toISOString().split('T')[0];
      const isToday = r.recordedAt >= todayStart;

      if (r.point.type === 'ELECTRICITY') {
        totalElectricityPeriod += r.consumption;
        if (isToday) totalElectricityToday += r.consumption;
        if (dailyBreakdown[dateKey]) {
          dailyBreakdown[dateKey].electricity += r.consumption;
        }
      } else if (r.point.type === 'WATER') {
        totalWaterPeriod += r.consumption;
        if (isToday) totalWaterToday += r.consumption;
        if (dailyBreakdown[dateKey]) {
          dailyBreakdown[dateKey].water += r.consumption;
        }
      }
    });

    // 3. Thống kê trạng thái hệ thống phụ trợ
    const auxSystems = allPoints.filter((p) => p.type === 'SYSTEM_AUX');
    const systemStatusCounts = {
      RUNNING: auxSystems.filter((s) => s.currentStatus === 'RUNNING').length,
      OFF: auxSystems.filter((s) => s.currentStatus === 'OFF').length,
      STANDBY: auxSystems.filter((s) => s.currentStatus === 'STANDBY').length,
      FAULT: auxSystems.filter((s) => s.currentStatus === 'FAULT').length,
      MAINTENANCE: auxSystems.filter((s) => s.currentStatus === 'MAINTENANCE').length,
      TOTAL: auxSystems.length,
    };

    return {
      summary: {
        electricityToday: Math.round(totalElectricityToday * 100) / 100,
        waterToday: Math.round(totalWaterToday * 100) / 100,
        electricityPeriod: Math.round(totalElectricityPeriod * 100) / 100,
        waterPeriod: Math.round(totalWaterPeriod * 100) / 100,
        days,
      },
      systemStatusCounts,
      dailyTrends: Object.values(dailyBreakdown),
      auxSystems: auxSystems.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        location: s.location,
        status: s.currentStatus,
        lastRunningHours: s.lastReadingValue,
        lastUpdated: s.lastReadingAt,
      })),
      metersCount: {
        electricity: allPoints.filter((p) => p.type === 'ELECTRICITY').length,
        water: allPoints.filter((p) => p.type === 'WATER').length,
        aux: auxSystems.length,
      },
    };
  }

  // ==========================================
  // 5. BÁO CÁO TÍCH LŨY THEO KỲ (ĐIỆN & NƯỚC)
  // ==========================================
  async getCumulativeReport(query: {
    type?: 'ELECTRICITY' | 'WATER';
    month?: number;
    year?: number;
  }) {
    const type = query.type || 'ELECTRICITY';
    const month = Number(query.month) || (new Date().getMonth() + 1);
    const year = Number(query.year) || new Date().getFullYear();

    let startDate: Date;
    let endDate: Date;
    let cycleDescription: string;

    if (type === 'ELECTRICITY') {
      // Kỳ điện: Từ ngày 01 đến ngày cuối cùng của tháng đó
      startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
      endDate = new Date(year, month, 0, 23, 59, 59, 999);
      const lastDay = endDate.getDate();
      cycleDescription = `Từ 01/${String(month).padStart(2, '0')}/${year} đến ${String(lastDay).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    } else {
      // Kỳ nước: Từ ngày 21 của tháng liền kề trước đó đến ngày 20 của tháng tiếp theo
      startDate = new Date(year, month - 2, 21, 0, 0, 0, 0);
      endDate = new Date(year, month - 1, 20, 23, 59, 59, 999);
      const prevMonth = startDate.getMonth() + 1;
      const prevYear = startDate.getFullYear();
      cycleDescription = `Từ 21/${String(prevMonth).padStart(2, '0')}/${prevYear} đến 20/${String(month).padStart(2, '0')}/${year}`;
    }

    // 1. Lấy tất cả các điểm đo thuộc loại tiện ích này
    const points = await this.prisma.utilityPoint.findMany({
      where: {
        type: type as any,
        isActive: true,
      },
      include: {
        readings: {
          where: {
            recordedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          orderBy: { recordedAt: 'asc' },
        },
      },
      orderBy: [
        { isSupplyMeter: 'desc' },
        { code: 'asc' },
      ],
    });

    let totalSupply = 0;
    let totalConsumption = 0;
    let totalNormal = 0;
    let totalPeak = 0;
    let totalOffPeak = 0;

    const metersBreakdown = points.map((p) => {
      const readings = p.readings;
      const count = readings.length;

      let periodConsumption = 0;
      let startValue = p.lastReadingValue || 0;
      let endValue = p.lastReadingValue || 0;
      let normalVal = 0;
      let peakVal = 0;
      let offPeakVal = 0;

      if (count > 0) {
        startValue = readings[0].previousValue ?? readings[0].readingValue;
        endValue = readings[count - 1].readingValue;
        periodConsumption = readings.reduce((acc, r) => acc + (r.consumption || 0), 0);

        if (p.tariffType === 'THREE_PHASE') {
          const firstNormal = readings[0].normalValue || 0;
          const lastNormal = readings[count - 1].normalValue || 0;
          normalVal = Math.max(0, (lastNormal - firstNormal) * p.multiplier);

          const firstPeak = readings[0].peakValue || 0;
          const lastPeak = readings[count - 1].peakValue || 0;
          peakVal = Math.max(0, (lastPeak - firstPeak) * p.multiplier);

          const firstOffPeak = readings[0].offPeakValue || 0;
          const lastOffPeak = readings[count - 1].offPeakValue || 0;
          offPeakVal = Math.max(0, (lastOffPeak - firstOffPeak) * p.multiplier);
        }
      }

      periodConsumption = Number(periodConsumption.toFixed(2));
      const isSupply = Boolean(p.isSupplyMeter || p.code.includes('MSB') || p.code.includes('MAIN') || p.code.includes('TONG'));

      if (isSupply) {
        totalSupply += periodConsumption;
      } else {
        totalConsumption += periodConsumption;
      }

      if (p.tariffType === 'THREE_PHASE') {
        totalNormal += normalVal;
        totalPeak += peakVal;
        totalOffPeak += offPeakVal;
      }

      return {
        id: p.id,
        code: p.code,
        name: p.name,
        location: p.location,
        type: p.type,
        tariffType: p.tariffType,
        multiplier: p.multiplier,
        unit: p.unit,
        isSupplyMeter: isSupply,
        readingsCount: count,
        startValue,
        endValue,
        periodConsumption,
        normalConsumption: Number(normalVal.toFixed(2)),
        peakConsumption: Number(peakVal.toFixed(2)),
        offPeakConsumption: Number(offPeakVal.toFixed(2)),
      };
    });

    totalSupply = Number(totalSupply.toFixed(2));
    totalConsumption = Number(totalConsumption.toFixed(2));
    const delta = Number((totalSupply - totalConsumption).toFixed(2));
    const lossRate = totalSupply > 0 ? Number(((delta / totalSupply) * 100).toFixed(2)) : 0;

    const breakdownWithShare = metersBreakdown.map((m) => {
      let sharePercent = 0;
      if (!m.isSupplyMeter && totalConsumption > 0) {
        sharePercent = Number(((m.periodConsumption / totalConsumption) * 100).toFixed(2));
      } else if (m.isSupplyMeter && totalSupply > 0) {
        sharePercent = Number(((m.periodConsumption / totalSupply) * 100).toFixed(2));
      }
      return {
        ...m,
        sharePercent,
      };
    });

    return {
      type,
      month,
      year,
      cycleDescription,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      summary: {
        totalSupply,
        totalConsumption,
        delta,
        lossRate,
        unit: type === 'ELECTRICITY' ? 'kWh' : 'm³',
        threePhaseBreakdown: type === 'ELECTRICITY' ? {
          normal: Number(totalNormal.toFixed(2)),
          peak: Number(totalPeak.toFixed(2)),
          offPeak: Number(totalOffPeak.toFixed(2)),
        } : null,
      },
      supplyMeters: breakdownWithShare.filter((m) => m.isSupplyMeter),
      consumptionMeters: breakdownWithShare.filter((m) => !m.isSupplyMeter),
      allMeters: breakdownWithShare,
    };
  }
}
