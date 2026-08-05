export declare enum EquipmentStatus {
    OPERATIONAL = "OPERATIONAL",
    UNDER_MAINTENANCE = "UNDER_MAINTENANCE",
    INCIDENT = "INCIDENT",
    DISCOMMISSIONED = "DISCOMMISSIONED"
}
export declare class CreateEquipmentDto {
    code: string;
    name: string;
    category: string;
    location: string;
    status?: EquipmentStatus;
    purchaseDate?: string;
    warrantyPeriod?: string;
    image?: string;
    serialNumber?: string;
    specs?: string;
    notes?: string;
    currentOperatingHours?: number;
}
export declare class UpdateEquipmentDto {
    name?: string;
    category?: string;
    location?: string;
    status?: EquipmentStatus;
    purchaseDate?: string;
    warrantyPeriod?: string;
    image?: string;
    serialNumber?: string;
    specs?: string;
    notes?: string;
    currentOperatingHours?: number;
    expectedVersion: number;
}
