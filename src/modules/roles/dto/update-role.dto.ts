import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class UpdateRoleDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiProperty()
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds?: string[];
}
