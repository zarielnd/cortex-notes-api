import {
  AbilityBuilder,
  createMongoAbility,
  ExtractSubjectType,
  InferSubjects,
  MongoAbility,
} from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Note } from 'src/entities/note.entity';
import { SelectionMember } from 'src/entities/selection-member.entity';
import { User, UserStatus } from 'src/entities/user.entity';
import { SelectionMemberRole } from 'src/modules/selections/enums/selection-member-role.enum';
import { Repository } from 'typeorm';
import { RedisKeys, RedisTtl } from '../redis/redis-key.constant';
import { RedisService } from '../redis/redis.service';

export enum Action {
  Manage = 'manage',
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
}

type Subjects = InferSubjects<
  typeof User | typeof Note | typeof Selection | 'all'
>;

export type AppAbility = MongoAbility<[Action, Subjects]>;

export interface SelectionAbilityContext {
  selectionMemberRole: SelectionMemberRole | null;
}

@Injectable()
export class CaslAbilityFactory {
  constructor(
    @InjectRepository(SelectionMember)
    private readonly memberRepository: Repository<SelectionMember>,
    private readonly redisService: RedisService,
  ) {}

  async createForUserInSelection(
    user: User,
    selectionId: string,
  ): Promise<AppAbility> {
    const memberRole = await this.getMemberRoleCached(user.id, selectionId);
    return this.createForUser(user, { selectionMemberRole: memberRole });
  }

  private async getMemberRoleCached(
    userId: string,
    selectionId: string,
  ): Promise<SelectionMemberRole | null> {
    const cacheKey = RedisKeys.ability(userId, selectionId);
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return cached === 'null' ? null : (cached as SelectionMemberRole);
    }

    const member = await this.memberRepository.findOne({
      where: { userId, selectionId },
    });

    const role = member?.role ?? null;

    await this.redisService.set(cacheKey, role ?? 'null', RedisTtl.ABILITY);

    return role;
  }
  createForUser(user: User, ctx?: SelectionAbilityContext): AppAbility {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(
      createMongoAbility,
    );

    const allPermissions = user.roles.flatMap((role) => role.permissions);
    const isSystemAdmin = allPermissions.some((p) => p.name === 'all:manage');

    if (isSystemAdmin) {
      // Admin manages everything unconditionally
      can(Action.Manage, 'all');
    } else if (ctx) {
      this.applySelectionAbilities(can, cannot, user, ctx.selectionMemberRole);
    } else {
      // No selection context — only own-profile access
      can(Action.Read, User, { id: user.id } as Partial<User>);
      can(Action.Update, User, { id: user.id } as Partial<User>);
    }

    // Hard lock — disabled/locked users lose all abilities regardless
    if (user.status !== UserStatus.ACTIVE) {
      cannot(Action.Manage, 'all');
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }
  async invalidateAbilityCache(
    userId: string,
    selectionId: string,
  ): Promise<void> {
    await this.redisService.del(RedisKeys.ability(userId, selectionId));
  }
  private applySelectionAbilities(
    can: AbilityBuilder<AppAbility>['can'],
    cannot: AbilityBuilder<AppAbility>['cannot'],
    user: User,
    memberRole: SelectionMemberRole | null,
  ): void {
    if (!memberRole) return;

    switch (memberRole) {
      case SelectionMemberRole.OWNER:
        // Owner: full control over selection and all its notes
        can(Action.Manage, Selection);
        can(Action.Manage, Note);
        break;

      case SelectionMemberRole.EDITOR:
        // Editor: read selection, CRUD own notes, read others' notes, update any note
        can(Action.Read, Selection);
        can(Action.Create, Note);
        can(Action.Read, Note);
        can(Action.Update, Note); // can update any note
        // Can delete ONLY their own notes
        can(Action.Delete, Note, {
          createdBy: user.id,
        } as Partial<Note>);
        // Cannot delete notes they didn't create
        cannot(Action.Delete, Note, {
          createdBy: { $ne: user.id },
        } as unknown as Partial<Note>);
        break;

      case SelectionMemberRole.VIEWER:
        can(Action.Read, Selection);
        can(Action.Read, Note);
        break;
    }
  }
}
