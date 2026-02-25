import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import { SelectionMemberRole } from '../enums/selection-member-role.enum';

export class AddMemberDto {
  @ApiProperty()
  @IsUUID('4')
  userId: string;

  @ApiProperty()
  @IsEnum(SelectionMemberRole)
  role: SelectionMemberRole;
}
