import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  MAIL_QUEUE,
  SEND_WELCOME_EMAIL_JOB,
  SEND_RESET_PASSWORD_JOB,
  SEND_PASSWORD_CHANGED_JOB,
  SEND_SELECTION_INVITE_JOB,
} from './mail.constants';
import {
  WelcomeEmailJobDto,
  ResetPasswordEmailJobDto,
  PasswordChangedEmailJobDto,
  SelectionInviteEmailJobDto,
} from './dto/mail-job.dto';

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5000 },
};

@Injectable()
export class MailService {
  constructor(
    @InjectQueue(MAIL_QUEUE)
    private readonly mailQueue: Queue,
  ) {}

  async sendWelcomeEmail(data: WelcomeEmailJobDto): Promise<void> {
    await this.mailQueue.add(SEND_WELCOME_EMAIL_JOB, data, DEFAULT_JOB_OPTIONS);
  }

  async sendResetPasswordEmail(data: ResetPasswordEmailJobDto): Promise<void> {
    await this.mailQueue.add(
      SEND_RESET_PASSWORD_JOB,
      data,
      DEFAULT_JOB_OPTIONS,
    );
  }

  async sendPasswordChangedEmail(
    data: PasswordChangedEmailJobDto,
  ): Promise<void> {
    await this.mailQueue.add(
      SEND_PASSWORD_CHANGED_JOB,
      data,
      DEFAULT_JOB_OPTIONS,
    );
  }

  async sendSelectionInviteEmail(
    data: SelectionInviteEmailJobDto,
  ): Promise<void> {
    await this.mailQueue.add(
      SEND_SELECTION_INVITE_JOB,
      data,
      DEFAULT_JOB_OPTIONS,
    );
  }
}
