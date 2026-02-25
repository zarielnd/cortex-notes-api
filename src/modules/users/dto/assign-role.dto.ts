import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class AssignRolesDto {
  @ApiProperty()
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds: string[];
}
