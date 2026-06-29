import { Router, Request, Response } from 'express';
import { db } from '../../db/client.js';
import { manuals } from '../../db/schema.js';
import { desc } from 'drizzle-orm';

const router = Router();

// ─── GET /api/manuals ───
router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(manuals)
      .orderBy(desc(manuals.createdAt));

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

    res.json(result);
  } catch (error) {
    console.error('[API] GET /manuals error:', error);
    res.status(500).json({ error: 'Failed to fetch manuals' });
  }
});

// ─── POST /api/manuals ───
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    const [newManual] = await db
      .insert(manuals)
      .values({
        userId: body.user_id || null,
        title: body.title,
        category: body.category,
        description: body.description || null,
        imageUrl: body.image_url || null,
        fileUrl: body.file_url || null,
      })
      .returning();

    res.status(201).json({
      id: newManual.id,
      user_id: newManual.userId,
      title: newManual.title,
      category: newManual.category,
      description: newManual.description,
      image_url: newManual.imageUrl,
      file_url: newManual.fileUrl,
      created_at: newManual.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('[API] POST /manuals error:', error);
    res.status(500).json({ error: 'Failed to create manual' });
  }
});

export default router;
