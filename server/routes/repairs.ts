import { Router, Request, Response } from 'express';
import { db } from '../../db/client.js';
import {
  repairs,
  diagnosticData,
  diagnosticSteps,
  safetyWarnings,
  diagnosticReferences,
  searchSources,
} from '../../db/schema.js';
import { eq, desc, ne } from 'drizzle-orm';

const router = Router();

// ─── Helper: Assemble full repair with nested diagnostic data ───
async function assembleRepair(repair: any) {
  // Fetch diagnostic data for this repair
  const [diagData] = await db
    .select()
    .from(diagnosticData)
    .where(eq(diagnosticData.repairId, repair.id))
    .limit(1);

  let diagnostic_data = null;
  if (diagData) {
    const steps = await db
      .select()
      .from(diagnosticSteps)
      .where(eq(diagnosticSteps.diagnosticDataId, diagData.id))
      .orderBy(diagnosticSteps.stepOrder);

    const [warning] = await db
      .select()
      .from(safetyWarnings)
      .where(eq(safetyWarnings.diagnosticDataId, diagData.id))
      .limit(1);

    const refs = await db
      .select()
      .from(diagnosticReferences)
      .where(eq(diagnosticReferences.diagnosticDataId, diagData.id));

    const sources = await db
      .select()
      .from(searchSources)
      .where(eq(searchSources.diagnosticDataId, diagData.id));

    diagnostic_data = {
      equipmentName: diagData.equipmentName,
      observation: diagData.observation,
      hypothesis: diagData.hypothesis,
      verification: diagData.verification,
      prescription: diagData.prescription,
      confidenceScore: diagData.confidenceScore,
      steps: steps.map((s) => ({
        id: s.stepOrder,
        title: s.title,
        time: s.timeEstimate,
        tools: s.tools,
        requiresAR: s.requiresAr,
      })),
      safetyWarning: warning
        ? { title: warning.title, description: warning.description }
        : undefined,
      references: refs.length > 0
        ? refs.map((r) => ({
            type: r.refType,
            title: r.title,
            details: r.details,
            uri: r.uri || undefined,
          }))
        : undefined,
      searchSources: sources.length > 0
        ? sources.map((s) => ({ title: s.title, uri: s.uri }))
        : undefined,
    };
  }

  return {
    id: repair.id,
    user_id: repair.userId,
    title: repair.title,
    equipment: repair.equipment,
    status: repair.status,
    current_step: repair.currentStep,
    technician_name: repair.technicianName,
    created_at: repair.createdAt.toISOString(),
    diagnostic_data,
  };
}

// ─── GET /api/repairs ───
router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(repairs)
      .orderBy(desc(repairs.createdAt));

    const result = await Promise.all(rows.map(assembleRepair));
    res.json(result);
  } catch (error) {
    console.error('[API] GET /repairs error:', error);
    res.status(500).json({ error: 'Failed to fetch repairs' });
  }
});

// ─── GET /api/repairs/active ───
router.get('/active', async (_req: Request, res: Response) => {
  try {
    const [row] = await db
      .select()
      .from(repairs)
      .where(ne(repairs.status, 'COMPLETED'))
      .orderBy(desc(repairs.createdAt))
      .limit(1);

    if (!row) {
      res.json(null);
      return;
    }

    const result = await assembleRepair(row);
    res.json(result);
  } catch (error) {
    console.error('[API] GET /repairs/active error:', error);
    res.status(500).json({ error: 'Failed to fetch active repair' });
  }
});

// ─── GET /api/repairs/recent ───
router.get('/recent', async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(repairs)
      .orderBy(desc(repairs.createdAt))
      .limit(5);

    const result = await Promise.all(rows.map(assembleRepair));
    res.json(result);
  } catch (error) {
    console.error('[API] GET /repairs/recent error:', error);
    res.status(500).json({ error: 'Failed to fetch recent repairs' });
  }
});

// ─── GET /api/repairs/:id ───
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid repair ID' });
      return;
    }

    const [row] = await db
      .select()
      .from(repairs)
      .where(eq(repairs.id, id))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: 'Repair not found' });
      return;
    }

    const result = await assembleRepair(row);
    res.json(result);
  } catch (error) {
    console.error('[API] GET /repairs/:id error:', error);
    res.status(500).json({ error: 'Failed to fetch repair' });
  }
});

// ─── POST /api/repairs ───
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    // 1. Insert the repair record
    const [newRepair] = await db
      .insert(repairs)
      .values({
        userId: body.user_id || 'local-user',
        title: body.title,
        equipment: body.equipment,
        status: body.status || 'ACTIVE',
        currentStep: body.current_step || 0,
        technicianName: body.technician_name || 'Field Technician',
      })
      .returning();

    // 2. Insert diagnostic data if provided
    if (body.diagnostic_data) {
      const dd = body.diagnostic_data;

      const [newDiag] = await db
        .insert(diagnosticData)
        .values({
          repairId: newRepair.id,
          equipmentName: dd.equipmentName || null,
          observation: dd.observation,
          hypothesis: dd.hypothesis,
          verification: dd.verification,
          prescription: dd.prescription,
          confidenceScore: dd.confidenceScore || 0,
        })
        .returning();

      // Insert steps
      if (dd.steps && dd.steps.length > 0) {
        await db.insert(diagnosticSteps).values(
          dd.steps.map((step: any, idx: number) => ({
            diagnosticDataId: newDiag.id,
            stepOrder: step.id || idx + 1,
            title: step.title,
            timeEstimate: step.time,
            tools: step.tools,
            requiresAr: step.requiresAR ?? false,
          }))
        );
      }

      // Insert safety warning
      if (dd.safetyWarning) {
        await db.insert(safetyWarnings).values({
          diagnosticDataId: newDiag.id,
          title: dd.safetyWarning.title,
          description: dd.safetyWarning.description,
        });
      }

      // Insert references
      if (dd.references && dd.references.length > 0) {
        await db.insert(diagnosticReferences).values(
          dd.references.map((ref: any) => ({
            diagnosticDataId: newDiag.id,
            refType: ref.type,
            title: ref.title,
            details: ref.details,
            uri: ref.uri || null,
          }))
        );
      }

      // Insert search sources
      if (dd.searchSources && dd.searchSources.length > 0) {
        await db.insert(searchSources).values(
          dd.searchSources.map((s: any) => ({
            diagnosticDataId: newDiag.id,
            title: s.title,
            uri: s.uri,
          }))
        );
      }
    }

    // 3. Return the full assembled repair
    const result = await assembleRepair(newRepair);
    res.status(201).json(result);
  } catch (error) {
    console.error('[API] POST /repairs error:', error);
    res.status(500).json({ error: 'Failed to create repair' });
  }
});

// ─── PATCH /api/repairs/:id/status ───
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid repair ID' });
      return;
    }

    const { status, current_step } = req.body;

    const updateValues: any = { status };
    if (current_step !== undefined) {
      updateValues.currentStep = current_step;
    }

    await db.update(repairs).set(updateValues).where(eq(repairs.id, id));

    res.json({ success: true });
  } catch (error) {
    console.error('[API] PATCH /repairs/:id/status error:', error);
    res.status(500).json({ error: 'Failed to update repair status' });
  }
});

// ─── DELETE /api/repairs/:id ───
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid repair ID' });
      return;
    }

    await db.delete(repairs).where(eq(repairs.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error('[API] DELETE /repairs/:id error:', error);
    res.status(500).json({ error: 'Failed to delete repair' });
  }
});

export default router;
