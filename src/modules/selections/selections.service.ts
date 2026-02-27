import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SelectionMember } from 'src/entities/selection-member.entity';
import { User } from 'src/entities/user.entity';
import {
  Action,
  CaslAbilityFactory,
} from 'src/infrastructure/casl/casl-ability.factory';
import { RedisService } from 'src/infrastructure/redis/redis.service';
import { DataSource, Repository } from 'typeorm';
import { MailService } from '../mail/mail.service';

import { Selection } from 'src/entities/selection.entity';
import { RedisKeys } from 'src/infrastructure/redis/redis-key.constant';
import {
  AddMemberDto,
  CreateSelectionDto,
  UpdateMemberRoleDto,
  UpdateSelectionDto,
} from './dto';
import { SelectionMemberRole } from './enums/selection-member-role.enum';
import {
  canDeleteSelection,
  canEditSelection,
  canManageSelection,
  canViewSelection,
} from './helpers/selection-policy.helper';

@Injectable()
export class SelectionsService {
  constructor(
    @InjectRepository(Selection)
    private readonly selectionRepository: Repository<Selection>,
    @InjectRepository(SelectionMember)
    private readonly memberRepository: Repository<SelectionMember>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly mailService: MailService,
    private readonly dataSource: DataSource,
    private readonly caslAbilityFactory: CaslAbilityFactory,
    private readonly redisService: RedisService,
  ) {}

  //Context helpers

  private isSystemAdmin(user: User): boolean {
    return user.roles.some((r) =>
      r.permissions.some((p) => p.name === 'all:manage'),
    );
  }

  private async getMemberContext(
    selectionId: string,
    user: User,
  ): Promise<{ role: SelectionMemberRole | null; isSystemAdmin: boolean }> {
    const member = await this.memberRepository.findOne({
      where: { selectionId, userId: user.id },
    });

    return {
      role: member?.role ?? null,
      isSystemAdmin: this.isSystemAdmin(user),
    };
  }

  //CRUD

  async findAll(user: User): Promise<Selection[]> {
    if (this.isSystemAdmin(user)) {
      return this.selectionRepository.find({
        relations: ['creator', 'members', 'members.user'],
        order: { createdAt: 'DESC' },
      });
    }

    // Return only selections the user is a member of
    return this.selectionRepository
      .createQueryBuilder('selection')
      .innerJoin('selection.members', 'member', 'member.userId = :userId', {
        userId: user.id,
      })
      .leftJoinAndSelect('selection.creator', 'creator')
      .leftJoinAndSelect('selection.members', 'allMembers')
      .leftJoinAndSelect('allMembers.user', 'memberUser')
      .orderBy('selection.createdAt', 'DESC')
      .getMany();
  }

  async findOne(id: string, user: User): Promise<Selection> {
    const selection = await this.selectionRepository.findOne({
      where: { id },
      relations: ['creator', 'members', 'members.user'],
    });

    if (!selection) throw new NotFoundException('Selection not found');

    const ctx = await this.getMemberContext(id, user);

    if (!canViewSelection(ctx)) {
      throw new ForbiddenException('You do not have access to this selection');
    }

    return selection;
  }

  async create(dto: CreateSelectionDto, user: User): Promise<Selection> {
    return this.dataSource.transaction(async (manager) => {
      const selection = manager.create(Selection, {
        name: dto.name,
        description: dto.description,
        createdBy: user.id,
      });

      const savedSelection = await manager.save(Selection, selection);

      // Creator automatically becomes owner
      const ownerMember = manager.create(SelectionMember, {
        selectionId: savedSelection.id,
        userId: user.id,
        role: SelectionMemberRole.OWNER,
      });

      await manager.save(SelectionMember, ownerMember);

      return manager.findOneOrFail(Selection, {
        where: { id: savedSelection.id },
        relations: ['creator', 'members', 'members.user'],
      });
    });
  }

  async update(
    id: string,
    dto: UpdateSelectionDto,
    user: User,
  ): Promise<Selection> {
    const selection = await this.selectionRepository.findOne({
      where: { id },
    });

    if (!selection) throw new NotFoundException('Selection not found');

    const ctx = await this.getMemberContext(id, user);

    if (!canEditSelection(ctx)) {
      throw new ForbiddenException(
        'Only owners and editors can update this selection',
      );
    }

    if (dto.name !== undefined) selection.name = dto.name;
    if (dto.description !== undefined) selection.description = dto.description;

    return this.selectionRepository.save(selection);
  }

  async remove(id: string, user: User): Promise<{ message: string }> {
    const selection = await this.selectionRepository.findOne({
      where: { id },
    });

    if (!selection) throw new NotFoundException('Selection not found');

    const ctx = await this.getMemberContext(id, user);

    if (!canDeleteSelection(ctx)) {
      throw new ForbiddenException(
        'Only admins and owners can delete this selection',
      );
    }

    await this.selectionRepository.softDelete(id);

    return { message: 'Selection deleted successfully' };
  }

  // ─── Member management

  async addMember(
    selectionId: string,
    dto: AddMemberDto,
    inviter: User,
  ): Promise<SelectionMember> {
    const selection = await this.selectionRepository.findOne({
      where: { id: selectionId },
    });

    if (!selection) throw new NotFoundException('Selection not found');

    const ctx = await this.getMemberContext(selectionId, inviter);

    if (!canManageSelection(ctx)) {
      throw new ForbiddenException('Only owners can add members');
    }

    // Non-admins cannot grant OWNER role unless they themselves are admin
    if (
      dto.role === SelectionMemberRole.OWNER &&
      !ctx.isSystemAdmin &&
      ctx.role !== SelectionMemberRole.OWNER
    ) {
      throw new ForbiddenException('Only owners can grant owner role');
    }

    const targetUser = await this.userRepository.findOne({
      where: { id: dto.userId },
    });

    if (!targetUser) throw new NotFoundException('User not found');

    const existing = await this.memberRepository.findOne({
      where: { selectionId, userId: dto.userId },
    });

    if (existing) {
      throw new ConflictException('User is already a member of this selection');
    }

    const member = this.memberRepository.create({
      selectionId,
      userId: dto.userId,
      role: dto.role,
    });

    const saved = await this.memberRepository.save(member);

    // Send notification email (non-blocking via BullMQ)
    await this.mailService.sendSelectionInviteEmail({
      to: targetUser.email,
      firstName: targetUser.firstName,
      inviterName: inviter.fullName,
      selectionId,
      selectionName: selection.name,
      role: dto.role,
    });

    return this.memberRepository.findOneOrFail({
      where: { id: saved.id },
      relations: ['user'],
    });
  }

  async updateMemberRole(
    selectionId: string,
    targetUserId: string, // Fix 20 — use userId not memberId
    dto: UpdateMemberRoleDto,
    requester: User,
  ): Promise<SelectionMember> {
    const selection = await this.selectionRepository.findOne({
      where: { id: selectionId },
    });
    if (!selection) throw new NotFoundException('Selection not found');

    const ability = await this.caslAbilityFactory.createForUserInSelection(
      requester,
      selectionId,
    );

    if (!ability.can(Action.Manage, Selection)) {
      throw new ForbiddenException('Only owners can change member roles');
    }

    const member = await this.memberRepository.findOne({
      where: { selectionId, userId: targetUserId },
      relations: ['user'],
    });
    if (!member) throw new NotFoundException('Member not found');

    if (member.role === SelectionMemberRole.OWNER) {
      const ownerCount = await this.memberRepository.count({
        where: { selectionId, role: SelectionMemberRole.OWNER },
      });

      if (ownerCount <= 1 && dto.role !== SelectionMemberRole.OWNER) {
        throw new BadRequestException('Cannot demote the last owner');
      }
    }

    member.role = dto.role;
    const saved = await this.memberRepository.save(member);

    // Invalidate both selection cache and this user's ability cache
    this.invalidateSelectionCache(selectionId);
    await this.caslAbilityFactory.invalidateAbilityCache(
      targetUserId,
      selectionId,
    );

    return saved;
  }
  private async invalidateSelectionCache(id: string): Promise<void> {
    await this.redisService.del(
      RedisKeys.selection(id),
      RedisKeys.selectionMembers(id),
    );
  }

  async removeMember(
    selectionId: string,
    memberId: string,
    requester: User,
  ): Promise<{ message: string }> {
    const selection = await this.selectionRepository.findOne({
      where: { id: selectionId },
    });

    if (!selection) throw new NotFoundException('Selection not found');

    const member = await this.memberRepository.findOne({
      where: { id: memberId, selectionId },
    });

    if (!member) throw new NotFoundException('Member not found');

    const ctx = await this.getMemberContext(selectionId, requester);

    // Allow self-removal OR owner/admin managing others
    const isSelf = member.userId === requester.id;

    if (!isSelf && !canManageSelection(ctx)) {
      throw new ForbiddenException('Only owners can remove other members');
    }

    if (member.role === SelectionMemberRole.OWNER) {
      const ownerCount = await this.memberRepository.count({
        where: { selectionId, role: SelectionMemberRole.OWNER },
      });

      if (ownerCount <= 1) {
        throw new BadRequestException(
          'Cannot remove the last owner. Transfer ownership first.',
        );
      }
    }

    await this.memberRepository.remove(member);

    return { message: 'Member removed from selection' };
  }

  async getMembers(
    selectionId: string,
    user: User,
  ): Promise<SelectionMember[]> {
    const ctx = await this.getMemberContext(selectionId, user);

    if (!canViewSelection(ctx)) {
      throw new ForbiddenException('No access to this selection');
    }

    return this.memberRepository.find({
      where: { selectionId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }
}
