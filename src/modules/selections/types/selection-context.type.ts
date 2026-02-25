import { SelectionMemberRole } from '../enums/selection-member-role.enum';

export interface SelectionMemberContext {
  role: SelectionMemberRole | null;
  isSystemAdmin: boolean;
}
