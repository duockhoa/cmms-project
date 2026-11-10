import { IncidentResponseKpiService } from './incident-response-kpi.service';

describe('IncidentResponseKpiService', () => {
  let service: IncidentResponseKpiService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      maintenanceRequest: {
        findMany: jest.fn(),
      },
    };
    service = new IncidentResponseKpiService(mockPrisma);
  });

  it('exempts historical incidents before cutoff date and treats them as PASS', async () => {
    // 2026-11-05 is before cutoff date 2026-11-10
    const historicalTime = new Date('2026-11-05T08:00:00+07:00');
    const assessedSlow = new Date('2026-11-05T18:00:00+07:00'); // 10h later

    mockPrisma.maintenanceRequest.findMany.mockResolvedValue([
      {
        id: 'req-hist',
        requestCode: 'MR-HIST',
        createdAt: historicalTime,
        department: 'Xưởng Ống',
        equipment: { code: 'EQ-01', name: 'Máy Ép Vỉ', department: 'Xưởng Ống' },
        initialAssessment: {
          assessorDepartment: 'Cơ điện',
          assessedAt: assessedSlow,
          preliminaryCause: 'Cơ khí',
        },
        workOrders: [
          {
            id: 'wo-1',
            orderCode: 'WO-001',
            handlingRoute: 'TECHNICAL_MAINTENANCE_SUPPORT',
            assignedTechnicianId: 'tech-1',
            createdAt: historicalTime,
            executionLogs: [{ recordedAt: historicalTime }],
          },
        ],
      },
    ]);

    const result = await service.calculateIncidentResponseKpi({});

    expect(result.overall.totalIncidents).toBe(1);
    expect(result.overall.respondedWithin4hCount).toBe(1);
    expect(result.overall.overdueResponseCount).toBe(0);
    expect(result.overall.responseRateWithin4h).toBe(100);
    expect(result.overall.status).toBe('EXCELLENT');
  });

  it('calculates 100% KPI for post-cutoff incidents responded within 4 working hours', async () => {
    // 2026-11-16 is Monday (after cutoff)
    const assignedTime = new Date('2026-11-16T16:00:00+07:00');
    // Responded next day at 09:30 -> 1h Monday + 1.5h Tuesday = 2.5 working hours <= 4h
    const assessedNextMorning = new Date('2026-11-17T09:30:00+07:00');

    mockPrisma.maintenanceRequest.findMany.mockResolvedValue([
      {
        id: 'req-1',
        requestCode: 'MR-001',
        createdAt: assignedTime,
        department: 'Xưởng Ống',
        equipment: { code: 'EQ-01', name: 'Máy Ép Vỉ', department: 'Xưởng Ống' },
        initialAssessment: {
          assessorDepartment: 'Cơ điện',
          assessedAt: assessedNextMorning,
          preliminaryCause: 'Cơ khí',
        },
        workOrders: [
          {
            id: 'wo-1',
            orderCode: 'WO-001',
            handlingRoute: 'TECHNICAL_MAINTENANCE_SUPPORT',
            assignedTechnicianId: 'tech-1',
            createdAt: assignedTime,
            executionLogs: [{ recordedAt: assignedTime }],
          },
        ],
      },
    ]);

    const result = await service.calculateIncidentResponseKpi({});

    expect(result.overall.totalIncidents).toBe(1);
    expect(result.overall.respondedWithin4hCount).toBe(1);
    expect(result.overall.overdueResponseCount).toBe(0);
    expect(result.overall.responseRateWithin4h).toBe(100);
    expect(result.overall.status).toBe('EXCELLENT');
  });

  it('identifies overdue when response exceeds 4 working hours', async () => {
    // 2026-11-16 Monday 08:00 to 14:00 = 6 working hours (> 4h)
    const assignedTime = new Date('2026-11-16T08:00:00+07:00');
    const assessedLate = new Date('2026-11-16T14:00:00+07:00');

    mockPrisma.maintenanceRequest.findMany.mockResolvedValue([
      {
        id: 'req-late',
        requestCode: 'MR-LATE',
        createdAt: assignedTime,
        department: 'Xưởng Viên',
        equipment: { code: 'EQ-02', name: 'Máy Dập Viên', department: 'Xưởng Viên' },
        initialAssessment: {
          assessorDepartment: 'Cơ điện',
          assessedAt: assessedLate,
          preliminaryCause: 'Kẹt phôi',
        },
        workOrders: [
          {
            id: 'wo-2',
            orderCode: 'WO-002',
            handlingRoute: 'TECHNICAL_MAINTENANCE_SUPPORT',
            assignedTechnicianId: 'tech-2',
            createdAt: assignedTime,
            executionLogs: [{ recordedAt: assignedTime }],
          },
        ],
      },
    ]);

    const result = await service.calculateIncidentResponseKpi({});

    expect(result.overall.totalIncidents).toBe(1);
    expect(result.overall.respondedWithin4hCount).toBe(0);
    expect(result.overall.overdueResponseCount).toBe(1);
    expect(result.overall.responseRateWithin4h).toBe(0);
    expect(result.overall.status).toBe('FAIL');
    expect(result.overdueIncidents.length).toBe(1);
    expect(result.overdueIncidents[0].requestCode).toBe('MR-LATE');
    expect(result.overdueIncidents[0].hoursWaited).toBe(6);
  });

  it('excludes workshop self-handle requests and unassigned requests from KPI', async () => {
    mockPrisma.maintenanceRequest.findMany.mockResolvedValue([
      {
        id: 'req-self',
        requestCode: 'MR-SELF',
        createdAt: new Date('2026-11-16T08:00:00+07:00'),
        department: 'Xưởng Viên',
        equipment: { code: 'EQ-03', name: 'Máy Rửa', department: 'Xưởng Viên' },
        workOrders: [
          {
            id: 'wo-3',
            orderCode: 'WO-003',
            handlingRoute: 'WORKSHOP_SELF_HANDLE',
            assignedTechnicianId: 'worker-1',
          },
        ],
      },
      {
        id: 'req-unassigned',
        requestCode: 'MR-UNASSIGNED',
        createdAt: new Date('2026-11-16T08:00:00+07:00'),
        department: 'Xưởng Viên',
        equipment: { code: 'EQ-04', name: 'Máy Ép', department: 'Xưởng Viên' },
        workOrders: [], // No WO or technician assigned yet
      },
    ]);

    const result = await service.calculateIncidentResponseKpi({});

    expect(result.overall.totalIncidents).toBe(0);
    expect(result.overall.respondedWithin4hCount).toBe(0);
    expect(result.overall.overdueResponseCount).toBe(0);
    expect(result.overall.responseRateWithin4h).toBe(100);
  });
});
