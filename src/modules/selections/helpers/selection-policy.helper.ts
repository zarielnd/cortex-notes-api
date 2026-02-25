import { SelectionMemberRole } from '../enums/selection-member-role.enum';
import { SelectionMemberContext } from '../types/selection-context.type';

export function canManageSelection(ctx: SelectionMemberContext): boolean {
  return ctx.isSystemAdmin || ctx.role === SelectionMemberRole.OWNER;
}

export function canEditSelection(ctx: SelectionMemberContext): boolean {
  return (
    ctx.isSystemAdmin ||
    ctx.role === SelectionMemberRole.OWNER ||
    ctx.role === SelectionMemberRole.EDITOR
  );
}

export function canViewSelection(ctx: SelectionMemberContext): boolean {
  return (
    ctx.isSystemAdmin ||
    ctx.role === SelectionMemberRole.OWNER ||
    ctx.role === SelectionMemberRole.EDITOR ||
    ctx.role === SelectionMemberRole.VIEWER
  );
}

export function canDeleteSelection(ctx: SelectionMemberContext): boolean {
  return ctx.isSystemAdmin || ctx.role === SelectionMemberRole.OWNER;
}