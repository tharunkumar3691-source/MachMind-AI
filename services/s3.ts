import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// S3 Client — initialized from environment variables
const s3Client = new S3Client({
  region: process.env.AWS_REGION || process.env.AWS_S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET = process.env.AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || '';

/**
 * Generate a presigned URL for uploading a file to S3.
 * The client can PUT directly to this URL.
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });
  const region = process.env.AWS_REGION || process.env.AWS_S3_REGION || 'us-east-1';
  const publicUrl = `https://${BUCKET}.s3.${region}.amazonaws.com/${key}`;

  return { uploadUrl, key, publicUrl };
}

/**
 * Generate a presigned URL for downloading/viewing a file from S3.
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Delete a file from S3.
 */
export async function deleteS3Object(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Generate a unique S3 key for a file upload.
 */
export function generateS3Key(
  fileType: string,
  originalFilename: string,
  repairId?: number
): string {
  const timestamp = Date.now();
  const sanitized = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const prefix = repairId ? `repairs/${repairId}` : 'uploads';
  return `${prefix}/${fileType}/${timestamp}_${sanitized}`;
}
