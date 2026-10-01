export class ScheduleWorkOrderGeneratedEvent {
  constructor(
    public readonly schedule: any,
    public readonly createdWO: any,
  ) {}
}
