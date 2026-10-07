import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Readable } from 'node:stream';
import 'dotenv/config';

// Backblaze B2 through its S3-compatible API.
@Injectable()
export class StorageService {
  private client?: S3Client;

  // Created on first use so the app still boots without B2 credentials.
  private get s3(): S3Client {
    if (!this.client) {
      const keyId = process.env.B2_KEY_ID;
      const applicationKey = process.env.B2_APPLICATION_KEY;
      if (!keyId || !applicationKey || !process.env.B2_BUCKET) {
        throw new ServiceUnavailableException('File storage is not configured');
      }

      this.client = new S3Client({
        region: this.region,
        endpoint: this.endpoint,
        credentials: { accessKeyId: keyId, secretAccessKey: applicationKey },
        // The bucket name has capitals, which is not a valid host name.
        forcePathStyle: true,
        // B2 rejects the checksum headers the SDK adds by default.
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
      });
    }
    return this.client;
  }

  private get bucket(): string {
    return process.env.B2_BUCKET!;
  }

  private get region(): string {
    return process.env.B2_REGION ?? 'eu-central-003';
  }

  private get endpoint(): string {
    return (
      process.env.B2_ENDPOINT ?? `https://s3.${this.region}.backblazeb2.com`
    );
  }

  // Where the object lives. The bucket is private, so this is a reference,
  // not a playable link: the file is only served through read().
  objectUrl(key: string) {
    return `${this.endpoint}/${this.bucket}/${key}`;
  }

  // URL the browser PUTs the file to, sending the same Content-Type.
  getUploadUrl(key: string, contentType: string, expiresIn: number) {
    return getSignedUrl(
      this.s3,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn },
    );
  }

  // Opens the object for reading, optionally only a byte range of it (the
  // value of an HTTP Range header). Returns null when it does not exist or
  // the range is outside the file.
  async read(key: string, range?: string) {
    try {
      const object = await this.s3.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key, Range: range }),
      );
      return {
        body: object.Body as Readable,
        size: object.ContentLength,
        type: object.ContentType,
        // Only set when a range was served.
        range: object.ContentRange,
      };
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } })
        .$metadata?.httpStatusCode;
      if (status === 404 || status === 416) {
        return null;
      }
      throw error;
    }
  }

  // Returns null when the object does not exist.
  async head(key: string) {
    try {
      const object = await this.s3.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return { size: object.ContentLength ?? 0, type: object.ContentType };
    } catch (error) {
      if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata
        ?.httpStatusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async delete(key: string) {
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
