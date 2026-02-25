import { IsEnum } from 'class-validator';
import { SelectionMemberRole } from '../enums/selection-member-role.enum';

export class UpdateMemberRoleDto {
  @IsEnum(SelectionMemberRole)
  role: SelectionMemberRole;
}
