import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../db/client.js';
import { manuals } from '../db/schema.js';
import { desc } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Restore original req.url from Vercel rewrite
  const p0 = req.query.p0 as string;
  if (p0) {
    try {
      const urlObj = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
      urlObj.pathname = `/api/manuals/${p0}`;
      urlObj.searchParams.delete('p0');
      req.url = urlObj.pathname + urlObj.search;
    } catch (e) {
      console.error('[Vercel Manuals] URL parsing error:', e);
    }
  }

  try {
    if (req.method === 'GET') {
      const rows = await db.select().from(manuals).orderBy(desc(manuals.createdAt));
      const result = rows.map((row) => ({
        id: row.id,
        user_id: row.userId,
        title: row.title,
        category: row.category,
        description: row.description,
        image_url: row.imageUrl,
        file_url: row.fileUrl,
        created_at: row.createdAt.toISOString(),
      }));
      return res.json(result);
    }

    if (req.method === 'POST') {
      const body = req.body;
      const [newManual] = await db.insert(manuals).values({
        userId: body.user_id || null,
        title: body.title,
        category: body.category,
        description: body.description || null,
        imageUrl: body.image_url || null,
        fileUrl: body.file_url || null,
      }).returning();

      return res.status(201).json({
        id: newManual.id,
        user_id: newManual.userId,
        title: newManual.title,
        category: newManual.category,
        description: newManual.description,
        image_url: newManual.imageUrl,
        file_url: newManual.fileUrl,
        created_at: newManual.createdAt.toISOString(),
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[Vercel] manuals handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
