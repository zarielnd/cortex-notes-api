import { Module } from '@nestjs/common';
import { Queue } from 'bullmq';

export const EMAIL_QUEUE = 'EMAIL_QUEUE';

@Module({
  providers: [
    {
      provide: 'EMAIL_QUEUE',
      useFactory: () => {
        return new Queue('email', {
          connection: {
            host: 'localhost',
            port: 6379,
          },
        });
      },
    },
  ],
  exports: [EMAIL_QUEUE],
})
export class QueueModule {}
