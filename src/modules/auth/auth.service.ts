import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { DataSource, LessThan, Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import * as bcrypt from 'bcrypt';
import { RefreshToken } from '../../entities/refresh-token.entity';
import { use } from 'passport';
import { InjectRepository } from '@nestjs/typeorm';
import { REDIS_CLIENT } from 'src/infrastructure/redis/redis.module';
import { RedisClientType } from 'redis';
import { Queue } from 'bullmq/dist/esm/classes/queue';
import { EMAIL_QUEUE } from 'src/infrastructure/queue/queue.module';

@Injectable()
export class AuthService {
  constructor(
    private userService: UsersService,
    private jwtService: JwtService,
    private dataSource: DataSource,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    @Inject(REDIS_CLIENT)
    private readonly cache: RedisClientType,
    @Inject(EMAIL_QUEUE)
    private readonly emailQueue: Queue,
  ) {}

  async register(dto: RegisterDto) {
    return this.dataSource.transaction(async (manager) => {
      const user = await this.userService.create(dto, manager);
      return this.generateToken(user);
    });
  }

  async login(user: User) {
    return this.generateToken(user);
  }

  async refreshTokens(oldToken: string) {
    const payload = await this.jwtService.verifyAsync(oldToken, {
      secret: process.env.JWT_REFRESH_SECRET,
    });
    const stored = await this.refreshTokenRepository.findOne({
      where: { userId: payload.sub, isRevoked: false },
    });
    if (!stored) {
      throw new UnauthorizedException();
    }

    const isMatch = await bcrypt.compare(oldToken, stored.tokenHash);
    if (!isMatch) {
      throw new UnauthorizedException();
    }

    stored.isRevoked = true;

    await this.refreshTokenRepository.save(stored);

    const user = await this.userService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.generateToken(user);
  }
  async forgotPassword(email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      return; // Don't reveal user existence
    }

    const token = crypto.randomUUID();

    await this.cache.set(`reset:${token}`, user.id, {
      EX: 60 * 10, // 10 mins
    });

    await this.emailQueue.add('send-reset', {
      email,
      token,
    });
  }

  async logout(userId: string) {
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true },
    );
  }

  private async generateToken(user: User) {
    const payload = { email: user.email, sub: user.id };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: '15m',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });

    const hash = await bcrypt.hash(refreshToken, 10);

    await this.dataSource.getRepository(RefreshToken).save({
      userId: user.id,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    return { accessToken, refreshToken };
  }
  async storeRefreshToken(params: {
    userId: string;
    token: string;
    jti: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<RefreshToken> {
    const tokenHash = await this.hashToken(params.token);
    const entity = this.refreshTokenRepository.create({
      userId: params.userId,
      tokenHash,
      jti: params.jti,
      expiresAt: params.expiresAt,
      userAgent: params.userAgent,
      ipAddress: params.ipAddress,
    });
    return await this.refreshTokenRepository.save(entity);
  }

  async findByJti(jti: string): Promise<RefreshToken | null> {
    return await this.refreshTokenRepository.findOne({
      where: { jti, isRevoked: false },
    });
  }

  async revokeByJti(jti: string): Promise<void> {
    await this.refreshTokenRepository.update({ jti }, { isRevoked: true });
  }
  async revokeAllForUser(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true },
    );
  }
  async cleanupExpired(): Promise<void> {
    await this.refreshTokenRepository.delete({
      expiresAt: LessThan(new Date()),
    });
  }
  async hashToken(token: string): Promise<string> {
    return await bcrypt.hash(token, 12);
  }
}
