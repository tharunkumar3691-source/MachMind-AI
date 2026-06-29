/**
 * FULL END-TO-END API TEST SUITE
 * Tests: Health, Repairs CRUD, Manuals CRUD, Upload presign, S3
 */

const BASE = 'http://localhost:3001';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL';
  detail?: string;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, status: 'PASS' });
    console.log(`  ✅ PASS: ${name}`);
  } catch (e: any) {
    results.push({ name, status: 'FAIL', detail: e.message });
    console.error(`  ❌ FAIL: ${name} — ${e.message}`);
  }
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

async function apiJSON(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(body)}`);
  return { status: res.status, body };
}

// ─── RUN TESTS ───────────────────────────────────────────────

let createdRepairId: number | null = null;
let createdManualId: number | null = null;

// 1. Health Check
await test('GET /api/health — returns ok', async () => {
  const { body } = await apiJSON('/api/health');
  assert(body.status === 'ok', `Expected status ok, got: ${body.status}`);
  assert(body.database === 'configured', `Database not configured: ${body.database}`);
  assert(body.s3 === 'configured', `S3 not configured: ${body.s3}`);
});

// 2. GET /api/repairs (empty or array)
await test('GET /api/repairs — returns array', async () => {
  const { body } = await apiJSON('/api/repairs');
  assert(Array.isArray(body), `Expected array, got: ${typeof body}`);
  console.log(`    → Found ${body.length} existing repairs`);
});

// 3. GET /api/repairs/recent
await test('GET /api/repairs/recent — returns array ≤5', async () => {
  const { body } = await apiJSON('/api/repairs/recent');
  assert(Array.isArray(body), `Expected array`);
  assert(body.length <= 5, `Expected ≤5 repairs, got ${body.length}`);
});

// 4. GET /api/repairs/active
await test('GET /api/repairs/active — returns null or repair object', async () => {
  const { body } = await apiJSON('/api/repairs/active');
  assert(body === null || (typeof body === 'object' && body.id), `Unexpected body: ${JSON.stringify(body)}`);
});

// 5. POST /api/repairs — Create repair with full diagnostic data
await test('POST /api/repairs — creates repair with diagnostic data', async () => {
  const { status, body } = await apiJSON('/api/repairs', {
    method: 'POST',
    body: JSON.stringify({
      user_id: 'e2e-test-user',
      title: 'E2E Test: Bearing Failure',
      equipment: 'Industrial Pump XP-2000',
      status: 'DIAGNOSED',
      technician_name: 'E2E Bot',
      diagnostic_data: {
        equipmentName: 'Industrial Pump XP-2000',
        observation: 'High vibration at 400Hz with visible bearing wear',
        hypothesis: 'Inner Race Bearing Failure',
        verification: 'Check bearing housing for heat and play',
        prescription: 'Replace DE Bearing',
        confidenceScore: 94,
        steps: [
          { id: 1, title: 'LOTO Procedure', time: '10 mins', tools: 'LOTO Kit', requiresAR: false },
          { id: 2, title: 'Remove Fan Cover', time: '5 mins', tools: 'Impact Driver', requiresAR: true },
          { id: 3, title: 'Extract Bearing', time: '20 mins', tools: 'Bearing Puller', requiresAR: true },
        ],
        safetyWarning: {
          title: 'ROTATING MACHINERY HAZARD',
          description: 'Ensure equipment is fully de-energized before proceeding.'
        },
        references: [
          { type: 'MANUAL', title: 'Pump Maintenance Manual v2.3', details: 'Section 4.1: Bearing Replacement Procedure' }
        ],
        searchSources: [
          { title: 'Bearing Failure Analysis Guide', uri: 'https://example.com/bearing-guide' }
        ]
      }
    }),
  });
  assert(status === 201, `Expected 201, got ${status}`);
  assert(typeof body.id === 'number', `Expected id number, got: ${typeof body.id}`);
  assert(body.title === 'E2E Test: Bearing Failure', 'Title mismatch');
  assert(body.diagnostic_data !== null, 'diagnostic_data should not be null');
  assert(body.diagnostic_data.steps.length === 3, `Expected 3 steps, got ${body.diagnostic_data.steps.length}`);
  assert(body.diagnostic_data.safetyWarning !== undefined, 'safetyWarning missing');
  createdRepairId = body.id;
  console.log(`    → Created repair ID: ${createdRepairId}`);
});

// 6. GET /api/repairs/:id — fetch the created one
await test('GET /api/repairs/:id — fetches by ID', async () => {
  assert(createdRepairId !== null, 'No repair ID to test with');
  const { body } = await apiJSON(`/api/repairs/${createdRepairId}`);
  assert(body.id === createdRepairId, `ID mismatch`);
  assert(body.equipment === 'Industrial Pump XP-2000', 'Equipment mismatch');
  assert(body.diagnostic_data?.confidenceScore === 94, `Confidence mismatch: ${body.diagnostic_data?.confidenceScore}`);
});

// 7. GET /api/repairs/:id — invalid ID
await test('GET /api/repairs/invalid — returns 400', async () => {
  const res = await fetch(`${BASE}/api/repairs/not-a-number`);
  assert(res.status === 400, `Expected 400, got ${res.status}`);
});

// 8. GET /api/repairs/:id — not found
await test('GET /api/repairs/999999 — returns 404', async () => {
  const res = await fetch(`${BASE}/api/repairs/999999`);
  assert(res.status === 404, `Expected 404, got ${res.status}`);
});

// 9. PATCH /api/repairs/:id/status
await test('PATCH /api/repairs/:id/status — updates status', async () => {
  assert(createdRepairId !== null, 'No repair ID');
  const { body } = await apiJSON(`/api/repairs/${createdRepairId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'IN_PROGRESS', current_step: 1 }),
  });
  assert(body.success === true, `Expected success:true, got ${JSON.stringify(body)}`);
});

// 10. Verify PATCH took effect
await test('GET /api/repairs/:id — status updated to IN_PROGRESS', async () => {
  const { body } = await apiJSON(`/api/repairs/${createdRepairId}`);
  assert(body.status === 'IN_PROGRESS', `Expected IN_PROGRESS, got ${body.status}`);
  assert(body.current_step === 1, `Expected step 1, got ${body.current_step}`);
});

// 11. GET /api/manuals
await test('GET /api/manuals — returns array', async () => {
  const { body } = await apiJSON('/api/manuals');
  assert(Array.isArray(body), `Expected array`);
  console.log(`    → Found ${body.length} existing manuals`);
});

// 12. POST /api/manuals
await test('POST /api/manuals — creates manual', async () => {
  const { status, body } = await apiJSON('/api/manuals', {
    method: 'POST',
    body: JSON.stringify({
      title: 'E2E Test Manual — Industrial Pump',
      category: 'Mechanical',
      description: 'End-to-end test manual entry',
      image_url: null,
      file_url: null,
    }),
  });
  assert(status === 201, `Expected 201, got ${status}`);
  assert(typeof body.id === 'number', 'Expected id');
  assert(body.title === 'E2E Test Manual — Industrial Pump', 'Title mismatch');
  createdManualId = body.id;
  console.log(`    → Created manual ID: ${createdManualId}`);
});

// 13. S3 Presigned Upload URL
await test('POST /api/upload/presign — generates signed URL', async () => {
  const { body } = await apiJSON('/api/upload/presign', {
    method: 'POST',
    body: JSON.stringify({
      fileType: 'evidence',
      contentType: 'image/jpeg',
      originalFilename: 'e2e_test_image.jpg',
      repairId: createdRepairId,
    }),
  });
  assert(typeof body.uploadUrl === 'string' && body.uploadUrl.startsWith('https://'), `Invalid uploadUrl: ${body.uploadUrl}`);
  assert(typeof body.key === 'string', 'Missing key');
  assert(typeof body.publicUrl === 'string', 'Missing publicUrl');
  assert(typeof body.fileId === 'number', 'Missing fileId');
  console.log(`    → S3 key: ${body.key}`);
  
  // 14. Test that the presigned URL is actually usable (upload a tiny test file)
  const testContent = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]); // minimal JPEG header bytes
  const uploadRes = await fetch(body.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    body: testContent,
  });
  assert(uploadRes.ok, `S3 upload via presigned URL failed: ${uploadRes.status}`);
  console.log(`    → S3 presigned PUT: ${uploadRes.status} OK`);
});

// 15. S3 Presigned Download URL
await test('GET /api/upload/url?key=... — generates download URL', async () => {
  // Use a known key pattern
  const testKey = `repairs/${createdRepairId}/evidence/test_download.jpg`;
  const { body } = await apiJSON(`/api/upload/url?key=${encodeURIComponent(testKey)}`);
  assert(typeof body.downloadUrl === 'string' && body.downloadUrl.startsWith('https://'), `Invalid downloadUrl`);
  console.log(`    → Download URL generated OK`);
});

// 16. Input validation: POST /api/upload/presign missing fields
await test('POST /api/upload/presign — validates required fields', async () => {
  const res = await fetch(`${BASE}/api/upload/presign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileType: 'image' }), // missing contentType + originalFilename
  });
  assert(res.status === 400, `Expected 400, got ${res.status}`);
});

// ─── SUMMARY ─────────────────────────────────────────────────
console.log('\n' + '═'.repeat(60));
const passed = results.filter(r => r.status === 'PASS').length;
const failed = results.filter(r => r.status === 'FAIL').length;
console.log(`TOTAL: ${results.length} tests | ✅ ${passed} PASSED | ❌ ${failed} FAILED`);
console.log('═'.repeat(60));

if (failed > 0) {
  console.log('\nFailed tests:');
  results.filter(r => r.status === 'FAIL').forEach(r => {
    console.log(`  • ${r.name}: ${r.detail}`);
  });
  process.exit(1);
} else {
  console.log('\n🎉 ALL TESTS PASSED — Backend is fully functional!');
}
