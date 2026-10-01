export class RequestCreatedEvent {
  constructor(
    public readonly request: any,
    public readonly equipment: any,
  ) {}
}

export class RequestApprovedEvent {
  constructor(
    public readonly requestId: string,
    public readonly workOrder: any,
    public readonly isExternalTransfer: boolean,
    public readonly targetDepartment?: string,
  ) {}
}

export class RequestRejectedEvent {
  constructor(
    public readonly requestId: string,
    public readonly reason?: string,
    public readonly actorId?: string,
  ) {}
}

export class RequestReturnedEvent {
  constructor(
    public readonly requestId: string,
    public readonly reason: string,
    public readonly actorId: string,
  ) {}
}
