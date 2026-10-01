export class WorkOrderStatusChangedEvent {
  constructor(
    public readonly workOrder: any,
    public readonly actionName: string,
    public readonly targetStatus: string,
    public readonly actorContext?: { id: string; role: string },
    public readonly comment?: string,
    public readonly reason?: string,
  ) {}
}
