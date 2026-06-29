
import { DiagnosticLog } from '../types';

export type RepairStatus = 'ACTIVE' | 'DIAGNOSED' | 'IN_PROGRESS' | 'VERIFICATION_NEEDED' | 'COMPLETED' | 'PENDING';

export interface RepairDB {
  id: number;
  user_id: string;
  title: string;
  equipment: string;
  status: RepairStatus;
  current_step: number;
  created_at: string;
  technician_name: string;
  diagnostic_data?: DiagnosticLog;
}

export interface ManualDB {
  id: number;
  user_id?: string;
  title: string;
  category: string;
  description?: string;
  image_url?: string;
  created_at?: string;
}

// ─── API Base URL ───
// In dev: Vite proxy forwards /api/* to Express on :3001
// In prod: Vercel serves /api/* as serverless functions
const API_BASE = '/api';

// ─── Helper: fetch with error handling ───
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...options,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const err = await res.text();
      console.error(`[DB] API error ${res.status}: ${err}`);
      throw new Error(`API error ${res.status}`);
    }

    return res.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// ─── REPAIR OPERATIONS ───

export async function getActiveRepair(): Promise<RepairDB | null> {
  try {
    return await apiFetch<RepairDB | null>('/repairs/active');
  } catch (e) {
    console.warn('[DB] getActiveRepair failed, returning null', e);
    return null;
  }
}

export async function getRecentRepairs(): Promise<RepairDB[]> {
  try {
    return await apiFetch<RepairDB[]>('/repairs/recent');
  } catch (e) {
    console.warn('[DB] getRecentRepairs failed, returning []', e);
    return [];
  }
}

export async function getAllRepairs(): Promise<RepairDB[]> {
  try {
    return await apiFetch<RepairDB[]>('/repairs');
  } catch (e) {
    console.warn('[DB] getAllRepairs failed, returning []', e);
    return [];
  }
}

export async function getRepairById(id: number): Promise<RepairDB | null> {
  try {
    return await apiFetch<RepairDB>(`/repairs/${id}`);
  } catch (e) {
    console.warn(`[DB] getRepairById(${id}) failed, returning null`, e);
    return null;
  }
}

export async function createRepair(repair: Omit<RepairDB, 'id' | 'created_at'>): Promise<RepairDB> {
  return apiFetch<RepairDB>('/repairs', {
    method: 'POST',
    body: JSON.stringify(repair),
  });
}

export async function updateRepairStatus(id: number, status: RepairStatus, current_step?: number): Promise<void> {
  await apiFetch(`/repairs/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, current_step }),
  });
}

export async function deleteRepair(id: number): Promise<void> {
  await apiFetch(`/repairs/${id}`, {
    method: 'DELETE',
  });
}

// ─── MANUAL OPERATIONS ───

export async function getManuals(): Promise<ManualDB[]> {
  try {
    return await apiFetch<ManualDB[]>('/manuals');
  } catch (e) {
    console.warn('[DB] getManuals failed, returning []', e);
    return [];
  }
}
