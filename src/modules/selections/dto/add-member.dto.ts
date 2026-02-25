import { IsUUID, IsEnum } from 'class-validator';
import { SelectionMemberRole } from '../enums/selection-member-role.enum';

export class AddMemberDto {
  @IsUUID('4')
  userId: string;

  @IsEnum(SelectionMemberRole)
  role: SelectionMemberRole;
}
