import { Module } from '@nestjs/common';
import { createClient } from 'redis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: async () => {
        const client = createClient({
          url: process.env.REDIS_URL || 'redis://localhost:6379',
        });
        await client.connect();
        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
