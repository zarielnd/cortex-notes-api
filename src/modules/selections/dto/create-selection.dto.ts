import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateSelectionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
