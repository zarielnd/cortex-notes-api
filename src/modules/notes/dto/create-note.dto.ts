import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsUUID,
} from 'class-validator';

export class CreateNoteDto {
  @ApiProperty()
  @IsUUID('4')
  selectionId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  content?: string;
}
