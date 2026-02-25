import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Permission } from 'src/entities/permission.entity';
import { Repository } from 'typeorm';

export interface CreatePermissionDto {
  name: string;
  action: string;
  subject: string;
  description?: string;
}

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  async findAll(): Promise<Permission[]> {
    return this.permissionRepository.find({ order: { subject: 'ASC' } });
  }

  async findById(id: string): Promise<Permission> {
    const permission = await this.permissionRepository.findOne({
      where: { id },
    });
    if (!permission) throw new NotFoundException('Permission not found');
    return permission;
  }

  async create(dto: CreatePermissionDto): Promise<Permission> {
    const existing = await this.permissionRepository.findOne({
      where: { name: dto.name },
    });
    if (existing) throw new ConflictException('Permission name already exists');

    const permission = this.permissionRepository.create(dto);
    return this.permissionRepository.save(permission);
  }

  async remove(id: string): Promise<{ message: string }> {
    const permission = await this.findById(id);
    await this.permissionRepository.remove(permission);
    return { message: `Permission ${permission.name} deleted` };
  }
}
