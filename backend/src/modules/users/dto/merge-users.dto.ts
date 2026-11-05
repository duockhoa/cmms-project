import { Equals, IsNotEmpty, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class PreviewUserMergeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  sourceUserId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  targetUserId: string;
}

export class ConfirmUserMergeDto {
  @IsUUID()
  previewId: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  reason: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  evidence: string;

  @Equals(true)
  confirmed: boolean;
}
