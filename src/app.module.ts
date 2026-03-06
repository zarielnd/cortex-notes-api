import { createKeyv } from '@keyv/redis';
import { BullModule } from '@nestjs/bullmq';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import appConfig from './config/app.config';
import awsConfig from './config/aws.config';
import { configValidationSchema } from './config/config.validation';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import mailConfig from './config/mail.config';
import redisConfig from './config/redis.config';
import { CaslModule } from './infrastructure/casl/casl.module';
import { DatabaseModule } from './infrastructure/database/database.module';
import { HealthModule } from './infrastructure/health/health.module';
import { LoggerModule } from './infrastructure/logger/logger.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { AuthModule } from './modules/auth/auth.module';
import { MailModule } from './modules/mail/mail.module';
import { NotesModule } from './modules/notes/notes.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { RolesModule } from './modules/roles/roles.module';
import { SelectionsModule } from './modules/selections/selections.module';
import { StorageModule } from './modules/storage/storage.module';
import { UsersModule } from './modules/users/users.module';
console.log(__dirname);
@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        redisConfig,
        jwtConfig,
        mailConfig,
        awsConfig,
      ],
      validationSchema: configValidationSchema,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        name: 'global',
        ttl: 6000,
        limit: 100,
      },
    ]),
    // Cache with Redis
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        stores: [
          createKeyv(
            `redis://${configService.get<string>('redis.password') ? `:${configService.get<string>('redis.password')}@` : ''}${configService.get<string>('redis.host')}:${configService.get<number>('redis.port')}`,
          ),
        ],
        ttl: configService.get<number>('redis.ttl'),
      }),
    }),

    // BullMQ
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password') || undefined,
        },
      }),
    }),

    // Feature modules
    DatabaseModule,
    MailModule,
    CaslModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    SelectionsModule,
    StorageModule,
    NotesModule,
    AttachmentsModule,
    RedisModule,
    HealthModule,
    LoggerModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
