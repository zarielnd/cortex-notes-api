import { log } from 'console';
import { Worker } from 'bullmq';

new Worker(
  'email',
  async (job) => {
    if (job.name === 'send-reset') {
      log(
        'Sending password reset email to',
        job.data.email,
        'with token',
        job.data.token,
      );
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: 6379,
    },
  },
);
