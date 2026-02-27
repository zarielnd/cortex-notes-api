import {
  BadRequestException,
  Body,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { v4 as uuidv4 } from 'uuid';
import { JwtService } from '@nestjs/jwt';
import { DataSource, LessThan, Repository } from 'typeorm';
import { User, UserStatus } from '../../entities/user.entity';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { RefreshToken } from '../../entities/refresh-token.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';
import { AuthTokens } from './interfaces/auth-tokens.interface';
import { ms } from 'src/common/utils/ms.util';
import { JwtPayload } from './strategies/jwt.strategy';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { StringValue } from 'ms';
import { ResetPasswordDto } from './dto/reset-password.dto';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 30;
const RESET_PASSWORD_EXPIRES_MINUTES = 30;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
      withDeleted: true,
    });

    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const user = this.userRepository.create({
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      password: dto.password,
    });

    await this.userRepository.save(user);

    await this.mailService.sendWelcomeEmail({
      to: user.email,
      firstName: user.firstName,
      tempPassword: dto.password,
    });

    return {
      message: 'Account created successfully. Please check your email.',
    };
  }

  async login(
    dto: LoginDto,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthTokens> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
      select: [
        'id',
        'email',
        'password',
        'status',
        'failedLoginAttempts',
        'lockedUntil',
        'firstName',
        'lastName',
      ],
    relations:{roles:{permissions: true}}
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.status === UserStatus.LOCKED) {
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        throw new ForbiddenException(
          `Account locked until ${user.lockedUntil.toISOString()}`,
        );
      }

      user.status = UserStatus.ACTIVE;
      user.failedLoginAttempts = 0;
      user.lockedUntil = null as unknown as Date;
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new ForbiddenException(
        'Account is inactive. Please contact support.',
      );
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.status = UserStatus.LOCKED;
        user.lockedUntil = new Date(
          Date.now() + LOCK_DURATION_MINUTES * 60 * 1000,
        );
      }
      await this.userRepository.save(user);
      throw new UnauthorizedException('Invalid credentials');
    }
    user.failedLoginAttempts = 0;
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    return this.generateTokens(user, userAgent, ipAddress);
  }

  async refreshToken(
    token: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthTokens> {
    let payload: JwtPayload;

    try {
      payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const storedToken = await this.findByJti(payload.jti);

    if (!storedToken || storedToken.isRevoked) {
      // Possible token reuse — revoke all tokens for this user
      await this.revokeAllForUser(payload.sub);
      throw new UnauthorizedException(
        'Refresh token reuse detected. All sessions revoked.',
      );
    }

    const isValid = await bcrypt.compare(token, storedToken.tokenHash);
    if (!isValid) {
      await this.revokeAllForUser(payload.sub);
      throw new UnauthorizedException('Token tampering detected');
    }

    // Rotate: revoke old token
    await this.revokeByJti(payload.jti);

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return this.generateTokens(user, userAgent, ipAddress);
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    // Always return the same message to prevent email enumeration
    if (!user) {
      return {
        message: 'If that email exists, a reset link has been sent.',
      };
    }

    const resetToken = uuidv4();
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(
      Date.now() + RESET_PASSWORD_EXPIRES_MINUTES * 60 * 1000,
    );

    await this.userRepository.save(user);

    const resetLink = `${this.configService.get<string>('app.url')}/auth/reset-password?token=${resetToken}`;

    await this.mailService.sendResetPasswordEmail({
      to: user.email,
      firstName: user.firstName,
      resetLink,
      expiresInMinutes: RESET_PASSWORD_EXPIRES_MINUTES,
    });

    return { message: 'If that email exists, a reset link has been sent.' };
  }
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const hashedToken = crypto
      .createHash('sha256')
      .update(dto.token)
      .digest('hex');

    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.resetPasswordToken')
      .addSelect('user.resetPasswordExpires')
      .addSelect('user.password')
      .where('user.resetPasswordToken = :token', { token: hashedToken })
      .getOne();

    if (
      !user ||
      !user.resetPasswordExpires ||
      user.resetPasswordExpires < new Date()
    ) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    await this.dataSource.transaction(async (manager) => {
      user.password = dto.newPassword;
      user.resetPasswordToken = null as unknown as string;
      user.resetPasswordExpires = null as unknown as Date;
      await manager.save(User, user);

      await this.revokeAllForUser(user.id);
    });

    await this.mailService.sendPasswordChangedEmail({
      to: user.email,
      firstName: user.firstName,
    });

    return { message: 'Password reset successfully. Please login.' };
  }
  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      await this.revokeByJti(payload.jti);
    } catch {
      // If token invalid, we don't care.
      // Just treat it as already logged out.
    }
  }
  async logoutAll(userId: string): Promise<{ message: string }> {
    await this.revokeAllForUser(userId);
    return { message: 'All sessions revoked' };
  }

  private async generateTokens(
    user: User,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthTokens> {
    const accessJti = uuidv4();
    const refreshJti = uuidv4();

    const accessExpiresIn =
      this.configService.get<string>('jwt.accessExpiresIn') ?? '15m';
    const refreshExpiresIn =
      this.configService.get<string>('jwt.refreshExpiresIn') ?? '7d';

    const accessTokenExpiresAt = new Date(Date.now() + ms(accessExpiresIn));
    const refreshTokenExpiresAt = new Date(Date.now() + ms(refreshExpiresIn));

    const accessPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      jti: accessJti,
      type: 'access',
    };

    const refreshPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      jti: refreshJti,
      type: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.configService.get<string>('jwt.accessSecret'),
        expiresIn: this.configService.get<string>(
          'jwt.accessExpiresIn',
        ) as StringValue,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>(
          'jwt.refreshExpiresIn',
        ) as StringValue,
      }),
    ]);

    await this.storeRefreshToken({
      userId: user.id,
      token: refreshToken,
      jti: refreshJti,
      expiresAt: refreshTokenExpiresAt,
      userAgent,
      ipAddress,
    });

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
    };
  }
  async deleteAccount(
    userId: string,
    password: string,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'password', 'email', 'firstName'],
    });

    if (!user) throw new NotFoundException('User not found');

    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Incorrect password');
    }

    await this.dataSource.transaction(async (manager) => {
      await this.revokeAllForUser(userId);
      await manager.softDelete(User, userId);
    });

    return { message: 'Account deleted successfully' };
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
