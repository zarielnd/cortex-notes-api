import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { SelectionMemberRole } from '../enums/selection-member-role.enum';

export class UpdateMemberRoleDto {
  @ApiProperty()
  @IsEnum(SelectionMemberRole)
  role: SelectionMemberRole;
}
