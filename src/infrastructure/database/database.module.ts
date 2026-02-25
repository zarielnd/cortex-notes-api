import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.name'),
        options: {
          encrypt: configService.get<boolean>('database.encrypt'),
          trustServerCertificate: true,
        },
        autoLoadEntities: true,
        migrations: [__dirname + '/../migrations/*{.ts,.js}'],
        synchronize: false,
        logging: configService.get<string>('app.nodeEnv') === 'development',
        extra: {
          pool: {
            max: 10,
            min: 2,
            idleTimeoutMillis: 30000,
            acquireTimeoutMillis: 30000,
          },
        },
      }),
    }),
  ],
})
export class DatabaseModule {}
