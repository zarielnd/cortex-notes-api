import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import {
  RedisKeys,
  RedisTtl,
} from 'src/infrastructure/redis/redis-key.constant';
import { RedisService } from 'src/infrastructure/redis/redis.service';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../../../entities/user.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  jti: string;
  type: 'access' | 'refresh';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret') ?? '',
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }
    const cacheKey = RedisKeys.user(payload.sub);
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      const user = JSON.parse(cached) as User;

      if (
        user.status === UserStatus.LOCKED ||
        user.status === UserStatus.DISABLED
      ) {
        throw new UnauthorizedException('Account is locked or disabled');
      }

      return user;
    }
    // Cache miss
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      relations: { roles: { permissions: true } },
    });

    if (!user) throw new UnauthorizedException('User not found');
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is disabled or locked');
    }
    const { password: _pw, ...safeUser } = user as User & {
      password?: string;
    };
    await this.redisService.set(
      cacheKey,
      JSON.stringify(safeUser),
      RedisTtl.USER,
    );

    return user;
  }
}
