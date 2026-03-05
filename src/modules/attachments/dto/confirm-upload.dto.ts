import {
  IsMimeType,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class ConfirmUploadDto {
  @IsString()
  @IsNotEmpty()
  s3Key: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  originalName: string;

  @IsMimeType()
  mimeType: string;

  @IsNumber()
  @IsPositive()
  sizeBytes: number;
}
