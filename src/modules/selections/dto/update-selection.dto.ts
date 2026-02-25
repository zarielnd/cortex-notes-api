import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateSelectionDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
