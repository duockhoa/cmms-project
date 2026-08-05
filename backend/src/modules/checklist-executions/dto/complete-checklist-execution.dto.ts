import { IsNumber } from 'class-validator';

export class CompleteChecklistExecutionDto {
  @IsNumber()
  expectedVersion: number;
}
