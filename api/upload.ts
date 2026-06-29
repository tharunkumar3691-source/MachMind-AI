import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPresignedUploadUrl, getPresignedDownloadUrl, generateS3Key } from '../services/s3.js';
import { db } from '../db/client.js';
import { mediaFiles } from '../db/schema.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // POST /api/upload — Get presigned upload URL
    if (req.method === 'POST') {
      const { fileType, contentType, originalFilename, repairId } = req.body;

      if (!fileType || !contentType || !originalFilename) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const key = generateS3Key(fileType, originalFilename, repairId);
      const { uploadUrl, publicUrl } = await getPresignedUploadUrl(key, contentType);

      const [record] = await db.insert(mediaFiles).values({
        repairId: repairId || null,
        fileType,
        s3Key: key,
        s3Url: publicUrl,
        originalFilename,
      }).returning();

      return res.json({ uploadUrl, key, publicUrl, fileId: record.id });
    }

    // GET /api/upload?key=... — Get presigned download URL
    if (req.method === 'GET') {
      const key = req.query.key as string;
      if (!key) return res.status(400).json({ error: 'Missing key parameter' });

      const downloadUrl = await getPresignedDownloadUrl(key);
      return res.json({ downloadUrl });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[Vercel] upload handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
