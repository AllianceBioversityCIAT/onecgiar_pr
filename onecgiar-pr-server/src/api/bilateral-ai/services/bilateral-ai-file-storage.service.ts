import { BadRequestException, Injectable } from '@nestjs/common';
import * as AWS from 'aws-sdk';
import { env } from 'node:process';
import { randomUUID } from 'node:crypto';

export interface StoredAiFile {
  key: string;
  name: string;
  mimeType: string;
  size: number;
}

@Injectable()
export class BilateralAiFileStorageService {
  private readonly s3 = new AWS.S3();
  private readonly bucket = env.BILATERAL_AI_BUCKET_NAME?.trim();
  private readonly prefix =
    env.BILATERAL_AI_PREFIX?.trim() || 'prms/bilateral-ai';
  private readonly maxFileSize = 25_000_000;
  private readonly maxSources = 6;

  validateSources(
    documentFiles: any[],
    audioFiles: any[],
    text?: string,
  ): void {
    const files = [...documentFiles, ...audioFiles];
    const sourceCount = files.length + (text?.trim() ? 1 : 0);
    if (sourceCount === 0) {
      throw new BadRequestException(
        'At least one document, audio file, or text source is required.',
      );
    }
    if (sourceCount > this.maxSources) {
      throw new BadRequestException(
        `A maximum of ${this.maxSources} sources is allowed.`,
      );
    }
    if (!this.bucket) {
      throw new BadRequestException('Bilateral AI storage is not configured.');
    }
    for (const file of files) {
      if (!file?.buffer || file.size > this.maxFileSize) {
        throw new BadRequestException(
          'Each AI source must be no larger than 25 MB.',
        );
      }
      const extension = file.originalname?.split('.').pop()?.toLowerCase();
      const isAudio = audioFiles.includes(file);
      const allowed = isAudio
        ? ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'webm']
        : ['pdf', 'docx', 'txt', 'xls', 'xlsx', 'pptx'];
      if (!extension || !allowed.includes(extension)) {
        throw new BadRequestException(
          `Unsupported AI source type: ${file.originalname}.`,
        );
      }
    }
    if (text && text.length > 50_000) {
      throw new BadRequestException(
        'AI text context cannot exceed 50,000 characters.',
      );
    }
  }

  async uploadFiles(jobId: string, files: any[]): Promise<StoredAiFile[]> {
    if (!this.bucket)
      throw new BadRequestException('Bilateral AI storage is not configured.');
    return Promise.all(
      files.map(async (file) => {
        const safeName = String(file.originalname || 'source').replace(
          /[^a-zA-Z0-9._-]/g,
          '_',
        );
        const key = `${this.prefix}/${jobId}/${randomUUID()}-${safeName}`;
        await this.s3
          .putObject({
            Bucket: this.bucket,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
          })
          .promise();
        return {
          key,
          name: safeName,
          mimeType: file.mimetype,
          size: file.size,
        };
      }),
    );
  }

  getBucketName(): string {
    if (!this.bucket)
      throw new BadRequestException('Bilateral AI storage is not configured.');
    return this.bucket;
  }

  getSignedUrl(key: string, expiresIn = 3600): string {
    if (!this.bucket)
      throw new BadRequestException('Bilateral AI storage is not configured.');
    return this.s3.getSignedUrl('getObject', {
      Bucket: this.bucket,
      Key: key,
      Expires: expiresIn,
    });
  }
}
