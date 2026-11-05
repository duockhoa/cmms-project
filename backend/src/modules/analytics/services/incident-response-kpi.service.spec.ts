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

  it('should calculate 100% KPI when all incidents are responded within 4h', async () => {
    const baseTime = new Date('2026-11-05T08:00:00Z');
    const assessed1 = new Date('2026-11-05T09:30:00Z'); // 1.5h
    const assessed2 = new Date('2026-11-05T11:45:00Z'); // 3.75h

    mockPrisma.maintenanceRequest.findMany.mockResolvedValue([
      {
        id: 'req-1',
        requestCode: 'MR-001',
        createdAt: baseTime,
        department: 'Xưởng Ống',
        equipment: { code: 'EQ-01', name: 'Máy Ép Vỉ', department: 'Xưởng Ống' },
        initialAssessment: {
          assessorDepartment: 'Cơ điện',
          assessedAt: assessed1,
          preliminaryCause: 'Cơ khí',
        },
        workOrders: [],
      },
      {
        id: 'req-2',
        requestCode: 'MR-002',
        createdAt: baseTime,
        department: 'Xưởng Viên',
        equipment: { code: 'EQ-02', name: 'Máy Dập Viên', department: 'Xưởng Viên' },
        initialAssessment: {
          assessorDepartment: 'Cơ điện',
          assessedAt: assessed2,
          preliminaryCause: 'Điện',
        },
        workOrders: [],
      },
    ]);

    const result = await service.calculateIncidentResponseKpi({});

    expect(result.overall.totalIncidents).toBe(2);
    expect(result.overall.respondedWithin4hCount).toBe(2);
    expect(result.overall.overdueResponseCount).toBe(0);
    expect(result.overall.responseRateWithin4h).toBe(100);
    expect(result.overall.status).toBe('EXCELLENT');
    expect(result.bySupportDepartment.length).toBe(1);
    expect(result.bySupportDepartment[0].department).toBe('Cơ điện');
    expect(result.bySupportDepartment[0].responseRateWithin4h).toBe(100);
  });

  it('should calculate correct % and identify overdue incidents when > 4h', async () => {
    const baseTime = new Date('2026-11-05T08:00:00Z');
    const assessedFast = new Date('2026-11-05T09:00:00Z'); // 1h
    const assessedSlow = new Date('2026-11-05T13:30:00Z'); // 5.5h (overdue)

    mockPrisma.maintenanceRequest.findMany.mockResolvedValue([
      {
        id: 'req-1',
        requestCode: 'MR-001',
        createdAt: baseTime,
        department: 'Xưởng Ống',
        equipment: { code: 'EQ-01', name: 'Máy Ép Vỉ', department: 'Xưởng Ống' },
        initialAssessment: {
          assessorDepartment: 'Cơ điện',
          assessedAt: assessedFast,
          preliminaryCause: 'Cơ khí',
        },
        workOrders: [],
      },
      {
        id: 'req-2',
        requestCode: 'MR-002',
        createdAt: baseTime,
        department: 'Xưởng Viên',
        equipment: { code: 'EQ-02', name: 'Máy Dập Viên', department: 'Xưởng Viên' },
        initialAssessment: {
          assessorDepartment: 'Cơ điện',
          assessedAt: assessedSlow,
          preliminaryCause: 'Kẹt phôi',
        },
        workOrders: [],
      },
    ]);

    const result = await service.calculateIncidentResponseKpi({});

    expect(result.overall.totalIncidents).toBe(2);
    expect(result.overall.respondedWithin4hCount).toBe(1);
    expect(result.overall.overdueResponseCount).toBe(1);
    expect(result.overall.responseRateWithin4h).toBe(50);
    expect(result.overall.status).toBe('FAIL');
    expect(result.overdueIncidents.length).toBe(1);
    expect(result.overdueIncidents[0].requestCode).toBe('MR-002');
    expect(result.overdueIncidents[0].hoursWaited).toBe(5.5);
  });
});
