import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, FindOptionsWhere } from 'typeorm';
import * as crypto from 'crypto';
import { User, UserStatus } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { MailService } from '../mail/mail.service';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly mailService: MailService,
    private readonly tokenService: AuthService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      relations: ['roles', 'roles.permissions'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id } as FindOptionsWhere<User>,
      relations: ['roles', 'roles.permissions'],
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email } as FindOptionsWhere<User>,
      relations: ['roles', 'roles.permissions'],
    });
  }

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email } as FindOptionsWhere<User>,
    });

    if (existing) throw new ConflictException('Email already in use');

    const temporaryPassword = crypto.randomBytes(8).toString('hex');

    const roles = dto.roleIds?.length
      ? await this.roleRepository.findByIds(dto.roleIds)
      : [];

    const user = this.userRepository.create({
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      password: temporaryPassword,
      roles,
    });

    const savedUser = await this.userRepository.save(user);

    await this.mailService.sendWelcomeEmail({
      to: savedUser.email,
      firstName: savedUser.firstName,
      tempPassword: temporaryPassword,
    });

    return savedUser;
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    if (dto.roleIds !== undefined) {
      user.roles = dto.roleIds.length
        ? await this.roleRepository.findByIds(dto.roleIds)
        : [];
    }

    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.status !== undefined) user.status = dto.status;

    return this.userRepository.save(user);
  }

  async disable(id: string): Promise<User> {
    const user = await this.findById(id);
    if (user.status === UserStatus.INACTIVE) {
      throw new BadRequestException('User is already disabled');
    }

    user.status = UserStatus.INACTIVE;
    await this.tokenService.revokeAllForUser(id);
    return this.userRepository.save(user);
  }

  async lock(id: string, durationMinutes: number = 60): Promise<User> {
    const user = await this.findById(id);

    user.status = UserStatus.LOCKED;
    user.lockedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
    await this.tokenService.revokeAllForUser(id);
    return this.userRepository.save(user);
  }

  async unlock(id: string): Promise<User> {
    const user = await this.findById(id);

    user.status = UserStatus.ACTIVE;
    user.failedLoginAttempts = 0;
    user.lockedUntil = null as unknown as Date;
    return this.userRepository.save(user);
  }

  async remove(id: string): Promise<{ message: string }> {
    const user = await this.findById(id);

    await this.dataSource.transaction(async (manager) => {
      await this.tokenService.revokeAllForUser(id);
      await manager.softDelete(User, id);
    });

    return { message: `User ${user.email} deleted` };
  }

  async assignRoles(userId: string, roleIds: string[]): Promise<User> {
    const user = await this.findById(userId);
    const roles = await this.roleRepository.findByIds(roleIds);

    if (roles.length !== roleIds.length) {
      throw new BadRequestException('One or more roles not found');
    }

    user.roles = roles;
    return this.userRepository.save(user);
  }
}
