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

    const points = await this.prisma.utilityPoint.findMany({
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

    return points.map((p) => {
      if (p.type === 'SYSTEM_AUX') {
        const baseHours = p.lastReadingValue || 0;
        const startAt = p.lastReadingAt || (p.statusLogs.length > 0 ? p.statusLogs[0].recordedAt : null);
        if (p.currentStatus === 'RUNNING' && startAt) {
          const elapsedMs = Math.max(0, Date.now() - new Date(startAt).getTime());
          const elapsedHours = Math.round((elapsedMs / (1000 * 60 * 60)) * 10) / 10;
          const liveRunningHours = Math.round((baseHours + elapsedHours) * 10) / 10;
          return {
            ...p,
            liveRunningHours,
            sessionHours: elapsedHours,
          };
        }
        return {
          ...p,
          liveRunningHours: baseHours,
          sessionHours: 0,
        };
      }
      return p;
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
        isRecycledWater: Boolean(data.isRecycledWater),
        isExcludedFromTotal: Boolean(data.isExcludedFromTotal),
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
    if (data.isRecycledWater !== undefined) updateData.isRecycledWater = Boolean(data.isRecycledWater);
    if (data.isExcludedFromTotal !== undefined) updateData.isExcludedFromTotal = Boolean(data.isExcludedFromTotal);
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
  // 1.1 THIẾT LẬP CHỈ SỐ ĐẦU KỲ (TRIỂN KHAI HỆ THỐNG)
  // ==========================================
  async setBaselineReading(
    id: string,
    data: { baselineValue: number; notes?: string },
    actor: any,
  ) {
    const point = await this.prisma.utilityPoint.findUnique({
      where: { id },
      include: {
        readings: {
          orderBy: { recordedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!point) {
      throw new NotFoundException('Không tìm thấy điểm đo tiện ích.');
    }

    const val = Number(data.baselineValue);
    if (isNaN(val) || val < 0) {
      throw new BadRequestException('Chỉ số đầu kỳ phải là số dương hợp lệ (>= 0).');
    }

    // 1. Cập nhật chỉ số đầu kỳ trên điểm đo
    const updatedPoint = await this.prisma.utilityPoint.update({
      where: { id: point.id },
      data: {
        lastReadingValue: val,
        lastReadingAt: new Date(),
      },
    });

    // 2. Tạo hoặc đồng bộ bản ghi mốc đầu kỳ trong nhật ký UtilityReading
    if (point.readings.length === 0) {
      await this.prisma.utilityReading.create({
        data: {
          pointId: point.id,
          readingValue: val,
          previousValue: val,
          consumption: 0,
          notes: data.notes || 'Chỉ số đầu kỳ khởi tạo từ Cài đặt hệ thống',
          recordedById: actor?.id || null,
          recordedByName: actor?.name || actor?.email || 'Quản trị viên',
        },
      });
    } else if (point.readings.length === 1 && point.readings[0].consumption === 0) {
      await this.prisma.utilityReading.update({
        where: { id: point.readings[0].id },
        data: {
          readingValue: val,
          previousValue: val,
          notes: data.notes || 'Chỉ số đầu kỳ điều chỉnh từ Cài đặt hệ thống',
        },
      });
    } else {
      // Đã có bản ghi đo thực tế, tạo bản ghi mốc hiệu chỉnh
      await this.prisma.utilityReading.create({
        data: {
          pointId: point.id,
          readingValue: val,
          previousValue: val,
          consumption: 0,
          notes: data.notes || 'Hiệu chỉnh chỉ số mốc từ Cài đặt hệ thống',
          recordedById: actor?.id || null,
          recordedByName: actor?.name || actor?.email || 'Quản trị viên',
        },
      });
    }

    return updatedPoint;
  }

  async batchSetBaselines(
    items: Array<{ id: string; baselineValue: number; notes?: string }>,
    actor: any,
  ) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('Danh sách cập nhật chỉ số đầu kỳ không hợp lệ.');
    }
    const results = [];
    for (const item of items) {
      if (item.id && item.baselineValue !== undefined && !isNaN(Number(item.baselineValue))) {
        const res = await this.setBaselineReading(item.id, item, actor);
        results.push(res);
      }
    }
    return results;
  }

  // ==========================================
  // 1.2 THIẾT LẬP CHỈ SỐ ĐẦU KỲ THEO CHU KỲ TÍNH TOÁN (ĐIỆN & NƯỚC)
  // ==========================================
  isSupplyPoint(p: { isSupplyMeter?: boolean }): boolean {
    return Boolean(p.isSupplyMeter);
  }

  isRecycledPoint(p: { isRecycledWater?: boolean }): boolean {
    return Boolean(p.isRecycledWater);
  }

  getPeriodCycleInfo(type: 'ELECTRICITY' | 'WATER', month: number, year: number) {
    let startDate: Date;
    let endDate: Date;
    let cycleDescription: string;
    let startDayLabel: string;

    if (type === 'ELECTRICITY') {
      // Kỳ điện: Từ 00:00 ngày đầu tháng đến 23:59:59 ngày cuối cùng của tháng đó
      const lastDay = new Date(year, month, 0).getDate();
      startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
      endDate = new Date(year, month, 0, 23, 59, 59, 999);
      cycleDescription = `Từ 01/${String(month).padStart(2, '0')}/${year} đến ${String(lastDay).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
      startDayLabel = `00:00 ngày 01/${String(month).padStart(2, '0')}/${year}`;
    } else {
      // Kỳ nước: Từ 00:00 ngày 21 của tháng trước đến 23:59:59 ngày 20 của tháng hiện tại
      startDate = new Date(year, month - 2, 21, 0, 0, 0, 0);
      endDate = new Date(year, month - 1, 20, 23, 59, 59, 999);
      const prevMonth = startDate.getMonth() + 1;
      const prevYear = startDate.getFullYear();
      cycleDescription = `Từ 21/${String(prevMonth).padStart(2, '0')}/${prevYear} đến 20/${String(month).padStart(2, '0')}/${year}`;
      startDayLabel = `00:00 ngày 21/${String(prevMonth).padStart(2, '0')}/${prevYear}`;
    }

    return { startDate, endDate, cycleDescription, startDayLabel };
  }

  async getPeriodBaselines(query: { month?: number; year?: number }) {
    const month = Number(query.month) || (new Date().getMonth() + 1);
    const year = Number(query.year) || new Date().getFullYear();

    const elecCycle = this.getPeriodCycleInfo('ELECTRICITY', month, year);
    const waterCycle = this.getPeriodCycleInfo('WATER', month, year);

    const points = await this.prisma.utilityPoint.findMany({
      where: {
        type: { in: ['ELECTRICITY', 'WATER'] },
        isActive: true,
      },
      include: {
        readings: {
          where: { isVoided: false },
          orderBy: { recordedAt: 'asc' },
        },
      },
      orderBy: [
        { isSupplyMeter: 'desc' },
        { type: 'asc' },
        { code: 'asc' },
      ],
    });

    const items = points.map((p) => {
      const isElec = p.type === 'ELECTRICITY';
      const cycle = isElec ? elecCycle : waterCycle;
      const isSupply = Boolean(p.isSupplyMeter);
      const isRecycled = Boolean(p.isRecycledWater);
      const isExcluded = Boolean(p.isExcludedFromTotal);

      // Tìm bản ghi trong khoảng chu kỳ
      const periodReadings = p.readings.filter(
        (r) => r.recordedAt >= cycle.startDate && r.recordedAt <= cycle.endDate,
      );

      // Tìm bản ghi mốc đầu kỳ (consumption = 0 hoặc bản ghi chốt tại cycle.startDate)
      let baselineRecord = periodReadings.find(
        (r) =>
          (r.consumption === 0 || r.recordedAt.getTime() === cycle.startDate.getTime()) &&
          (r.notes?.includes('đầu kỳ') || r.notes?.includes('mốc') || r.notes?.includes('baseline')),
      );

      // Tìm bản ghi cuối cùng ngay trước chu kỳ
      const lastReadingBefore = p.readings
        .filter((r) => r.recordedAt < cycle.startDate)
        .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())[0];

      let baselineValue = 0;
      let hasExistingBaseline = false;

      if (baselineRecord) {
        baselineValue = baselineRecord.previousValue ?? baselineRecord.readingValue;
        hasExistingBaseline = true;
      } else if (lastReadingBefore) {
        baselineValue = lastReadingBefore.readingValue;
        hasExistingBaseline = true;
      } else if (periodReadings.length > 0) {
        baselineValue =
          periodReadings[0].previousValue && periodReadings[0].previousValue > 0
            ? periodReadings[0].previousValue
            : periodReadings[0].readingValue;
        hasExistingBaseline = true;
      } else {
        baselineValue = p.lastReadingValue ?? 0;
      }

      return {
        pointId: p.id,
        code: p.code,
        name: p.name,
        type: p.type,
        location: p.location,
        unit: p.unit,
        multiplier: p.multiplier,
        isSupplyMeter: isSupply,
        isRecycledWater: isRecycled,
        isExcludedFromTotal: isExcluded,
        cycleDescription: cycle.cycleDescription,
        cycleStartDate: cycle.startDate,
        cycleEndDate: cycle.endDate,
        startDayLabel: cycle.startDayLabel,
        baselineValue: Number(Number(baselineValue).toFixed(2)),
        hasExistingBaseline,
        lastReadingValue: p.lastReadingValue,
        lastReadingAt: p.lastReadingAt,
      };
    });

    return {
      month,
      year,
      elecCycle,
      waterCycle,
      supplyMeters: items.filter((i) => i.isSupplyMeter && !i.isExcludedFromTotal),
      consumptionMeters: items.filter((i) => !i.isSupplyMeter && !i.isRecycledWater && !i.isExcludedFromTotal),
      recycledMeters: items.filter((i) => i.isRecycledWater && !i.isExcludedFromTotal),
      excludedMeters: items.filter((i) => i.isExcludedFromTotal),
      allMeters: items,
    };
  }

  async setPeriodBaseline(
    data: {
      pointId: string;
      month: number;
      year: number;
      baselineValue: number;
      currentValue?: number;
      notes?: string;
    },
    actor: any,
  ) {
    const point = await this.prisma.utilityPoint.findUnique({
      where: { id: data.pointId },
    });
    if (!point) {
      throw new NotFoundException('Không tìm thấy điểm đo.');
    }
    const val = Number(data.baselineValue);
    if (isNaN(val) || val < 0) {
      throw new BadRequestException('Chỉ số đầu kỳ phải là số dương (>= 0).');
    }

    const month = Number(data.month);
    const year = Number(data.year);
    const cycle = this.getPeriodCycleInfo(point.type as any, month, year);

    // 1. Kiểm tra / cập nhật bản ghi mốc đầu kỳ tại cycle.startDate
    const existingBaseline = await this.prisma.utilityReading.findFirst({
      where: {
        pointId: point.id,
        recordedAt: {
          gte: cycle.startDate,
          lte: new Date(cycle.startDate.getTime() + 60 * 60 * 1000),
        },
      },
    });

    if (existingBaseline) {
      await this.prisma.utilityReading.update({
        where: { id: existingBaseline.id },
        data: {
          readingValue: val,
          previousValue: val,
          consumption: 0,
          notes: data.notes || `Chỉ số chốt đầu kỳ tính toán Tháng ${month}/${year} (${cycle.cycleDescription})`,
        },
      });
    } else {
      await this.prisma.utilityReading.create({
        data: {
          pointId: point.id,
          recordedAt: cycle.startDate,
          readingValue: val,
          previousValue: val,
          consumption: 0,
          notes: data.notes || `Chỉ số chốt đầu kỳ tính toán Tháng ${month}/${year} (${cycle.cycleDescription})`,
          recordedById: actor?.id || null,
          recordedByName: actor?.name || actor?.email || 'Quản trị viên',
        },
      });
    }

    // 2. Xử lý chỉ số đến ngày hiện tại (currentValue)
    const currVal =
      data.currentValue !== undefined && !isNaN(Number(data.currentValue))
        ? Number(data.currentValue)
        : point.lastReadingValue && point.lastReadingValue > val
        ? point.lastReadingValue
        : val;

    if (currVal < val) {
      throw new BadRequestException(
        `Chỉ số hiện tại (${currVal}) không được nhỏ hơn chỉ số đầu kỳ (${val})!`,
      );
    }

    if (currVal > val) {
      const now = new Date();
      const currentReadingTime = now > cycle.endDate ? cycle.endDate : now;
      const diff = currVal - val;
      const consumption = Number((diff * (point.multiplier || 1.0)).toFixed(2));

      // Kiểm tra xem đã có bản ghi đọc số sau mốc đầu kỳ chưa
      const existingCurrentReading = await this.prisma.utilityReading.findFirst({
        where: {
          pointId: point.id,
          recordedAt: {
            gt: new Date(cycle.startDate.getTime() + 60 * 60 * 1000),
            lte: cycle.endDate,
          },
        },
        orderBy: { recordedAt: 'desc' },
      });

      if (existingCurrentReading) {
        await this.prisma.utilityReading.update({
          where: { id: existingCurrentReading.id },
          data: {
            readingValue: currVal,
            previousValue: val,
            consumption: consumption,
            notes: `Chỉ số cập nhật đến ngày hiện tại (Kỳ Tháng ${month}/${year})`,
          },
        });
      } else {
        await this.prisma.utilityReading.create({
          data: {
            pointId: point.id,
            recordedAt: currentReadingTime,
            readingValue: currVal,
            previousValue: val,
            consumption: consumption,
            notes: `Chỉ số cập nhật đến ngày hiện tại (Kỳ Tháng ${month}/${year})`,
            recordedById: actor?.id || null,
            recordedByName: actor?.name || actor?.email || 'Quản trị viên',
          },
        });
      }

      await this.prisma.utilityPoint.update({
        where: { id: point.id },
        data: {
          lastReadingValue: currVal,
          lastReadingAt: currentReadingTime,
        },
      });
    } else {
      await this.prisma.utilityPoint.update({
        where: { id: point.id },
        data: {
          lastReadingValue: val,
          lastReadingAt: cycle.startDate,
        },
      });
    }

    return {
      success: true,
      pointId: point.id,
      month,
      year,
      baselineValue: val,
      currentValue: currVal,
      cycleDescription: cycle.cycleDescription,
      startDayLabel: cycle.startDayLabel,
    };
  }

  async batchSetPeriodBaselines(
    body: {
      month: number;
      year: number;
      items: Array<{
        pointId: string;
        baselineValue: number;
        currentValue?: number;
        notes?: string;
      }>;
    },
    actor: any,
  ) {
    if (!Array.isArray(body.items) || body.items.length === 0) {
      throw new BadRequestException('Danh sách cập nhật không hợp lệ.');
    }
    const results = [];
    for (const item of body.items) {
      if (item.pointId && item.baselineValue !== undefined && !isNaN(Number(item.baselineValue))) {
        const res = await this.setPeriodBaseline(
          {
            pointId: item.pointId,
            month: body.month,
            year: body.year,
            baselineValue: item.baselineValue,
            currentValue: item.currentValue,
            notes: item.notes,
          },
          actor,
        );
        results.push(res);
      }
    }
    return results;
  }

  // ==========================================
  // 2. GHI NHẬN CHỈ SỐ ĐIỆN / NƯỚC THEO CA
  // ==========================================
  // HÀM CHUẨN HÓA SỐ TỪ CHUẨN VIỆT NAM HOẶC QUỐC TẾ
  // ==========================================
  private parseLocaleNumber(val: any): number | null {
    if (val === undefined || val === null || val === '') return null;
    if (typeof val === 'number') return isNaN(val) ? null : val;
    let s = String(val).trim();
    if (s.includes('.') && s.includes(',')) {
      if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
        // Định dạng VN: 1.234,56
        s = s.replace(/\./g, '').replace(',', '.');
      } else {
        // Định dạng US: 1,234.56
        s = s.replace(/,/g, '');
      }
    } else if (s.includes(',') && !s.includes('.')) {
      // Định dạng số thập phân VN: 1234,56
      s = s.replace(',', '.');
    }
    const n = Number(s);
    return isNaN(n) ? null : n;
  }

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
          where: { isVoided: false },
          take: 1,
          orderBy: { recordedAt: 'desc' },
        },
      },
    });

    if (!point) {
      throw new NotFoundException('Không tìm thấy điểm đo cần ghi nhận chỉ số.');
    }

    const previousReading = point.readings.length > 0 ? point.readings[0] : null;
    const previousValue =
      previousReading ? previousReading.readingValue : point.lastReadingValue || 0;

    const newReading = this.parseLocaleNumber(data.readingValue);
    if (newReading === null) {
      throw new BadRequestException('Chỉ số ghi nhận không hợp lệ.');
    }

    // Cơ chế chặn: Số sau không được nhỏ hơn số trước
    if (previousValue > 0 && newReading < previousValue) {
      throw new BadRequestException(
        `Chỉ số mới (${newReading}) không được nhỏ hơn chỉ số trước (${previousValue}) của điểm đo ${point.code} - ${point.name}. Vui lòng kiểm tra lại mặt đồng hồ!`,
      );
    }

    const normalVal = this.parseLocaleNumber(data.normalValue);
    const peakVal = this.parseLocaleNumber(data.peakValue);
    const offPeakVal = this.parseLocaleNumber(data.offPeakValue);
    const powerKw = this.parseLocaleNumber(data.powerKw);
    const cosPhi = this.parseLocaleNumber(data.powerFactorCosPhi);

    // Kiểm tra các chỉ số thành phần 3 biểu giá (nếu có)
    if (normalVal !== null && previousReading?.normalValue && normalVal < previousReading.normalValue) {
      throw new BadRequestException(
        `Chỉ số giờ bình thường T1 (${normalVal}) không được nhỏ hơn chỉ số trước (${previousReading.normalValue}). Vui lòng kiểm tra lại!`,
      );
    }
    if (peakVal !== null && previousReading?.peakValue && peakVal < previousReading.peakValue) {
      throw new BadRequestException(
        `Chỉ số giờ cao điểm T2 (${peakVal}) không được nhỏ hơn chỉ số trước (${previousReading.peakValue}). Vui lòng kiểm tra lại!`,
      );
    }
    if (offPeakVal !== null && previousReading?.offPeakValue && offPeakVal < previousReading.offPeakValue) {
      throw new BadRequestException(
        `Chỉ số giờ thấp điểm T3 (${offPeakVal}) không được nhỏ hơn chỉ số trước (${previousReading.offPeakValue}). Vui lòng kiểm tra lại!`,
      );
    }

    const multiplier = point.multiplier || 1.0;
    const diff = newReading - previousValue;
    const consumption = diff >= 0 ? diff * multiplier : 0;
    const isAbnormal = previousValue > 0 && diff > previousValue * 1.5;

    // 2. Tạo bản ghi chỉ số
    const reading = await this.prisma.utilityReading.create({
      data: {
        pointId: point.id,
        shift: data.shift || null,
        readingValue: newReading,
        previousValue: previousValue,
        consumption: Number(consumption.toFixed(2)),
        normalValue: normalVal,
        peakValue: peakVal,
        offPeakValue: offPeakVal,
        powerKw: powerKw,
        powerFactorCosPhi: cosPhi,
        imageUrl: data.imageUrl,
        notes: data.notes,
        isAbnormal: isAbnormal,
        recordedById: actor?.id || null,
        recordedByName: actor?.name || actor?.email || 'Kỹ thuật viên',
      },
    });

    // 3. Cập nhật chỉ số mới nhất vào điểm đo
    await this.prisma.utilityPoint.update({
      where: { id: point.id },
      data: {
        lastReadingValue: newReading,
        lastReadingAt: new Date(),
      },
    });

    return reading;
  }

  // ==========================================
  // 2.1 ĐỒNG BỘ CHỈ SỐ ĐIỆN TỰ ĐỘNG TỪ AMISS (EVN)
  // ==========================================
    /**
   * Chuẩn hóa chuỗi thời gian về Date theo múi giờ Việt Nam (UTC+7)
   */
  parseVietnamDate(dateStr: any): Date | null {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;
    const str = String(dateStr).trim();
    // Khớp DD/MM/YYYY HH:mm hoặc DD/MM/YYYY HH:mm:ss
    const matchDmy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
    if (matchDmy) {
      const [, d, m, y, h, min, s] = matchDmy;
      const year = Number(y);
      const month = Number(m) - 1;
      const day = Number(d);
      const hour = Number(h || 0);
      const minute = Number(min || 0);
      const sec = Number(s || 0);
      return new Date(Date.UTC(year, month, day, hour - 7, minute, sec));
    }
    // Khớp YYYY-MM-DD HH:mm(:ss) hoặc ISO
    const matchYmd = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
    if (matchYmd) {
      const [, y, m, d, h, min, s] = matchYmd;
      const year = Number(y);
      const month = Number(m) - 1;
      const day = Number(d);
      const hour = Number(h || 0);
      const minute = Number(min || 0);
      const sec = Number(s || 0);
      return new Date(Date.UTC(year, month, day, hour - 7, minute, sec));
    }
    const parsed = new Date(str);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  /**
   * Thực thi thao tác database với cơ chế thử lại tự động khi gặp deadlock hoặc transaction conflict
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    delayMs = 100,
  ): Promise<T> {
    let lastError: any;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (err: any) {
        lastError = err;
        const isDeadlock =
          err?.code === 'P2034' ||
          err?.code === 'ER_LOCK_DEADLOCK' ||
          err?.message?.includes('Deadlock') ||
          err?.message?.includes('Lock wait timeout');
        if (isDeadlock && attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, attempt - 1)));
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  }

  /**
   * Tính toán lại chuỗi thời gian liên hoàn cho một điểm đo từ mốc sớm nhất bị ảnh hưởng
   */
  async recalculatePointTimeline(
    tx: any,
    pointId: string,
    minAffectedDate?: Date,
  ): Promise<{ updatedCount: number; readingsCount: number }> {
    const point = await tx.utilityPoint.findUnique({
      where: { id: pointId },
    });
    if (!point) return { updatedCount: 0, readingsCount: 0 };

    const multiplier = point.multiplier || 1.0;

    // 1. Tìm mốc neo (anchor) liền trước minAffectedDate
    let anchor: any = null;
    if (minAffectedDate) {
      anchor = await tx.utilityReading.findFirst({
        where: {
          pointId,
          isVoided: false,
          recordedAt: { lt: minAffectedDate },
        },
        orderBy: [{ recordedAt: 'desc' }, { id: 'desc' }],
      });
    }

    // 2. Lấy tất cả các bản ghi từ minAffectedDate trở đi
    const subsequentReadings = await tx.utilityReading.findMany({
      where: {
        pointId,
        isVoided: false,
        ...(minAffectedDate ? { recordedAt: { gte: minAffectedDate } } : {}),
      },
      orderBy: [{ recordedAt: 'asc' }, { id: 'asc' }],
    });

    if (subsequentReadings.length === 0) {
      return { updatedCount: 0, readingsCount: 0 };
    }

    let updatedCount = 0;

    // 3. Duyệt tuần tự để tính lại previousValue và consumption
    for (let i = 0; i < subsequentReadings.length; i++) {
      const reading = subsequentReadings[i];
      const prevReading = i === 0 ? anchor : subsequentReadings[i - 1];

      let targetPrevVal: number | null = null;
      let targetConsumption: number | null = null;
      let isAbnormal = reading.isAbnormal;
      let notes = reading.notes;

      if (!prevReading) {
        // Bản ghi đầu tiên trong lịch sử điểm đo
        const isBaseline =
          reading.notes?.toLowerCase().includes('đầu kỳ') ||
          reading.previousValue === reading.readingValue;
        if (isBaseline) {
          targetPrevVal = reading.readingValue;
          targetConsumption = 0;
        } else {
          targetPrevVal = reading.previousValue ?? reading.readingValue;
          const diff = Math.max(0, reading.readingValue - targetPrevVal);
          targetConsumption = Number((diff * multiplier).toFixed(2));
        }
      } else {
        targetPrevVal = prevReading.readingValue;

        // Kiểm tra chỉ số giảm bất thường
        if (reading.readingValue < targetPrevVal) {
          // BẮT BUỘC LƯU NULL THEO ĐẶC TẢ
          targetConsumption = null;
          isAbnormal = true;
          if (!notes?.includes('Chỉ số giảm bất thường')) {
            notes = `${notes ? notes + ' | ' : ''}Chỉ số giảm bất thường (từ ${targetPrevVal} xuống ${reading.readingValue}) - Cần xác minh`;
          }
        } else {
          const diff = reading.readingValue - targetPrevVal;
          targetConsumption = Number((diff * multiplier).toFixed(2));
        }
      }

      // Kiểm tra xem có cần cập nhật bản ghi này không
      const prevChanged = reading.previousValue !== targetPrevVal;
      const consChanged = reading.consumption !== targetConsumption;
      const abnChanged = reading.isAbnormal !== isAbnormal;
      const notesChanged = reading.notes !== notes;

      if (prevChanged || consChanged || abnChanged || notesChanged) {
        await tx.utilityReading.update({
          where: { id: reading.id },
          data: {
            previousValue: targetPrevVal,
            consumption: targetConsumption,
            isAbnormal,
            notes,
          },
        });
        updatedCount++;
        // Cập nhật lại đối tượng trong bộ nhớ để phần tử kế tiếp lấy đúng targetPrevVal
        reading.previousValue = targetPrevVal;
        reading.consumption = targetConsumption;
        reading.isAbnormal = isAbnormal;
        reading.notes = notes;
      }
    }

    // 4. Cập nhật lại lastReadingValue và lastReadingAt của điểm đo theo bản ghi mới nhất
    const latestReading = await tx.utilityReading.findFirst({
      where: { pointId, isVoided: false },
      orderBy: [{ recordedAt: 'desc' }, { id: 'desc' }],
    });

    if (latestReading) {
      await tx.utilityPoint.update({
        where: { id: pointId },
        data: {
          lastReadingValue: latestReading.readingValue,
          lastReadingAt: latestReading.recordedAt,
        },
      });
    }

    return { updatedCount, readingsCount: subsequentReadings.length };
  }


  async syncEvnReadings(body: any, actor: any) {
    const rawItems = Array.isArray(body)
      ? body
      : Array.isArray(body?.items)
      ? body.items
      : [body];

    if (!rawItems || rawItems.length === 0) {
      throw new BadRequestException('Không có dữ liệu đồng bộ.');
    }

    // Lấy trước tất cả các điểm đo điện đang hoạt động
    const elecPoints = await this.prisma.utilityPoint.findMany({
      where: { type: 'ELECTRICITY', isActive: true },
    });

    if (elecPoints.length === 0) {
      throw new NotFoundException('Hệ thống chưa có điểm đo Điện nào để đồng bộ.');
    }

    const systemUser =
      (await this.prisma.user.findFirst({
        where: { role: 'ADMIN' },
        select: { id: true, name: true },
      })) || (await this.prisma.user.findFirst({ select: { id: true, name: true } }));

    const recorderId =
      actor?.id && actor.id !== 'system-evn-bot'
        ? actor.id
        : systemUser?.id || null;
    const recorderName = 'EVN Auto-Sync Bot';

    // 1. Phân loại và gom nhóm theo từng điểm đo
    interface ParsedSyncItem {
      point: any;
      cycleTime: Date | null;
      meterTime: Date | null;
      recordedAt: Date;
      readingVal: number;
      normalVal: number | null;
      peakVal: number | null;
      offPeakVal: number | null;
      powerKw: number | null;
      notes?: string;
      shift?: string;
    }

    const pointMap = new Map<string, { point: any; items: ParsedSyncItem[] }>();

    for (const item of rawItems) {
      if (!item) continue;
      const queryCode = String(item.meterCode || item.code || item.socongto || '').trim().toUpperCase();
      let targetPoint = elecPoints.find(
        (p) => p.code.toUpperCase() === queryCode || p.id === queryCode,
      );
      if (!targetPoint && queryCode) {
        targetPoint = elecPoints.find(
          (p) => p.code.toUpperCase().includes(queryCode) || p.description?.toUpperCase().includes(queryCode),
        );
      }
      if (!targetPoint) {
        targetPoint = elecPoints.find((p) => p.isSupplyMeter) || elecPoints[0];
      }
      if (!targetPoint) continue;

      // Chuẩn hóa thời gian theo múi giờ Việt Nam
      const cycleTime = this.parseVietnamDate(item.time || item.cycleTime);
      const meterTime = this.parseVietnamDate(item.timemeter || item.meterTime);
      const recordedAt = cycleTime || meterTime || this.parseVietnamDate(item.recordedAt) || new Date();

      const readingVal = this.parseLocaleNumber(item.readingValue ?? item.pgiaotong);
      if (readingVal === null || readingVal < 0) continue;

      const normalVal = this.parseLocaleNumber(item.normalValue ?? item.pgiao1);
      const peakVal = this.parseLocaleNumber(item.peakValue ?? item.pgiao2);
      const offPeakVal = this.parseLocaleNumber(item.offPeakValue ?? item.pgiao3);
      const powerKw = this.parseLocaleNumber(item.powerKw ?? item.pmax1);

      if (!pointMap.has(targetPoint.id)) {
        pointMap.set(targetPoint.id, { point: targetPoint, items: [] });
      }

      pointMap.get(targetPoint.id)!.items.push({
        point: targetPoint,
        cycleTime,
        meterTime,
        recordedAt,
        readingVal,
        normalVal,
        peakVal,
        offPeakVal,
        powerKw,
        notes: item.notes,
        shift: item.shift,
      });
    }

    // 2. Sắp xếp danh sách điểm đo theo pointId ASC để hạn chế deadlock khi khóa
    const sortedPointEntries = Array.from(pointMap.entries()).sort(([aId], [bId]) => aId.localeCompare(bId));

    const results: Array<{
      pointId: string;
      pointCode: string;
      pointName: string;
      status: 'SUCCESS' | 'FAILED';
      syncedCount?: number;
      createdCount?: number;
      updatedCount?: number;
      recalculatedCount?: number;
      error?: string;
    }> = [];

    // 3. Xử lý Transaction độc lập theo từng điểm đo (Per-Point Transaction)
    for (const [pointId, { point, items }] of sortedPointEntries) {
      // Sắp xếp các mốc đo theo recordedAt ASC
      items.sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
      const minAffectedDate = items[0].recordedAt;

      try {
        const pointResult = await this.executeWithRetry(async () => {
          return await this.prisma.$transaction(async (tx) => {
            // Khóa dòng điểm đo để ngăn race condition giữa các luồng đồng thời
            await tx.$executeRawUnsafe('SELECT id FROM UtilityPoint WHERE id = ? FOR UPDATE', pointId);

            let createdCount = 0;
            let updatedCount = 0;

            for (const item of items) {
              // Tìm kiếm bản ghi trùng: Ưu tiên khớp theo cycleTime, sau đó theo recordedAt trong cửa sổ nhỏ
              let existing: any = null;
              if (item.cycleTime) {
                existing = await tx.utilityReading.findFirst({
                  where: {
                    pointId,
                    isVoided: false,
                    OR: [
                      { cycleTime: item.cycleTime },
                      { recordedAt: item.cycleTime },
                    ],
                  },
                });
              }

              if (!existing) {
                // Khớp theo recordedAt chính xác hoặc trong cửa sổ ±2 phút
                existing = await tx.utilityReading.findFirst({
                  where: {
                    pointId,
                    isVoided: false,
                    recordedAt: {
                      gte: new Date(item.recordedAt.getTime() - 2 * 60 * 1000),
                      lte: new Date(item.recordedAt.getTime() + 2 * 60 * 1000),
                    },
                  },
                });
              }

              if (existing) {
                await tx.utilityReading.update({
                  where: { id: existing.id },
                  data: {
                    readingValue: item.readingVal,
                    normalValue: item.normalVal ?? existing.normalValue,
                    peakValue: item.peakVal ?? existing.peakValue,
                    offPeakValue: item.offPeakVal ?? existing.offPeakValue,
                    powerKw: item.powerKw ?? existing.powerKw,
                    cycleTime: item.cycleTime || existing.cycleTime,
                    meterTimestamp: item.meterTime || existing.meterTimestamp,
                    notes: item.notes || existing.notes,
                  },
                });
                updatedCount++;
              } else {
                await tx.utilityReading.create({
                  data: {
                    pointId,
                    recordedAt: item.recordedAt,
                    cycleTime: item.cycleTime,
                    meterTimestamp: item.meterTime,
                    readingValue: item.readingVal,
                    previousValue: null,
                    consumption: null,
                    normalValue: item.normalVal,
                    peakValue: item.peakVal,
                    offPeakValue: item.offPeakVal,
                    powerKw: item.powerKw,
                    shift: item.shift || 'Tự động EVN',
                    notes: item.notes || `Đồng bộ từ AMISS (${item.meterTime?.toISOString() || item.recordedAt.toISOString()})`,
                    recordedById: recorderId,
                    recordedByName: recorderName,
                  },
                });
                createdCount++;
              }
            }

            // Kích hoạt tính lại chuỗi nối tiếp từ minAffectedDate
            const recalc = await this.recalculatePointTimeline(tx, pointId, minAffectedDate);

            return {
              pointId,
              pointCode: point.code,
              pointName: point.name,
              status: 'SUCCESS' as const,
              syncedCount: items.length,
              createdCount,
              updatedCount,
              recalculatedCount: recalc.updatedCount,
            };
          });
        });

        results.push(pointResult);
      } catch (err: any) {
        results.push({
          pointId,
          pointCode: point.code,
          pointName: point.name,
          status: 'FAILED' as const,
          error: err.message || 'Lỗi không xác định khi đồng bộ điểm đo',
        });
      }
    }

    const failedCount = results.filter((r) => r.status === 'FAILED').length;
    const succeededCount = results.filter((r) => r.status === 'SUCCESS').length;

    return {
      success: failedCount === 0 && results.length > 0,
      summary: {
        totalPoints: results.length,
        succeededPoints: succeededCount,
        failedPoints: failedCount,
      },
      results,
    };
  }

  // ==========================================
  // ĐÁNH DẤU HỦY KẾT QUẢ SAI (AUDIT TRAIL)
  // ==========================================
  async voidReading(
    id: string,
    data: { reason: string },
    actor: any,
  ) {
    const reading = await this.prisma.utilityReading.findUnique({
      where: { id },
      include: { point: true },
    });

    if (!reading) {
      throw new NotFoundException('Không tìm thấy bản ghi số điện/nước.');
    }

    if (reading.isVoided) {
      throw new BadRequestException('Bản ghi này đã được đánh dấu hủy trước đó.');
    }

    const voidReason = data.reason?.trim();
    if (!voidReason) {
      throw new BadRequestException('Vui lòng cung cấp lý do hủy kết quả ghi sai.');
    }

    const updated = await this.executeWithRetry(async () => {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe('SELECT id FROM UtilityPoint WHERE id = ? FOR UPDATE', reading.pointId);

        const up = await tx.utilityReading.update({
          where: { id },
          data: {
            isVoided: true,
            voidReason,
            voidedAt: new Date(),
            voidedById: actor?.id || null,
            voidedByName: actor?.name || actor?.email || 'Người vận hành',
          },
        });

        // Tự động tính lại liên hoàn từ mốc bị hủy
        await this.recalculatePointTimeline(tx, reading.pointId, reading.recordedAt);

        return up;
      });
    });

    return {
      success: true,
      message: `Đã đánh dấu hủy bản ghi sai của ${reading.point.name}. Dữ liệu được bảo toàn trong nhật ký kiểm toán.`,
      reading: updated,
    };
  }

  // ==========================================
  // CHỈNH SỬA BẢN GHI CHỈ SỐ ĐIỆN / NƯỚC (CÓ LIÊN HOÀN CẬP NHẬT TIÊU THỤ)
  // ==========================================
  async updateReading(
    id: string,
    data: {
      readingValue?: number;
      previousValue?: number;
      recordedAt?: string | Date;
      shift?: string;
      notes?: string;
      normalValue?: number;
      peakValue?: number;
      offPeakValue?: number;
      powerKw?: number;
      powerFactorCosPhi?: number;
    },
    actor: any,
  ) {
    const reading = await this.prisma.utilityReading.findUnique({
      where: { id },
      include: { point: true },
    });

    if (!reading) {
      throw new NotFoundException('Không tìm thấy bản ghi số điện/nước.');
    }

    const newReadingValue =
      data.readingValue !== undefined
        ? (this.parseLocaleNumber(data.readingValue) ?? reading.readingValue)
        : reading.readingValue;

    const newRecordedAt = data.recordedAt ? new Date(data.recordedAt) : reading.recordedAt;

    const normalVal = data.normalValue !== undefined ? this.parseLocaleNumber(data.normalValue) : reading.normalValue;
    const peakVal = data.peakValue !== undefined ? this.parseLocaleNumber(data.peakValue) : reading.peakValue;
    const offPeakVal = data.offPeakValue !== undefined ? this.parseLocaleNumber(data.offPeakValue) : reading.offPeakValue;
    const powerKw = data.powerKw !== undefined ? this.parseLocaleNumber(data.powerKw) : reading.powerKw;
    const cosPhi = data.powerFactorCosPhi !== undefined ? this.parseLocaleNumber(data.powerFactorCosPhi) : reading.powerFactorCosPhi;

    const minAffectedDate = newRecordedAt < reading.recordedAt ? newRecordedAt : reading.recordedAt;

    const updated = await this.executeWithRetry(async () => {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe('SELECT id FROM UtilityPoint WHERE id = ? FOR UPDATE', reading.pointId);

        const up = await tx.utilityReading.update({
          where: { id },
          data: {
            readingValue: newReadingValue,
            recordedAt: newRecordedAt,
            shift: data.shift !== undefined ? data.shift : reading.shift,
            notes: data.notes !== undefined ? data.notes : reading.notes,
            normalValue: normalVal,
            peakValue: peakVal,
            offPeakValue: offPeakVal,
            powerKw: powerKw,
            powerFactorCosPhi: cosPhi,
          },
          include: { point: true },
        });

        // Tự động tính lại liên hoàn từ mốc bị ảnh hưởng
        await this.recalculatePointTimeline(tx, reading.pointId, minAffectedDate);

        return up;
      });
    });

    return {
      success: true,
      message: `Đã cập nhật bản ghi chỉ số thành công (${reading.point.code} - ${reading.point.name}).`,
      reading: updated,
    };
  }

  // ==========================================
  // TỰ ĐỘNG CHUẨN HÓA & TÍNH TOÁN LẠI TOÀN BỘ CHUỖI SỐ LIỆU LỊCH SỬ
  // ==========================================
  async recalculateReadings(query?: { pointId?: string }) {
    const where: any = { isActive: true };
    if (query?.pointId) {
      where.id = query.pointId;
    }

    const points = await this.prisma.utilityPoint.findMany({
      where,
      include: {
        readings: {
          where: { isVoided: false },
          orderBy: [{ recordedAt: 'asc' }, { id: 'asc' }],
        },
      },
    });

    let totalPointsProcessed = 0;
    let totalReadingsUpdated = 0;
    const details: any[] = [];

    for (const point of points) {
      if (point.readings.length === 0) continue;

      totalPointsProcessed++;
      const multiplier = point.multiplier || 1.0;
      let pointUpdatedCount = 0;
      const updatesToPerform: Array<{ id: string; previousValue: number; consumption: number }> = [];

      // Duyệt qua từng bản ghi theo thứ tự thời gian tăng dần
      for (let i = 0; i < point.readings.length; i++) {
        const reading = point.readings[i];
        let correctPreviousValue = reading.previousValue;
        let correctConsumption = reading.consumption;

        if (i === 0) {
          // Bản ghi đầu tiên trong chuỗi
          // Nếu ghi chú là chốt mốc đầu kỳ hoặc chỉ số trước = chỉ số mới thì tiêu thụ = 0
          const isBaseline =
            reading.notes?.toLowerCase().includes('đầu kỳ') ||
            reading.previousValue === reading.readingValue;
          if (isBaseline) {
            correctPreviousValue = reading.readingValue;
            correctConsumption = 0;
          } else {
            correctPreviousValue = reading.previousValue ?? reading.readingValue;
            const diff = Math.max(0, reading.readingValue - correctPreviousValue);
            correctConsumption = Number((diff * multiplier).toFixed(2));
          }
        } else {
          // Các bản ghi tiếp theo: Chỉ số trước PHẢI là chỉ số mới của bản ghi hợp lệ liền trước
          const prevReading = point.readings[i - 1];
          correctPreviousValue = prevReading.readingValue;
          const diff = reading.readingValue - correctPreviousValue;
          correctConsumption = diff >= 0 ? Number((diff * multiplier).toFixed(2)) : 0;
        }

        // Chỉ cập nhật nếu có sự sai lệch
        if (
          reading.previousValue !== correctPreviousValue ||
          Math.abs((reading.consumption || 0) - correctConsumption) > 0.001
        ) {
          updatesToPerform.push({
            id: reading.id,
            previousValue: correctPreviousValue,
            consumption: correctConsumption,
          });
          pointUpdatedCount++;
          totalReadingsUpdated++;
        }
      }

      // THUẬT TOÁN TỐI ƯU HÓA: Batch Update theo chunk
      // Thay vì gửi từng câu SQL UPDATE tuần tự, gom nhóm 50 câu lệnh / transaction
      const CHUNK_SIZE = 50;
      for (let c = 0; c < updatesToPerform.length; c += CHUNK_SIZE) {
        const chunk = updatesToPerform.slice(c, c + CHUNK_SIZE);
        await this.prisma.$transaction(
          chunk.map((item) =>
            this.prisma.utilityReading.update({
              where: { id: item.id },
              data: {
                previousValue: item.previousValue,
                consumption: item.consumption,
              },
            })
          )
        );
      }

      // Cập nhật lại lastReadingValue của điểm đo về bản ghi mới nhất
      const latestReading = point.readings[point.readings.length - 1];
      if (
        point.lastReadingValue !== latestReading.readingValue ||
        point.lastReadingAt?.getTime() !== latestReading.recordedAt.getTime()
      ) {
        await this.prisma.utilityPoint.update({
          where: { id: point.id },
          data: {
            lastReadingValue: latestReading.readingValue,
            lastReadingAt: latestReading.recordedAt,
          },
        });
      }

      details.push({
        pointCode: point.code,
        pointName: point.name,
        totalReadings: point.readings.length,
        updatedReadings: pointUpdatedCount,
      });
    }

    return {
      success: true,
      message: `Đã tính toán và chuẩn hóa lại dữ liệu thành công cho ${totalPointsProcessed} điểm đo (${totalReadingsUpdated} bản ghi được cập nhật lại).`,
      totalPointsProcessed,
      totalReadingsUpdated,
      details,
    };
  }

  async getReadings(query: {
    pointId?: string;
    type?: string;
    shift?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    includeEvn?: boolean;
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
    if ((query as any).status === 'ACTIVE') {
      where.isVoided = false;
    } else if ((query as any).status === 'VOIDED') {
      where.isVoided = true;
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

    // Mặc định loại bỏ dữ liệu ghi tự động của EVN Bot khỏi sổ ghi chung
    // Nhưng nếu người dùng chọn lọc theo 1 điểm đo cụ thể (query.pointId) hoặc includeEvn: true thì load toàn bộ ra
    const shouldExcludeEvn = !query.includeEvn && !query.pointId;
    if (shouldExcludeEvn) {
      where.AND = [
        ...(where.AND || []),
        { recordedById: { not: 'system-evn-bot' } },
        {
          OR: [
            { shift: null },
            { NOT: { shift: { contains: 'EVN' } } },
          ],
        },
        {
          OR: [
            { recordedByName: null },
            { NOT: { recordedByName: { contains: 'EVN' } } },
          ],
        },
        {
          OR: [
            { notes: null },
            { NOT: { notes: { contains: 'AMISS' } } },
          ],
        },
      ];
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

    const prevHours = point.statusLogs.length > 0 && point.statusLogs[0].runningHours !== null
      ? point.statusLogs[0].runningHours
      : point.lastReadingValue || 0;

    let runningDelta: number | null = null;
    let finalRunningHours: number | null = null;

    if (data.runningHours !== undefined && data.runningHours !== null) {
      finalRunningHours = Number(data.runningHours);
      runningDelta = finalRunningHours >= prevHours ? Math.round((finalRunningHours - prevHours) * 100) / 100 : 0;
    } else {
      // Tự động tính số giờ đã chạy nếu hệ thống trước đó đang BẬT (RUNNING)
      const startAt = point.lastReadingAt || (point.statusLogs.length > 0 ? point.statusLogs[0].recordedAt : null);
      if (point.currentStatus === 'RUNNING' && startAt) {
        const elapsedMs = Math.max(0, Date.now() - new Date(startAt).getTime());
        const elapsedHours = Math.round((elapsedMs / (1000 * 60 * 60)) * 100) / 100;
        runningDelta = elapsedHours;
        finalRunningHours = Math.round((prevHours + elapsedHours) * 100) / 100;
      } else {
        finalRunningHours = prevHours;
        runningDelta = 0;
      }
    }

    const statusLog = await this.prisma.utilitySystemStatusLog.create({
      data: {
        pointId: point.id,
        status: data.status,
        runningHours: finalRunningHours,
        runningDelta: runningDelta,
        reason: data.reason,
        parametersJson: data.parametersJson,
        recordedById: actor?.id || null,
        recordedByName: actor?.name || actor?.email || 'Kỹ thuật viên',
      },
    });

    // Cập nhật trạng thái hệ thống: tích lũy giờ chạy vào lastReadingValue và ghi nhận mốc thời gian
    await this.prisma.utilityPoint.update({
      where: { id: point.id },
      data: {
        currentStatus: data.status,
        lastReadingValue: finalRunningHours !== null ? finalRunningHours : point.lastReadingValue,
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
  /**
   * Chuyển đổi một mốc thời gian sang mã ngày (YYYY-MM-DD) theo đúng ngày dương lịch.
   */
  getOperationalDateKey(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async getAnalytics(query: { days?: number }) {
    const days = Number(query.days) || 7;
    const now = new Date();

    // Chu kỳ theo đúng ngày dương lịch: 00:00:00 đến 23:59:59
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);

    // Mốc bắt đầu của toàn bộ kỳ phân tích (từ 00:00:00 của `days - 1` ngày trước)
    const startDate = new Date(todayStart);
    startDate.setDate(startDate.getDate() - (days - 1));

    // 1. Điểm đo và trạng thái hệ thống phụ trợ (Preload & Map)
    const allPoints = await this.prisma.utilityPoint.findMany({
      where: { isActive: true },
    });
    const pointMap = new Map<string, any>(allPoints.map(p => [p.id, p]));

    const hasElecSupplyMeters = allPoints.some(p => p.type === 'ELECTRICITY' && this.isSupplyPoint(p));
    const hasWaterSupplyMeters = allPoints.some(p => p.type === 'WATER' && this.isSupplyPoint(p));

    // THUẬT TOÁN TỐI ƯU HÓA: Truy vấn tinh gọn (Lean Projection)
    // Loại bỏ include: { point: true } giúp giảm 80% RAM và payload serialization
    const readings = await this.prisma.utilityReading.findMany({
      where: {
        isVoided: false,
        recordedAt: { gte: startDate, lt: todayEnd },
      },
      select: {
        pointId: true,
        consumption: true,
        recordedAt: true,
      },
      orderBy: { recordedAt: 'asc' },
    });

    // Danh sách chi tiết các đồng hồ nguồn tổng cấp (hiển thị từng đồng hồ, không bỏ qua cái nào)
    const electricitySupplyMetersMap = new Map<string, {
      id: string;
      code: string;
      name: string;
      location: string;
      unit: string;
      today: number;
      period: number;
    }>();

    const waterSupplyMetersMap = new Map<string, {
      id: string;
      code: string;
      name: string;
      location: string;
      unit: string;
      today: number;
      period: number;
    }>();

    allPoints.forEach((p) => {
      if (this.isSupplyPoint(p)) {
        const item = {
          id: p.id,
          code: p.code,
          name: p.name,
          location: p.location,
          unit: p.unit,
          today: 0,
          period: 0,
        };
        if (p.type === 'ELECTRICITY') {
          electricitySupplyMetersMap.set(p.id, item);
        } else if (p.type === 'WATER') {
          waterSupplyMetersMap.set(p.id, item);
        }
      }
    });

    let totalElectricitySupplyToday = 0;
    let totalElectricityConsumptionToday = 0;
    let totalWaterSupplyToday = 0;
    let totalWaterConsumptionToday = 0;

    let totalElectricitySupplyPeriod = 0;
    let totalElectricityConsumptionPeriod = 0;
    let totalWaterSupplyPeriod = 0;
    let totalWaterConsumptionPeriod = 0;

    const dailyBreakdown: Record<string, { date: string; electricity: number; water: number }> = {};

    // Khởi tạo các ngày vận hành trong kỳ phân tích
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = this.getOperationalDateKey(d);
      dailyBreakdown[key] = { date: key, electricity: 0, water: 0 };
    }

    readings.forEach((r) => {
      const point = pointMap.get(r.pointId);
      if (!point || !point.isActive) return;

      const dateKey = this.getOperationalDateKey(r.recordedAt);
      const isToday = r.recordedAt >= todayStart && r.recordedAt < todayEnd;
      const isSupply = Boolean(point.isSupplyMeter);
      const isRecycled = Boolean(point.isRecycledWater);
      const isExcluded = Boolean(point.isExcludedFromTotal);

      if (point.type === 'ELECTRICITY') {
        if (isSupply) {
          // 1. Nguồn Tổng Cấp Điện (ghi nhận đầy đủ tất cả các đồng hồ tổng)
          totalElectricitySupplyPeriod += r.consumption;
          if (isToday) totalElectricitySupplyToday += r.consumption;

          const m = electricitySupplyMetersMap.get(point.id);
          if (m) {
            m.period += r.consumption;
            if (isToday) m.today += r.consumption;
          }
        } else if (!isExcluded) {
          // 2. Tiêu Thụ Điện Nội Bộ (Các Phân Xưởng)
          totalElectricityConsumptionPeriod += r.consumption;
          if (isToday) totalElectricityConsumptionToday += r.consumption;
        }

        const shouldCount = hasElecSupplyMeters ? isSupply : !isExcluded;
        if (shouldCount && dailyBreakdown[dateKey]) {
          dailyBreakdown[dateKey].electricity += r.consumption;
        }
      } else if (point.type === 'WATER') {
        if (isSupply) {
          // 3. Nguồn Tổng Cấp Nước (ghi nhận đầy đủ tất cả các đồng hồ tổng)
          totalWaterSupplyPeriod += r.consumption;
          if (isToday) totalWaterSupplyToday += r.consumption;

          const m = waterSupplyMetersMap.get(point.id);
          if (m) {
            m.period += r.consumption;
            if (isToday) m.today += r.consumption;
          }
        } else if (!isRecycled && !isExcluded) {
          // 4. Tiêu Thụ Nước Nội Bộ (Các Phân Xưởng, không tính nước tái sinh & đối chứng)
          totalWaterConsumptionPeriod += r.consumption;
          if (isToday) totalWaterConsumptionToday += r.consumption;
        }

        if (!isRecycled && !isExcluded) {
          const shouldCount = hasWaterSupplyMeters ? isSupply : true;
          if (shouldCount && dailyBreakdown[dateKey]) {
            dailyBreakdown[dateKey].water += r.consumption;
          }
        }
      }
    });

    // Fallback: nếu hệ thống chưa khai báo đồng hồ tổng riêng biệt, lấy theo tiêu thụ
    if (!hasElecSupplyMeters) {
      totalElectricitySupplyToday = totalElectricityConsumptionToday;
      totalElectricitySupplyPeriod = totalElectricityConsumptionPeriod;
    }
    if (!hasWaterSupplyMeters) {
      totalWaterSupplyToday = totalWaterConsumptionToday;
      totalWaterSupplyPeriod = totalWaterConsumptionPeriod;
    }

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
        // Chu kỳ theo ngày dương lịch
        shiftCutoffHour: 0,
        operationalCycle: 'Theo ngày (00:00 - 23:59)',
        operationalTodayStart: todayStart.toISOString(),
        operationalTodayEnd: todayEnd.toISOString(),

        // Nguồn Tổng Cấp Điện
        electricitySupplyToday: Math.round(totalElectricitySupplyToday * 100) / 100,
        electricitySupplyPeriod: Math.round(totalElectricitySupplyPeriod * 100) / 100,
        electricitySupplyMeters: Array.from(electricitySupplyMetersMap.values()).map(m => ({
          ...m,
          today: Math.round(m.today * 100) / 100,
          period: Math.round(m.period * 100) / 100,
        })),

        // Đã Sử Dụng Điện (Nội Bộ Xưởng)
        electricityConsumptionToday: Math.round(totalElectricityConsumptionToday * 100) / 100,
        electricityConsumptionPeriod: Math.round(totalElectricityConsumptionPeriod * 100) / 100,

        // Nguồn Tổng Cấp Nước
        waterSupplyToday: Math.round(totalWaterSupplyToday * 100) / 100,
        waterSupplyPeriod: Math.round(totalWaterSupplyPeriod * 100) / 100,
        waterSupplyMeters: Array.from(waterSupplyMetersMap.values()).map(m => ({
          ...m,
          today: Math.round(m.today * 100) / 100,
          period: Math.round(m.period * 100) / 100,
        })),
        // Đã Sử Dụng Nước (Nội Bộ Xưởng)
        waterConsumptionToday: Math.round(totalWaterConsumptionToday * 100) / 100,
        waterConsumptionPeriod: Math.round(totalWaterConsumptionPeriod * 100) / 100,

        // Tương thích ngược
        electricityToday: Math.round(totalElectricitySupplyToday * 100) / 100,
        waterToday: Math.round(totalWaterSupplyToday * 100) / 100,
        electricityPeriod: Math.round(totalElectricitySupplyPeriod * 100) / 100,
        waterPeriod: Math.round(totalWaterSupplyPeriod * 100) / 100,
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

    const cycle = this.getPeriodCycleInfo(type, month, year);
    const { startDate, endDate, cycleDescription } = cycle;

    // 1. Lấy tất cả các điểm đo thuộc loại tiện ích này kèm readings đến hết endDate
    const points = await this.prisma.utilityPoint.findMany({
      where: {
        type: type as any,
        isActive: true,
      },
      include: {
        readings: {
          where: {
            isVoided: false,
            recordedAt: {
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
    let totalRecycled = 0;
    let totalNormal = 0;
    let totalPeak = 0;
    let totalOffPeak = 0;

    const hasThreePhaseSupply = points.some((pt) => pt.isSupplyMeter && pt.tariffType === 'THREE_PHASE');
    const now = new Date();
    const isCurrentOrFuturePeriod = endDate >= now;

    const metersBreakdown = points.map((p) => {
      const allReadings = p.readings;
      const periodReadings = allReadings.filter((r) => r.recordedAt >= startDate && r.recordedAt <= endDate);
      const count = periodReadings.length;

      // Bản ghi trước chu kỳ
      const priorReadings = allReadings.filter((r) => r.recordedAt < startDate);
      const lastPriorReading = priorReadings.length > 0 ? priorReadings[priorReadings.length - 1] : null;

      // Bản ghi chốt đầu kỳ có chủ đích
      const explicitBaseline = periodReadings.find(
        (r) =>
          (r.consumption === 0 || r.recordedAt.getTime() === startDate.getTime()) &&
          (r.notes?.includes('đầu kỳ') || r.notes?.includes('mốc') || r.notes?.includes('baseline')),
      );

      let startValue = 0;
      let endValue = 0;

      // 1. Xác định Số Đầu Kỳ (startValue)
      if (explicitBaseline) {
        startValue = explicitBaseline.previousValue ?? explicitBaseline.readingValue;
      } else if (lastPriorReading) {
        startValue = lastPriorReading.readingValue;
      } else if (count > 0) {
        if (periodReadings[0].previousValue && periodReadings[0].previousValue > 0) {
          startValue = periodReadings[0].previousValue;
        } else {
          // Điểm đo mới đưa vào theo dõi: chỉ số của lần ghi đầu chính là mốc ban đầu
          startValue = periodReadings[0].readingValue;
        }
      } else {
        startValue = p.lastReadingValue || 0;
      }

      // 2. Xác định Số Cuối Kỳ (endValue)
      if (count > 0) {
        endValue = periodReadings[count - 1].readingValue;
      } else if (lastPriorReading) {
        endValue = lastPriorReading.readingValue;
      } else {
        endValue = p.lastReadingValue || startValue;
      }

      // Nếu đang xem kỳ hiện tại và chỉ số đồng hồ mới nhất lớn hơn
      if (isCurrentOrFuturePeriod && p.lastReadingValue !== null && p.lastReadingValue !== undefined && p.lastReadingValue > endValue) {
        endValue = p.lastReadingValue;
      }

      if (endValue < startValue) {
        endValue = startValue;
      }

      // 3. Công thức tính sản lượng chuẩn xác: (endValue - startValue) * multiplier
      const diff = endValue - startValue;
      const periodConsumption = diff > 0 ? Number((diff * (p.multiplier || 1.0)).toFixed(2)) : 0;

      // Điện 3 pha (Biểu giá T1 - Bình thường, T2 - Cao điểm, T3 - Thấp điểm)
      let normalVal = 0;
      let peakVal = 0;
      let offPeakVal = 0;

      if (p.tariffType === 'THREE_PHASE' && count > 0) {
        let startNormal = 0;
        let startPeak = 0;
        let startOffPeak = 0;

        if (explicitBaseline) {
          startNormal = explicitBaseline.normalValue ?? 0;
          startPeak = explicitBaseline.peakValue ?? 0;
          startOffPeak = explicitBaseline.offPeakValue ?? 0;
        } else if (lastPriorReading) {
          startNormal = lastPriorReading.normalValue ?? 0;
          startPeak = lastPriorReading.peakValue ?? 0;
          startOffPeak = lastPriorReading.offPeakValue ?? 0;
        } else if (count > 0) {
          startNormal = periodReadings[0].normalValue ?? 0;
          startPeak = periodReadings[0].peakValue ?? 0;
          startOffPeak = periodReadings[0].offPeakValue ?? 0;
        }

        const endNormal = periodReadings[count - 1].normalValue ?? startNormal;
        const endPeak = periodReadings[count - 1].peakValue ?? startPeak;
        const endOffPeak = periodReadings[count - 1].offPeakValue ?? startOffPeak;

        normalVal = Math.max(0, (endNormal - startNormal) * (p.multiplier || 1.0));
        peakVal = Math.max(0, (endPeak - startPeak) * (p.multiplier || 1.0));
        offPeakVal = Math.max(0, (endOffPeak - startOffPeak) * (p.multiplier || 1.0));
      }

      // 4. Phân loại đồng hồ 100% dựa vào cấu hình CSDL của người dùng
      const isSupply = Boolean(p.isSupplyMeter);
      const isRecycled = Boolean(!isSupply && p.isRecycledWater);
      const isExcluded = Boolean(p.isExcludedFromTotal);

      if (isExcluded) {
        // Đồng hồ đối chứng / trung gian nối tiếp: KHÔNG tính vào tổng cấp và KHÔNG tính vào tổng dùng
      } else if (isSupply) {
        totalSupply += periodConsumption;
      } else if (isRecycled) {
        totalRecycled += periodConsumption;
      } else {
        totalConsumption += periodConsumption;
      }

      if (p.tariffType === 'THREE_PHASE') {
        if (hasThreePhaseSupply) {
          if (isSupply) {
            totalNormal += normalVal;
            totalPeak += peakVal;
            totalOffPeak += offPeakVal;
          }
        } else {
          totalNormal += normalVal;
          totalPeak += peakVal;
          totalOffPeak += offPeakVal;
        }
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
        isRecycledWater: isRecycled,
        isExcludedFromTotal: isExcluded,
        readingsCount: count,
        startValue: Number(startValue.toFixed(2)),
        endValue: Number(endValue.toFixed(2)),
        periodConsumption,
        normalConsumption: Number(normalVal.toFixed(2)),
        peakConsumption: Number(peakVal.toFixed(2)),
        offPeakConsumption: Number(offPeakVal.toFixed(2)),
      };
    });

    totalSupply = Number(totalSupply.toFixed(2));
    totalConsumption = Number(totalConsumption.toFixed(2));
    totalRecycled = Number(totalRecycled.toFixed(2));
    const delta = Number((totalSupply - totalConsumption).toFixed(2));
    const lossRate = totalSupply > 0 ? Number(((delta / totalSupply) * 100).toFixed(2)) : 0;
    const recycleRate = totalSupply > 0 ? Number(((totalRecycled / totalSupply) * 100).toFixed(2)) : 0;

    const breakdownWithShare = metersBreakdown.map((m) => {
      let sharePercent = 0;
      if (m.isExcludedFromTotal) {
        sharePercent = 0;
      } else if (!m.isSupplyMeter && !m.isRecycledWater && totalConsumption > 0) {
        sharePercent = Number(((m.periodConsumption / totalConsumption) * 100).toFixed(2));
      } else if (m.isSupplyMeter && totalSupply > 0) {
        sharePercent = Number(((m.periodConsumption / totalSupply) * 100).toFixed(2));
      } else if (m.isRecycledWater && totalRecycled > 0) {
        sharePercent = Number(((m.periodConsumption / totalRecycled) * 100).toFixed(2));
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
        totalRecycled,
        recycleRate,
        delta,
        lossRate,
        unit: type === 'ELECTRICITY' ? 'kWh' : 'm³',
        threePhaseBreakdown: type === 'ELECTRICITY' ? {
          normal: Number(totalNormal.toFixed(2)),
          peak: Number(totalPeak.toFixed(2)),
          offPeak: Number(totalOffPeak.toFixed(2)),
        } : null,
      },
      supplyMeters: breakdownWithShare.filter((m) => m.isSupplyMeter && !m.isExcludedFromTotal),
      consumptionMeters: breakdownWithShare.filter((m) => !m.isSupplyMeter && !m.isRecycledWater && !m.isExcludedFromTotal),
      recycledMeters: breakdownWithShare.filter((m) => m.isRecycledWater && !m.isExcludedFromTotal),
      excludedMeters: breakdownWithShare.filter((m) => m.isExcludedFromTotal),
      allMeters: breakdownWithShare,
    };
  }

  // ==========================================
  // 6. BÁO CÁO MA TRẬN XU HƯỚNG THEO THỜI GIAN (NGÀY / THÁNG / NĂM)
  // ==========================================
  async getTrendMatrixReport(query: {
    type?: 'ELECTRICITY' | 'WATER';
    viewMode?: 'HOURLY' | 'DAILY' | 'MONTHLY' | 'YEARLY';
    day?: number;
    month?: number;
    year?: number;
    startYear?: number;
    endYear?: number;
  }) {
    const type = query.type || 'ELECTRICITY';
    const viewMode = query.viewMode || 'DAILY';
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const currentDay = new Date().getDate();
    const day = Number(query.day) || currentDay;
    const month = Number(query.month) || currentMonth;
    const year = Number(query.year) || currentYear;
    const startYear = Number(query.startYear) || (year - 3);
    const endYear = Number(query.endYear) || year;

    // 1. Tạo danh sách các cột thời gian (timeColumns)
    interface TimeCol {
      key: string;
      label: string;
      shortLabel: string;
      subLabel?: string;
      startDate: Date;
      endDate: Date;
    }
    const timeColumns: TimeCol[] = [];

    if (viewMode === 'HOURLY') {
      // 24 giờ trong ngày (00h -> 23h) của ngày day/month/year được chọn
      for (let h = 0; h < 24; h++) {
        const s = new Date(year, month - 1, day, h, 0, 0, 0);
        const e = new Date(year, month - 1, day, h + 1, 0, 0, 0);
        const hStr = `${String(h).padStart(2, '0')}h`;
        const nextHStr = `${String((h + 1) % 24).padStart(2, '0')}h`;
        const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}_${String(h).padStart(2, '0')}`;
        timeColumns.push({
          key,
          label: `${hStr} - ${nextHStr} (${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')})`,
          shortLabel: `${hStr}`,
          subLabel: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`,
          startDate: s,
          endDate: e,
        });
      }
    } else if (viewMode === 'DAILY') {
      // Ngày trong tháng (01 -> lastDay) theo đúng ngày dương lịch (00:00:00 -> 23:59:59) cho cả Điện và Nước
      const lastDay = new Date(year, month, 0).getDate();
      const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      for (let d = 1; d <= lastDay; d++) {
        const s = new Date(year, month - 1, d, 0, 0, 0, 0);
        const e = new Date(year, month - 1, d + 1, 0, 0, 0, 0);
        const dayDate = new Date(year, month - 1, d);
        const dayName = weekdays[dayDate.getDay()];
        const key = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        timeColumns.push({
          key,
          label: `${String(d).padStart(2, '0')}/${String(month).padStart(2, '0')} (${dayName})`,
          shortLabel: `${String(d).padStart(2, '0')}`,
          subLabel: dayName,
          startDate: s,
          endDate: e,
        });
      }
    } else if (viewMode === 'MONTHLY') {
      // 12 tháng trong năm
      for (let m = 1; m <= 12; m++) {
        const cycle = this.getPeriodCycleInfo(type, m, year);
        timeColumns.push({
          key: `${year}-${String(m).padStart(2, '0')}`,
          label: `Tháng ${m}/${year}`,
          shortLabel: `T${m}`,
          subLabel: `${year}`,
          startDate: cycle.startDate,
          endDate: cycle.endDate,
        });
      }
    } else {
      // THEO NĂM: từ startYear đến endYear
      for (let y = startYear; y <= endYear; y++) {
        const s = new Date(y, 0, 1, 0, 0, 0, 0);
        const e = new Date(y, 11, 31, 23, 59, 59, 999);
        timeColumns.push({
          key: `${y}`,
          label: `Năm ${y}`,
          shortLabel: `${y}`,
          startDate: s,
          endDate: e,
        });
      }
    }

    if (timeColumns.length === 0) {
      return {
        type,
        viewMode,
        day,
        month,
        year,
        startYear,
        endYear,
        unit: type === 'ELECTRICITY' ? 'kWh' : 'm³',
        timeColumns: [],
        summaryRows: {
          totalSupply: { label: '1. TỔNG CẤP VÀO', values: {}, total: 0, average: 0 },
          totalConsumption: { label: '2. TỔNG TIÊU THỤ', values: {}, total: 0, average: 0 },
          totalRecycled: { label: '3. NƯỚC TÁI SỬ DỤNG', values: {}, total: 0, average: 0 },
          delta: { label: '4. CHÊNH LỆCH / HAO HỤT', values: {}, total: 0, average: 0 },
        },
        pointRows: [],
      };
    }

    const minDate = timeColumns[0].startDate;
    const maxDate = timeColumns[timeColumns.length - 1].endDate;

    // 2. Lấy danh sách điểm đo thuộc loại tiện ích kèm readings trong khoảng bao phủ
    const points = await this.prisma.utilityPoint.findMany({
      where: {
        type: type as any,
        isActive: true,
      },
      include: {
        readings: {
          where: {
            isVoided: false,
            recordedAt: {
              gte: minDate,
              lte: maxDate,
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

    // 3. Tính toán sản lượng cho từng điểm đo theo từng timeColumn
    const incompleteColumns: Record<string, boolean> = {};

    const pointRows = points.map((p) => {
      const values: Record<string, number | null> = {};
      const cellDetails: Record<
        string,
        {
          value: number | null;
          hasUnverified: boolean;
          hasMissingData: boolean;
          gapHours?: number;
          gapNote?: string;
        }
      > = {};
      let total = 0;
      let nonZeroCount = 0;

      timeColumns.forEach((col) => {
        const inSlot = p.readings.filter(
          (r) =>
            r.recordedAt >= col.startDate &&
            (viewMode === 'DAILY' || viewMode === 'HOURLY'
              ? r.recordedAt < col.endDate
              : r.recordedAt <= col.endDate),
        );

        let cons = 0;
        let hasUnverified = false;
        let hasMissingData = false;
        let maxGapHours = 0;
        let gapNote = '';

        if (inSlot.length > 0) {
          for (let i = 0; i < inSlot.length; i++) {
            const r = inSlot[i];
            if (r.consumption === null || r.consumption === undefined) {
              hasUnverified = true;
              incompleteColumns[col.key] = true;
            } else {
              cons += r.consumption;
            }

            if (r.isAbnormal || r.notes?.includes('Chỉ số giảm bất thường')) {
              hasUnverified = true;
              incompleteColumns[col.key] = true;
              gapNote = r.notes || 'Chỉ số giảm bất thường - Cần xác minh';
            }

            // Kiểm tra khoảng cách đo (khoảng thiếu dữ liệu)
            if (i === 0) {
              // So sánh với mốc trước slot nếu có
              const prevInHistory = p.readings
                .filter((pr) => pr.recordedAt < r.recordedAt)
                .pop();
              if (prevInHistory) {
                const diffHours = (r.recordedAt.getTime() - prevInHistory.recordedAt.getTime()) / 3600000;
                if (diffHours > 0.75) {
                  hasMissingData = true;
                  maxGapHours = Math.max(maxGapHours, Number(diffHours.toFixed(1)));
                  gapNote = `Thiếu dữ liệu đo (${maxGapHours}h)`;
                }
              }
            } else {
              const diffHours = (r.recordedAt.getTime() - inSlot[i - 1].recordedAt.getTime()) / 3600000;
              if (diffHours > 0.75) {
                hasMissingData = true;
                maxGapHours = Math.max(maxGapHours, Number(diffHours.toFixed(1)));
                gapNote = `Thiếu dữ liệu đo (${maxGapHours}h)`;
              }
            }
          }
        }

        cons = Number(cons.toFixed(2));
        const finalVal = hasUnverified && cons === 0 ? null : cons;
        values[col.key] = finalVal;
        cellDetails[col.key] = {
          value: finalVal,
          hasUnverified,
          hasMissingData,
          gapHours: maxGapHours > 0 ? maxGapHours : undefined,
          gapNote: gapNote || (hasMissingData ? 'Thiếu dữ liệu đo' : undefined),
        };

        if (finalVal !== null) {
          total += finalVal;
          if (finalVal > 0) nonZeroCount++;
        }
      });

      total = Number(total.toFixed(2));
      const average = nonZeroCount > 0 ? Number((total / nonZeroCount).toFixed(2)) : 0;

      // Tính xu hướng: % thay đổi giữa 2 mốc thời gian gần nhất
      let trendPercent = 0;
      const colKeys = timeColumns.map((c) => c.key);
      if (colKeys.length >= 2) {
        const lastVal = values[colKeys[colKeys.length - 1]] || 0;
        const prevVal = values[colKeys[colKeys.length - 2]] || 0;
        if (prevVal > 0) {
          trendPercent = Number((((lastVal - prevVal) / prevVal) * 100).toFixed(1));
        }
      }

      return {
        pointId: p.id,
        code: p.code,
        name: p.name,
        location: p.location,
        unit: p.unit,
        multiplier: p.multiplier,
        tariffType: p.tariffType,
        isSupplyMeter: Boolean(p.isSupplyMeter),
        isRecycledWater: Boolean(p.isRecycledWater),
        isExcludedFromTotal: Boolean(p.isExcludedFromTotal),
        values,
        cellDetails,
        total,
        average,
        trendPercent,
      };
    });

    // 4. Tính toán hàng tổng hợp (Summary Rows) cho từng cột thời gian
    const totalSupplyValues: Record<string, number> = {};
    const totalConsumptionValues: Record<string, number> = {};
    const totalRecycledValues: Record<string, number> = {};
    const deltaValues: Record<string, number> = {};

    let sumSupplyAll = 0;
    let sumConsAll = 0;
    let sumRecycledAll = 0;

    timeColumns.forEach((col) => {
      let colSupply = 0;
      let colCons = 0;
      let colRecycled = 0;

      pointRows.forEach((row) => {
        const v = row.values[col.key] || 0;
        if (row.isExcludedFromTotal) return;
        if (row.isSupplyMeter) {
          colSupply += v;
        } else if (row.isRecycledWater) {
          colRecycled += v;
        } else {
          colCons += v;
        }
      });

      colSupply = Number(colSupply.toFixed(2));
      colCons = Number(colCons.toFixed(2));
      colRecycled = Number(colRecycled.toFixed(2));
      const colDelta = Number((colSupply - colCons).toFixed(2));

      totalSupplyValues[col.key] = colSupply;
      totalConsumptionValues[col.key] = colCons;
      totalRecycledValues[col.key] = colRecycled;
      deltaValues[col.key] = colDelta;

      sumSupplyAll += colSupply;
      sumConsAll += colCons;
      sumRecycledAll += colRecycled;
    });

    const colCount = timeColumns.length || 1;
    const summaryRows = {
      incompleteColumns,
      totalSupply: {
        label: '1. TỔNG CẤP VÀO',
        values: totalSupplyValues,
        total: Number(sumSupplyAll.toFixed(2)),
        average: Number((sumSupplyAll / colCount).toFixed(2)),
      },
      totalConsumption: {
        label: '2. TỔNG SỬ DỤNG NỘI BỘ',
        values: totalConsumptionValues,
        total: Number(sumConsAll.toFixed(2)),
        average: Number((sumConsAll / colCount).toFixed(2)),
      },
      totalRecycled: {
        label: '3. NƯỚC TÁI SỬ DỤNG',
        values: totalRecycledValues,
        total: Number(sumRecycledAll.toFixed(2)),
        average: Number((sumRecycledAll / colCount).toFixed(2)),
      },
      delta: {
        label: '4. CHÊNH LỆCH / HAO HỤT',
        values: deltaValues,
        total: Number((sumSupplyAll - sumConsAll).toFixed(2)),
        average: Number(((sumSupplyAll - sumConsAll) / colCount).toFixed(2)),
      },
    };

    return {
      type,
      viewMode,
      day,
      month,
      year,
      startYear,
      endYear,
      unit: type === 'ELECTRICITY' ? 'kWh' : 'm³',
      timeColumns: timeColumns.map((c) => ({
        key: c.key,
        label: c.label,
        shortLabel: c.shortLabel,
        subLabel: c.subLabel,
      })),
      summaryRows,
      pointRows,
    };
  }
}
