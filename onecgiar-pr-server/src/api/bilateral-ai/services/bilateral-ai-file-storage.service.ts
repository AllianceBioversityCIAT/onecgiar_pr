import { BadRequestException, Injectable } from '@nestjs/common';
import * as AWS from 'aws-sdk';
import { env } from 'node:process';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';

export interface StoredAiFile {
  key: string;
  name: string;
  mimeType: string;
  size: number;
}

/** What `getObjectStream` hands the caller: the object's bytes, never buffered, plus its
 * declared size (from `HeadObject`) so the caller can build the `Content-Range` Graph needs
 * without reading the stream first. */
export interface StoredAiObjectStream {
  stream: Readable;
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

  /**
   * `HEAD`s a stored S3 key — the retry endpoint's per-key existence check before it reuses stored
   * sources (`APF-R-5`, `design.md` §5 "Retry endpoint"). `true` when the object exists; `false`
   * only on a genuine not-found, which the caller turns into `410 SOURCES_GONE`. Any other AWS
   * error (permissions, network, throttling) is rethrown — treating an unrelated failure as
   * "missing" would wrongly tell the user to re-upload.
   */
  async keyExists(key: string): Promise<boolean> {
    if (!this.bucket)
      throw new BadRequestException('Bilateral AI storage is not configured.');
    try {
      await this.s3.headObject({ Bucket: this.bucket, Key: key }).promise();
      return true;
    } catch (error: any) {
      if (error?.statusCode === 404 || error?.code === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Returns a readable stream over a stored object plus its size, for `ADE-T-3`'s
   * server-side SharePoint transfer (`promoteDraft` → `SharePointService.uploadFromStream`).
   *
   * `HeadObject` first, so the caller (which needs the exact byte count up front for Graph's
   * `Content-Range: bytes 0-{size-1}/{size}`) never has to buffer the object to measure it.
   * `GetObject().createReadStream()` then hands back the SDK's own stream unread — nothing here
   * pulls the bytes into memory, honoring the same no-buffering rule `uploadFiles` already
   * respects for the write side.
   */
  async getObjectStream(key: string): Promise<StoredAiObjectStream> {
    if (!this.bucket)
      throw new BadRequestException('Bilateral AI storage is not configured.');
    const head = await this.s3
      .headObject({ Bucket: this.bucket, Key: key })
      .promise();
    const stream = this.s3
      .getObject({ Bucket: this.bucket, Key: key })
      .createReadStream();
    return { stream, size: head.ContentLength ?? 0 };
  }
}
