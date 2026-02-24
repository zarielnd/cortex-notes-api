import { ConflictException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { DataSource, EntityManager, Repository } from 'typeorm';
4;
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private getRepository(manager?: EntityManager) {
    return manager ? manager.getRepository(User) : this.userRepository;
  }

  async create(dto: CreateUserDto, manager?: EntityManager): Promise<User> {
    const repo = this.getRepository(manager);

    const existing = await repo.findOne({
      where: { email: dto.email, isDeleted: false },
    });
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = repo.create({
      email: dto.email,
      passwordHash: hashedPassword,
      tokenVersion: 0,
    });

    return await repo.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { email, isDeleted: false },
    });
  }

  async findById(id: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { id, isDeleted: false },
    });
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
  async findAll() {
    return await this.userRepository.find({ where: { isDeleted: false } });
  }
  async softDelete(userId: string): Promise<void> {
    await this.userRepository.update(
      { id: userId },
      {
        isDeleted: true,
        isActive: false,
        tokenVersion: () => 'tokenVersion + 1',
      },
    );
  }

  async incrementTokenVersion(userId: string) {
    await this.userRepository.increment({ id: userId }, 'tokenVersion', 1);
  }
}
