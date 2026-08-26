export type EquipmentStatus = 'OPERATIONAL' | 'UNDER_MAINTENANCE' | 'INCIDENT' | 'DISCOMMISSIONED';

export interface Equipment {
  id: string;
  code: string;
  accountingCode?: string;
  name: string;
  category: string;
  location: string;
  status: EquipmentStatus;
  purchaseDate?: string;
  warrantyPeriod?: string;
  image?: string;
  serialNumber?: string;
  specs?: string;
  notes?: string;
  currentOperatingHours: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}
