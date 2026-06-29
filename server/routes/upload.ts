import { Router, Request, Response } from 'express';
import {
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  generateS3Key,
} from '../../services/s3.js';
import { db } from '../../db/client.js';
import { mediaFiles } from '../../db/schema.js';

const router = Router();

// ─── POST /api/upload/presign ───
// Body: { fileType, contentType, originalFilename, repairId? }
router.post('/presign', async (req: Request, res: Response) => {
  try {
    const { fileType, contentType, originalFilename, repairId } = req.body;

    if (!fileType || !contentType || !originalFilename) {
      res.status(400).json({
        error: 'Missing required fields: fileType, contentType, originalFilename',
      });
      return;
    }

    const key = generateS3Key(fileType, originalFilename, repairId);
    const { uploadUrl, publicUrl } = await getPresignedUploadUrl(key, contentType);

    // Track the file in the database
    const [record] = await db
      .insert(mediaFiles)
      .values({
        repairId: repairId || null,
        fileType,
        s3Key: key,
        s3Url: publicUrl,
        originalFilename,
      })
      .returning();

    res.json({
      uploadUrl,
      key,
      publicUrl,
      fileId: record.id,
    });
  } catch (error) {
    console.error('[API] POST /upload/presign error:', error);
    res.status(500).json({ error: 'Failed to generate presigned URL' });
  }
});

// ─── GET /api/upload/url?key=... ───
// Get a presigned download URL for viewing a file
router.get('/url', async (req: Request, res: Response) => {
  try {
    const key = req.query.key as string;

    if (!key) {
      res.status(400).json({ error: 'Missing S3 key query parameter' });
      return;
    }

    const downloadUrl = await getPresignedDownloadUrl(key);
    res.json({ downloadUrl });
  } catch (error) {
    console.error('[API] GET /upload/url error:', error);
    res.status(500).json({ error: 'Failed to get download URL' });
  }
});

export default router;
