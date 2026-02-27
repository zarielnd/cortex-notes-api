import { IsMimeType, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class PresignUploadRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  originalName: string;

  @IsMimeType()
  mimeType: string;
}
