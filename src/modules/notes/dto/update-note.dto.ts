import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateNoteDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  changeSummary?: string;
}
