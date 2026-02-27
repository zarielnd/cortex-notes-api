import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface UploadedFile {
  s3Key: string;
  s3Url: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}
export interface PresignedDownloadUrl {
  url: string;
  expiresIn: number;
}

export interface PresignedUploadUrl {
  url: string;
  s3Key: string;
  expiresIn: number;
}

@Injectable()
export class StorageService {
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get<string>('aws.region') ?? 'ap-southeast-1',
      credentials: {
        accessKeyId: this.configService.get<string>('aws.accessKeyId') ?? '',
        secretAccessKey:
          this.configService.get<string>('aws.secretAccessKey') ?? '',
      },
    });
    this.bucket = this.configService.get<string>('aws.s3Bucket') ?? '';
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'attachments',
  ): Promise<UploadedFile> {
    const ext = path.extname(file.originalname);
    const s3Key = `${folder}/${uuidv4()}${ext}`;

    const params: PutObjectCommandInput = {
      Bucket: this.bucket,
      Key: s3Key,
      Body: file.stream,
      ContentType: file.mimetype,
      ContentDisposition: `inline; filename="${file.originalname}"`,
      ServerSideEncryption: 'AES256',
    };

    try {
      await this.s3Client.send(new PutObjectCommand(params));
    } catch (error) {
      this.logger.error('Failed to upload file to S3', error);
      throw new InternalServerErrorException('File upload failed');
    }

    const s3Url = `https://${this.bucket}.s3.${this.configService.get<string>('aws.region')}.amazonaws.com/${s3Key}`;

    return {
      s3Key,
      s3Url,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    };
  }

  async deleteFile(s3Key: string): Promise<void> {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: s3Key }),
      );
    } catch (error) {
      this.logger.error(`Failed to delete S3 object: ${s3Key}`, error);
      throw new InternalServerErrorException('File deletion failed');
    }
  }
  /**
   * @deprecated Use getUploadUrl() instead.
   */
  async getPresignedUrl(
    s3Key: string,
    expiresInSeconds: number = 3600,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
    });

    return getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSeconds,
    });
  }
  //
  async getPresignedDownloadUrl(
    s3Key: string,
    expiresIn: number = 3600,
  ): Promise<PresignedDownloadUrl> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
      // Forces browser to download rather than preview in-tab
      ResponseContentDisposition: 'attachment',
    });

    try {
      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      return { url, expiresIn };
    } catch (error) {
      this.logger.error(
        `Failed to generate download presigned URL for key: ${s3Key}`,
        error,
      );
      throw new InternalServerErrorException('Could not generate download URL');
    }
  }
  async getPresignedUploadUrl(
    folder: string,
    originalName: string,
    mimeType: string,
    expiresIn: number = 300, // shorter TTL for uploads — 5 min default
  ): Promise<PresignedUploadUrl> {
    const ext = path.extname(originalName);
    const s3Key = `${folder}/${uuidv4()}${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
      ContentType: mimeType,
      ServerSideEncryption: 'AES256',
    });

    try {
      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      return { url, s3Key, expiresIn };
    } catch (error) {
      this.logger.error('Failed to generate upload presigned URL', error);
      throw new InternalServerErrorException('Could not generate upload URL');
    }
  }
}
