import { IsNumber, IsString, IsNotEmpty } from 'class-validator';

export class CancelRequestDto {
  @IsNumber()
  expectedVersion: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
