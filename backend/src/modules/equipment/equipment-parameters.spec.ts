import { Reflector } from '@nestjs/core';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { EquipmentParametersService } from './equipment-parameters.service';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaService } from '../../prisma/prisma.service';

describe('EquipmentParameters & RBAC PermissionsGuard Tests', () => {
  let service: EquipmentParametersService;
  let guard: PermissionsGuard;
  let reflector: Reflector;

  const mockPrismaService: any = {
    equipment: {
      findUnique: jest.fn().mockResolvedValue({ id: 'eq-1' }),
    },
    equipmentParameter: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((promises) => Promise.all(promises)),
  };

  beforeEach(() => {
    reflector = new Reflector();
    service = new EquipmentParametersService(mockPrismaService as unknown as PrismaService);
    guard = new PermissionsGuard(reflector, mockPrismaService as unknown as PrismaService);
    jest.clearAllMocks();
  });

  describe('EquipmentParametersService - displayOrder and reordering', () => {
    it('should assign max + 1 to displayOrder when creating a parameter', async () => {
      mockPrismaService.equipmentParameter.findFirst.mockResolvedValue({ displayOrder: 4 });
      mockPrismaService.equipmentParameter.create.mockResolvedValue({
        id: 'param-5',
        equipmentId: 'eq-1',
        name: 'Áp suất nén',
        displayOrder: 5,
      });

      const res = await service.createParameter('eq-1', {
        name: 'Áp suất nén',
        unit: 'Bar',
      });

      expect(mockPrismaService.equipmentParameter.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            displayOrder: 5,
          }),
        })
      );
      expect(res.displayOrder).toBe(5);
    });

    it('should assign displayOrder = 0 when creating the first parameter', async () => {
      mockPrismaService.equipmentParameter.findFirst.mockResolvedValue(null);
      mockPrismaService.equipmentParameter.create.mockResolvedValue({
        id: 'param-1',
        equipmentId: 'eq-1',
        name: 'Nhiệt độ',
        displayOrder: 0,
      });

      const res = await service.createParameter('eq-1', {
        name: 'Nhiệt độ',
      });

      expect(mockPrismaService.equipmentParameter.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            displayOrder: 0,
          }),
        })
      );
      expect(res.displayOrder).toBe(0);
    });

    it('should reorder parameters by updating displayOrder in a transaction', async () => {
      mockPrismaService.equipmentParameter.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.equipmentParameter.findMany.mockResolvedValue([
        { id: 'param-b', displayOrder: 0 },
        { id: 'param-a', displayOrder: 1 },
      ]);

      const res = await service.reorderParameters('eq-1', ['param-b', 'param-a']);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockPrismaService.equipmentParameter.updateMany).toHaveBeenCalledWith({
        where: { id: 'param-b', equipmentId: 'eq-1' },
        data: { displayOrder: 0 },
      });
      expect(mockPrismaService.equipmentParameter.updateMany).toHaveBeenCalledWith({
        where: { id: 'param-a', equipmentId: 'eq-1' },
        data: { displayOrder: 1 },
      });
      expect(res[0].id).toBe('param-b');
      expect(res[1].id).toBe('param-a');
    });

    it('should query parameters sorted by displayOrder asc', async () => {
      mockPrismaService.equipmentParameter.findMany.mockResolvedValue([]);
      await service.getParameters('eq-1');

      expect(mockPrismaService.equipmentParameter.findMany).toHaveBeenCalledWith({
        where: { equipmentId: 'eq-1' },
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
      });
    });
  });

  describe('PermissionsGuard - Pure RBAC verification', () => {
    function createMockContext(userId: string | null): ExecutionContext {
      return {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            user: userId ? { id: userId } : null,
          }),
        }),
      } as unknown as ExecutionContext;
    }

    it('should allow access when endpoint has no required permissions', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const ctx = createMockContext('user-1');

      const allowed = await guard.canActivate(ctx);
      expect(allowed).toBe(true);
    });

    it('should throw ForbiddenException if user has neither role permissions nor custom permissions', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['equipment:reorder_parameters']);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        customRole: { permissions: JSON.stringify(['equipment:view']) },
        customPermissions: null,
      });
      const ctx = createMockContext('user-1');

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });

    it('should allow access if role has exact permission "equipment:reorder_parameters"', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['equipment:reorder_parameters']);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        customRole: { permissions: JSON.stringify(['equipment:view', 'equipment:reorder_parameters']) },
        customPermissions: null,
      });
      const ctx = createMockContext('user-1');

      const allowed = await guard.canActivate(ctx);
      expect(allowed).toBe(true);
    });

    it('should allow access if role has wildcard "*"', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['equipment:reorder_parameters']);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-admin',
        customRole: { permissions: JSON.stringify(['*']) },
        customPermissions: null,
      });
      const ctx = createMockContext('user-admin');

      const allowed = await guard.canActivate(ctx);
      expect(allowed).toBe(true);
    });

    it('should allow access if role has wildcard "ALL"', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['equipment:reorder_parameters']);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-admin',
        customRole: { permissions: JSON.stringify(['ALL']) },
        customPermissions: null,
      });
      const ctx = createMockContext('user-admin');

      const allowed = await guard.canActivate(ctx);
      expect(allowed).toBe(true);
    });

    it('should allow access if role has module wildcard "equipment:*"', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['equipment:reorder_parameters']);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-equip-manager',
        customRole: { permissions: JSON.stringify(['equipment:*']) },
        customPermissions: null,
      });
      const ctx = createMockContext('user-equip-manager');

      const allowed = await guard.canActivate(ctx);
      expect(allowed).toBe(true);
    });

    it('should allow access if granted specifically via user customPermissions', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['equipment:reorder_parameters']);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-special',
        customRole: { permissions: JSON.stringify(['equipment:view']) },
        customPermissions: JSON.stringify(['equipment:reorder_parameters']),
      });
      const ctx = createMockContext('user-special');

      const allowed = await guard.canActivate(ctx);
      expect(allowed).toBe(true);
    });
  });
});
