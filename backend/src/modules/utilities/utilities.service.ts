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
          recordedById: actor?.id || 'system',
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
          recordedById: actor?.id || 'system',
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
      // Kỳ điện: Từ ngày 01 đến ngày cuối cùng của tháng đó
      startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
      endDate = new Date(year, month, 0, 23, 59, 59, 999);
      const lastDay = endDate.getDate();
      cycleDescription = `Từ 01/${String(month).padStart(2, '0')}/${year} đến ${String(lastDay).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
      startDayLabel = `00:00 ngày 01/${String(month).padStart(2, '0')}/${year}`;
    } else {
      // Kỳ nước: Từ ngày 21 của tháng liền kề trước đó đến ngày 20 của tháng tiếp theo
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
          recordedById: actor?.id || 'admin',
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
            recordedById: actor?.id || 'admin',
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
        recordedById: actor?.id || 'system',
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
        : systemUser?.id || 'admin';
    const recorderName = 'EVN Auto-Sync Bot';

    const results = [];

    for (const item of rawItems) {
      if (!item) continue;

      // 1. Tìm điểm đo phù hợp
      const queryCode = String(item.meterCode || item.code || item.socongto || '').trim().toUpperCase();
      let targetPoint = elecPoints.find(
        (p) => p.code.toUpperCase() === queryCode || p.id === queryCode,
      );

      // Nếu không khớp chính xác, tìm theo số công tơ trong mô tả hoặc code chứa số công tơ
      if (!targetPoint && queryCode) {
        targetPoint = elecPoints.find(
          (p) => p.code.toUpperCase().includes(queryCode) || p.description?.toUpperCase().includes(queryCode),
        );
      }

      // Nếu vẫn không có mã, fallback vào điểm đo Nguồn tổng cấp (isSupplyMeter = true)
      if (!targetPoint) {
        targetPoint = elecPoints.find((p) => p.isSupplyMeter) || elecPoints[0];
      }

      if (!targetPoint) continue;

      // 2. Phân tích thời gian ghi nhận (timemeter: "DD/MM/YYYY HH:mm" hoặc ISO)
      let recordedAt = new Date();
      if (item.timemeter) {
        const match = String(item.timemeter).match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/);
        if (match) {
          const [, day, month, year, hour, minute] = match;
          recordedAt = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), 0, 0);
        } else {
          const parsed = new Date(item.timemeter);
          if (!isNaN(parsed.getTime())) recordedAt = parsed;
        }
      } else if (item.recordedAt) {
        const parsed = new Date(item.recordedAt);
        if (!isNaN(parsed.getTime())) recordedAt = parsed;
      }

      // 3. Trích xuất chỉ số đo đếm
      const readingVal = this.parseLocaleNumber(item.readingValue ?? item.pgiaotong);
      if (readingVal === null || readingVal < 0) {
        continue;
      }

      const normalVal = this.parseLocaleNumber(item.normalValue ?? item.pgiao1);
      const peakVal = this.parseLocaleNumber(item.peakValue ?? item.pgiao2);
      const offPeakVal = this.parseLocaleNumber(item.offPeakValue ?? item.pgiao3);
      const powerKw = this.parseLocaleNumber(item.powerKw ?? item.pmax1);

      // 4. Cơ chế chống trùng lặp (Upsert): Tìm bản ghi cùng điểm đo trong cửa sổ ±5 phút
      const windowStart = new Date(recordedAt.getTime() - 5 * 60 * 1000);
      const windowEnd = new Date(recordedAt.getTime() + 5 * 60 * 1000);

      const existingReading = await this.prisma.utilityReading.findFirst({
        where: {
          pointId: targetPoint.id,
          isVoided: false,
          recordedAt: {
            gte: windowStart,
            lte: windowEnd,
          },
        },
      });

      if (existingReading) {
        // Cập nhật bản ghi hiện tại
        const updated = await this.prisma.utilityReading.update({
          where: { id: existingReading.id },
          data: {
            readingValue: readingVal,
            normalValue: normalVal ?? existingReading.normalValue,
            peakValue: peakVal ?? existingReading.peakValue,
            offPeakValue: offPeakVal ?? existingReading.offPeakValue,
            powerKw: powerKw ?? existingReading.powerKw,
            notes: item.notes || existingReading.notes,
          },
        });
        results.push({ action: 'updated', id: updated.id, pointCode: targetPoint.code, recordedAt });
      } else {
        // Tạo mới: Tìm chỉ số gần nhất trước mốc thời gian này để tính delta consumption
        const priorReading = await this.prisma.utilityReading.findFirst({
          where: {
            pointId: targetPoint.id,
            isVoided: false,
            recordedAt: { lt: recordedAt },
          },
          orderBy: { recordedAt: 'desc' },
        });

        const prevVal = priorReading ? priorReading.readingValue : (targetPoint.lastReadingValue || readingVal);
        const diff = readingVal >= prevVal ? readingVal - prevVal : 0;
        const consumption = Number((diff * (targetPoint.multiplier || 1.0)).toFixed(2));

        const created = await this.prisma.utilityReading.create({
          data: {
            pointId: targetPoint.id,
            recordedAt,
            readingValue: readingVal,
            previousValue: prevVal,
            consumption,
            normalValue: normalVal,
            peakValue: peakVal,
            offPeakValue: offPeakVal,
            powerKw,
            shift: item.shift || 'Tự động EVN',
            notes: item.notes || `Đồng bộ tự động từ AMISS (${item.timemeter || recordedAt.toISOString()})`,
            recordedById: recorderId,
            recordedByName: recorderName,
          },
        });
        results.push({ action: 'created', id: created.id, pointCode: targetPoint.code, recordedAt, consumption });
      }

      // Cập nhật lastReadingValue cho điểm đo nếu mốc thời gian này là mới nhất
      if (!targetPoint.lastReadingAt || recordedAt >= targetPoint.lastReadingAt) {
        await this.prisma.utilityPoint.update({
          where: { id: targetPoint.id },
          data: {
            lastReadingValue: readingVal,
            lastReadingAt: recordedAt,
          },
        });
      }
    }

    return {
      success: true,
      message: `Đã xử lý đồng bộ ${results.length} mốc chỉ số từ EVN.`,
      syncedCount: results.length,
      details: results,
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

    // Đánh dấu hủy bản ghi (Audit trail: giữ nguyên bản ghi không xóa)
    const updated = await this.prisma.utilityReading.update({
      where: { id },
      data: {
        isVoided: true,
        voidReason,
        voidedAt: new Date(),
        voidedById: actor?.id || 'system',
        voidedByName: actor?.name || actor?.email || 'Người vận hành',
      },
    });

    // Tự động rollback lastReadingValue của điểm đo về bản ghi hợp lệ gần nhất (nếu bản ghi bị hủy là bản ghi mới nhất)
    const latestValid = await this.prisma.utilityReading.findFirst({
      where: {
        pointId: reading.pointId,
        isVoided: false,
      },
      orderBy: { recordedAt: 'desc' },
    });

    if (latestValid) {
      await this.prisma.utilityPoint.update({
        where: { id: reading.pointId },
        data: {
          lastReadingValue: latestValid.readingValue,
          lastReadingAt: latestValid.recordedAt,
        },
      });
    } else {
      await this.prisma.utilityPoint.update({
        where: { id: reading.pointId },
        data: {
          lastReadingValue: reading.previousValue,
          lastReadingAt: null,
        },
      });
    }

    return {
      success: true,
      message: `Đã đánh dấu hủy bản ghi sai của ${reading.point.name}. Dữ liệu được bảo toàn trong nhật ký kiểm toán.`,
      reading: updated,
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

    // Mặc định loại bỏ dữ liệu ghi tự động của EVN Bot khỏi sổ ghi điện nước
    if (!query.includeEvn) {
      where.NOT = [
        { recordedByName: { contains: 'EVN' } },
        { shift: { contains: 'EVN' } },
        { recordedById: 'system-evn-bot' },
        { notes: { contains: 'AMISS' } },
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
        recordedById: actor?.id || 'system',
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
  async getAnalytics(query: { days?: number }) {
    const days = Number(query.days) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 1. Lấy tất cả readings trong khoảng thời gian
    // 1. Lấy tất cả readings trong khoảng thời gian (loại trừ bản ghi đã hủy)
    const readings = await this.prisma.utilityReading.findMany({
      where: {
        isVoided: false,
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

    const hasElecSupplyMeters = allPoints.some(p => p.type === 'ELECTRICITY' && this.isSupplyPoint(p));
    const hasWaterSupplyMeters = allPoints.some(p => p.type === 'WATER' && this.isSupplyPoint(p));

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
      // Bỏ qua đồng hồ đối chứng khỏi thống kê tổng dùng & tổng cấp
      if (r.point.isExcludedFromTotal) return;

      const dateKey = r.recordedAt.toISOString().split('T')[0];
      const isToday = r.recordedAt >= todayStart;
      const isSupply = Boolean(r.point.isSupplyMeter);
      const isRecycled = Boolean(r.point.isRecycledWater);

      if (r.point.type === 'ELECTRICITY') {
        const shouldCount = hasElecSupplyMeters ? isSupply : true;
        if (shouldCount) {
          totalElectricityPeriod += r.consumption;
          if (isToday) totalElectricityToday += r.consumption;
          if (dailyBreakdown[dateKey]) {
            dailyBreakdown[dateKey].electricity += r.consumption;
          }
        }
      } else if (r.point.type === 'WATER') {
        if (!isRecycled) {
          const shouldCount = hasWaterSupplyMeters ? isSupply : true;
          if (shouldCount) {
            totalWaterPeriod += r.consumption;
            if (isToday) totalWaterToday += r.consumption;
            if (dailyBreakdown[dateKey]) {
              dailyBreakdown[dateKey].water += r.consumption;
            }
          }
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
    viewMode?: 'DAILY' | 'MONTHLY' | 'YEARLY';
    month?: number;
    year?: number;
    startYear?: number;
    endYear?: number;
  }) {
    const type = query.type || 'ELECTRICITY';
    const viewMode = query.viewMode || 'DAILY';
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
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

    if (viewMode === 'DAILY') {
      if (type === 'ELECTRICITY') {
        // Ngày trong tháng (01 -> lastDay)
        const lastDay = new Date(year, month, 0).getDate();
        const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        for (let d = 1; d <= lastDay; d++) {
          const s = new Date(year, month - 1, d, 0, 0, 0, 0);
          const e = new Date(year, month - 1, d, 23, 59, 59, 999);
          const dayName = weekdays[s.getDay()];
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
      } else {
        // Nước: 21 tháng trước -> 20 tháng này
        const cycle = this.getPeriodCycleInfo('WATER', month, year);
        const curr = new Date(cycle.startDate);
        const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        while (curr <= cycle.endDate) {
          const s = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate(), 0, 0, 0, 0);
          const e = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate(), 23, 59, 59, 999);
          const dayName = weekdays[s.getDay()];
          const dNum = curr.getDate();
          const mNum = curr.getMonth() + 1;
          const key = `${curr.getFullYear()}-${String(mNum).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
          timeColumns.push({
            key,
            label: `${String(dNum).padStart(2, '0')}/${String(mNum).padStart(2, '0')} (${dayName})`,
            shortLabel: `${String(dNum).padStart(2, '0')}`,
            subLabel: dayName,
            startDate: s,
            endDate: e,
          });
          curr.setDate(curr.getDate() + 1);
        }
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
    const pointRows = points.map((p) => {
      const values: Record<string, number> = {};
      let total = 0;
      let nonZeroCount = 0;

      timeColumns.forEach((col) => {
        const inSlot = p.readings.filter(
          (r) => r.recordedAt >= col.startDate && r.recordedAt <= col.endDate,
        );
        let cons = 0;
        if (inSlot.length > 0) {
          cons = inSlot.reduce((sum, r) => sum + (r.consumption || 0), 0);
        }
        cons = Number(cons.toFixed(2));
        values[col.key] = cons;
        total += cons;
        if (cons > 0) nonZeroCount++;
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
