import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../db/client.js';
import {
  repairs,
  diagnosticData,
  diagnosticSteps,
  safetyWarnings,
  diagnosticReferences,
  searchSources,
} from '../db/schema.js';
import { eq, desc, ne } from 'drizzle-orm';

// ─── Helper: Assemble full repair with nested diagnostic data ───
async function assembleRepair(repair: any) {
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
      safetyWarning: warning ? { title: warning.title, description: warning.description } : undefined,
      references: refs.length > 0 ? refs.map((r) => ({ type: r.refType, title: r.title, details: r.details, uri: r.uri || undefined })) : undefined,
      searchSources: sources.length > 0 ? sources.map((s) => ({ title: s.title, uri: s.uri })) : undefined,
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, url } = req;

  try {
    // ─── GET /api/repairs ───
    if (method === 'GET' && (url === '/api/repairs' || url === '/api/repairs/')) {
      const rows = await db.select().from(repairs).orderBy(desc(repairs.createdAt));
      const result = await Promise.all(rows.map(assembleRepair));
      return res.json(result);
    }

    // ─── GET /api/repairs/active ───
    if (method === 'GET' && url?.includes('/active')) {
      const [row] = await db.select().from(repairs).where(ne(repairs.status, 'COMPLETED')).orderBy(desc(repairs.createdAt)).limit(1);
      if (!row) return res.json(null);
      return res.json(await assembleRepair(row));
    }

    // ─── GET /api/repairs/recent ───
    if (method === 'GET' && url?.includes('/recent')) {
      const rows = await db.select().from(repairs).orderBy(desc(repairs.createdAt)).limit(5);
      return res.json(await Promise.all(rows.map(assembleRepair)));
    }

    // ─── GET /api/repairs/:id ───
    if (method === 'GET') {
      const idMatch = url?.match(/\/api\/repairs\/(\d+)/);
      if (idMatch) {
        const id = parseInt(idMatch[1], 10);
        const [row] = await db.select().from(repairs).where(eq(repairs.id, id)).limit(1);
        if (!row) return res.status(404).json({ error: 'Not found' });
        return res.json(await assembleRepair(row));
      }
    }

    // ─── POST /api/repairs ───
    if (method === 'POST') {
      const body = req.body;
      const [newRepair] = await db.insert(repairs).values({
        userId: body.user_id || 'local-user',
        title: body.title,
        equipment: body.equipment,
        status: body.status || 'ACTIVE',
        currentStep: body.current_step || 0,
        technicianName: body.technician_name || 'Field Technician',
      }).returning();

      if (body.diagnostic_data) {
        const dd = body.diagnostic_data;
        const [newDiag] = await db.insert(diagnosticData).values({
          repairId: newRepair.id,
          equipmentName: dd.equipmentName || null,
          observation: dd.observation,
          hypothesis: dd.hypothesis,
          verification: dd.verification,
          prescription: dd.prescription,
          confidenceScore: dd.confidenceScore || 0,
        }).returning();

        if (dd.steps?.length > 0) {
          await db.insert(diagnosticSteps).values(dd.steps.map((s: any, i: number) => ({
            diagnosticDataId: newDiag.id, stepOrder: s.id || i + 1, title: s.title, timeEstimate: s.time, tools: s.tools, requiresAr: s.requiresAR ?? false,
          })));
        }
        if (dd.safetyWarning) {
          await db.insert(safetyWarnings).values({ diagnosticDataId: newDiag.id, title: dd.safetyWarning.title, description: dd.safetyWarning.description });
        }
        if (dd.references?.length > 0) {
          await db.insert(diagnosticReferences).values(dd.references.map((r: any) => ({
            diagnosticDataId: newDiag.id, refType: r.type, title: r.title, details: r.details, uri: r.uri || null,
          })));
        }
        if (dd.searchSources?.length > 0) {
          await db.insert(searchSources).values(dd.searchSources.map((s: any) => ({
            diagnosticDataId: newDiag.id, title: s.title, uri: s.uri,
          })));
        }
      }

      return res.status(201).json(await assembleRepair(newRepair));
    }

    // ─── PATCH /api/repairs/:id/status ───
    if (method === 'PATCH') {
      const idMatch = url?.match(/\/api\/repairs\/(\d+)\/status/);
      if (idMatch) {
        const id = parseInt(idMatch[1], 10);
        const { status, current_step } = req.body;
        const updateValues: any = { status };
        if (current_step !== undefined) updateValues.currentStep = current_step;
        await db.update(repairs).set(updateValues).where(eq(repairs.id, id));
        return res.json({ success: true });
      }
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('[Vercel] repairs handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
