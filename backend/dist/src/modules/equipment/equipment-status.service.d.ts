import { PrismaService } from '../../prisma/prisma.service';
export declare class EquipmentStatusService {
    private prisma;
    constructor(prisma: PrismaService);
    calculateAndSetStatus(equipmentId: string, tx?: any): Promise<string>;
}
