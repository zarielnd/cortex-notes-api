import {
  IsString,
  IsOptional,
  MaxLength,
  IsArray,
  IsUUID,
  IsEnum,
} from 'class-validator';
import { UserStatus } from '../../../entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiProperty()
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds?: string[];

  @ApiProperty()
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
