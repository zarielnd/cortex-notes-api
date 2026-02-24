import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import {
  MAIL_QUEUE,
  SEND_PASSWORD_CHANGED_JOB,
  SEND_RESET_PASSWORD_JOB,
  SEND_WELCOME_EMAIL_JOB,
} from './mail.constants';
import { Queue } from 'bullmq';
import {
  PasswordChangedEmailJobDto,
  ResetPasswordEmailJobDto,
  WelcomeEmailJobDto,
} from './dto/mail-job.dto';

@Injectable()
export class MailService {
  constructor(@InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue) {}
  async sendWelcomeEmail(data: WelcomeEmailJobDto): Promise<void> {
    await this.mailQueue.add(SEND_WELCOME_EMAIL_JOB, data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });
  }
  async sendResetPasswordEmail(data: ResetPasswordEmailJobDto): Promise<void> {
    await this.mailQueue.add(SEND_RESET_PASSWORD_JOB, data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });
  }
  async sendPasswordChangedEmail(
    data: PasswordChangedEmailJobDto,
  ): Promise<void> {
    await this.mailQueue.add(SEND_PASSWORD_CHANGED_JOB, data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });
  }
}
