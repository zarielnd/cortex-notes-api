import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import {
  PasswordChangedEmailJobDto,
  ResetPasswordEmailJobDto,
  WelcomeEmailJobDto,
} from './dto/mail-job.dto';
import {
  MAIL_QUEUE,
  SEND_PASSWORD_CHANGED_JOB,
  SEND_RESET_PASSWORD_JOB,
  SEND_WELCOME_EMAIL_JOB,
} from './mail.constants';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

type MailJobData =
  | WelcomeEmailJobDto
  | ResetPasswordEmailJobDto
  | PasswordChangedEmailJobDto;

@Processor(MAIL_QUEUE)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);
  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    console.log('Job failed:', err.message);
  }
  constructor(private readonly mailService: MailerService) {
    super();
  }

  async process(job: Job<MailJobData, void, string>): Promise<void> {
    this.logger.debug(
      `Processing job ${job.name} with data: ${JSON.stringify(job.data)}`,
    );
    switch (job.name) {
      case SEND_WELCOME_EMAIL_JOB:
        await this.handleWelcomeEmail(job.data as WelcomeEmailJobDto);
        break;
      case SEND_RESET_PASSWORD_JOB:
        await this.handleResetPasswordEmail(
          job.data as ResetPasswordEmailJobDto,
        );
        break;
      case SEND_PASSWORD_CHANGED_JOB:
        await this.handlePasswordChangedEmail(
          job.data as PasswordChangedEmailJobDto,
        );
        break;

      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
    }
  }
  private async handleWelcomeEmail(data: WelcomeEmailJobDto): Promise<void> {
    await this.mailService.sendMail({
      to: data.to,
      subject: 'Welcome to Our Service!',
      template: 'welcome-email',
      context: {
        firstName: data.firstName,
        temporaryPassword: data.tempPassword,
        loginUrl: process.env.APP_URL + '/auth/login',
      },
    });
  }

  private async handleResetPasswordEmail(
    data: ResetPasswordEmailJobDto,
  ): Promise<void> {
    await this.mailService.sendMail({
      to: data.to,
      subject: 'Password Reset Request',
      template: 'reset-password-email',
      context: {
        firstName: data.firstName,
        resetLink: data.resetLink,
        expiresInMinutes: data.expiresInMinutes,
      },
    });
  }

  private async handlePasswordChangedEmail(
    data: PasswordChangedEmailJobDto,
  ): Promise<void> {
    await this.mailService.sendMail({
      to: data.to,
      subject: 'Password Changed',
      template: 'password-changed-email',
      context: {
        firstName: data.firstName,
      },
    });
  }
}
