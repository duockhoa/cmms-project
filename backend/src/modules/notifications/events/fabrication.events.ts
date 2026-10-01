export class FabricationAssignedEvent {
  constructor(public readonly order: any) {}
}

export class FabricationUpdatedEvent {
  constructor(
    public readonly updated: any,
    public readonly existing: any,
    public readonly dto: any,
    public readonly auditAction?: string,
    public readonly auditReason?: string,
    public readonly user?: any,
  ) {}
}
