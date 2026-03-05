import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { StorageService } from '../storage/storage.service';
import { DELETE_S3_OBJECT_JOB, STORAGE_QUEUE } from './attachments.constants';

interface DeleteS3ObjectJobData {
  s3Key: string;
}

@Processor(STORAGE_QUEUE)
export class AttachmentsProcessor extends WorkerHost {
  private readonly logger = new Logger(AttachmentsProcessor.name);

  constructor(private readonly storageService: StorageService) {
    super();
  }

  async process(job: Job<DeleteS3ObjectJobData, void, string>): Promise<void> {
    switch (job.name) {
      case DELETE_S3_OBJECT_JOB:
        await this.handleDeleteS3Object(job.data);
        break;
      default:
        this.logger.warn(`Unknown storage job: ${job.name}`);
    }
  }

  private async handleDeleteS3Object(
    data: DeleteS3ObjectJobData,
  ): Promise<void> {
    this.logger.log(`Deleting S3 object: ${data.s3Key}`);
    await this.storageService.deleteFile(data.s3Key);
  }
}
