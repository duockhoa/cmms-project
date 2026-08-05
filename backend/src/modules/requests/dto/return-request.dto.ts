import { IsNumber, IsString, IsNotEmpty } from 'class-validator';

export class ReturnRequestDto {
  @IsNumber()
  expectedVersion: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsNotEmpty()
  actedById: string;
}
