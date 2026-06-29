/**
 * Seed script: Populates Aurora PostgreSQL with initial demo data.
 *
 * Usage: npx tsx db/seed.ts
 *
 * Requires DATABASE_URL to be set in .env.local
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from './client.js';
import {
  repairs,
  diagnosticData,
  diagnosticSteps,
  safetyWarnings,
  diagnosticReferences,
  manuals,
} from './schema.js';

async function seed() {
  console.log('🌱 Seeding database...\n');

  // ── Insert Manuals ──
  console.log('  📖 Inserting manuals...');
  await db.insert(manuals).values([
    {
      title: 'GX-500 Pump',
      category: 'Hydraulics',
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDS1semksLbaK8WQNKG0MQLrGlO87Lu_dKWmIpuHnG5bJBC3YDlbM3NXa-VOlZQgAN-9USx1jOckey96ESkETf7G0GztPQCqjQEZLGgE-R3wWlKf2N7nBoSmRxahn_xDAW-axcu6j7WF7ZqDVY4FiSO7Nt0q9z9RH0gImak8ghOk76DzNeQ-HFSuAF_gfxkh04zMQsDgTIn2fcsOhBLxWRS156gUKia0cS0sMk-RxRleNnldrRM5WJ7l7Q7tf0_n45G_RObPF1Rzfw',
      description: 'Comprehensive guide for the GX-500 series. TECHNICAL SPECS: Max Operating Pressure: 3000 PSI. Torque Specs: Casing Bolts = 45Nm, Mounting Bolts = 80Nm. Common Failures: Main Shaft Seal (P/N: SK-99-X) failure due to cavitation. Safety: SYSTEM MUST BE DEPRESSURIZED via Valve V-2 prior to housing removal. Parts: Seal Kit (SK-99-X), Impeller (IMP-500-A).',
    },
    {
      title: 'Compressor C-101',
      category: 'Pneumatics',
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCbbeM-xM30bSu1eh1fTT1cCvaGj3bFEATFFHVj1BN-w_uHOgUMj8GqQwqtcVd3vIFaRrv9FE6MB5pITMRcjrd7HtNNEJQkiYv8L5mphfpBrl_Xz16u8KozhC8CMPfbgR-znOnipEQWXeV6tAxM2PmizthtosUvAg1bkJcC0e7YYNyBMfQNALWukmYFYLqPvPzPSRmZCDd2oPhNYWXhmnNt_y4eG3RhpdtqUiNooV7LWh6SEPQatT8GoDdffWgZ620kESxZdO-bkKA',
      description: 'Operation manual for C-101. SPECS: Oil Type: ISO 46 Synthetic. Filter Replacement Interval: 500 hours. Belt Tension: 1.5cm deflection at 5kg force. Safety: Disconnect main power breaker B-1 before servicing.',
    },
    {
      title: 'HVAC Unit B-42',
      category: 'HVAC',
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuChk1xXUYs7E8Hgn_KzvA-wtq55XLJrEHcY8bcBOCIDDL3CP6icDD3LDw93gXk8-bLC-Wo36hIH5Vuk9i3SOV-IK2fixP4NvbZHxu1WxLtmXvvUNmN02YGsSVM1CG3Yajap42spw3zKJWhMXFoOHG2p5IJvWR2XSv1--_sdZ5omhIuaG04m1f-7osKpJy0V6G-RpDpiveM4RhkrAl6FS7nz6nywBwYDxREfsw-Zo5qxewPqIjhhIu_Qoch36-cQxqMbrClrk4Iz-yc',
      description: 'Service manual for B-series HVAC units. Coolant Type: R-410A. Charge: 4.5lbs.',
    },
    {
      title: 'Generator Unit 3',
      category: 'Electrical',
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCQ3fpNuSNn_fxwVtAasaUQR5-hIJvhzhijWrCUzvAtPkFrmcATArND6m-gm0xEFshlLCnpYHnE0yBa_juTQicW2y6_juTQicW2y6_jezvIODUhfUnwzwaF4Qt4RVmilM4rFUaEBLk_U2zN8Tlnj1AJxkv_EcxkxqkK1-dQNSFyh4sQy5M0CLs5AE3WpyUaW2ODM5lxyt3UCTWjnQzB8Lu_LBmN1_7JFfaLg_y54i4djzVQH__ioqb8tsN3nWc6XBPyeD1AEEID57pyiq-nx6PKUg',
      description: 'User guide for backup generator. Output: 450kW. Voltage: 480V 3-Phase.',
    },
    {
      title: 'Servo Motor M-200',
      category: 'Automation',
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDS1semksLbaK8WQNKG0MQLrGlO87Lu_dKWmIpuHnG5bJBC3YDlbM3NXa-VOlZQgAN-9USx1jOckey96ESkETf7G0GztPQCqjQEZLGgE-R3wWlKf2N7nBoSmRxahn_xDAW-axcu6j7WF7ZqDVY4FiSO7Nt0q9z9RH0gImak8ghOk76DzNeQ-HFSuAF_gfxkh04zMQsDgTIn2fcsOhBLxWRS156gUKia0cS0sMk-RxRleNnldrRM5WJ7l7Q7tf0_n45G_RObPF1Rzfw',
      description: 'Technical specifications for M-200 servos. Torque: 5Nm continuous. Max Speed: 3000 RPM.',
    },
  ]);

  // ── Insert Repairs with Diagnostic Data ──
  console.log('  🔧 Inserting repairs...');

  // Repair 1: Completed
  const [repair1] = await db.insert(repairs).values({
    userId: 'local-user',
    title: 'Engine Misfire Diagnosis',
    equipment: 'Ford F-150 5.0L V8',
    status: 'COMPLETED',
    currentStep: 3,
    technicianName: 'Alex Rivera',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  }).returning();

  const [diag1] = await db.insert(diagnosticData).values({
    repairId: repair1.id,
    equipmentName: 'Ford F-150 Engine',
    observation: 'Rough idling and check engine light detected. Error code P0300.',
    hypothesis: 'Ignition coil failure on Cylinder 4.',
    verification: 'Swapped coil 4 with coil 2, misfire moved to cylinder 2.',
    prescription: 'Replace ignition coil pack.',
    confidenceScore: 98,
  }).returning();

  await db.insert(diagnosticSteps).values([
    { diagnosticDataId: diag1.id, stepOrder: 1, title: 'Remove engine cover', timeEstimate: '5m', tools: 'Socket set', requiresAr: false },
    { diagnosticDataId: diag1.id, stepOrder: 2, title: 'Disconnect coil connector', timeEstimate: '2m', tools: 'None', requiresAr: false },
    { diagnosticDataId: diag1.id, stepOrder: 3, title: 'Replace coil', timeEstimate: '5m', tools: '10mm Socket', requiresAr: false },
  ]);

  // Repair 2: Completed
  const [repair2] = await db.insert(repairs).values({
    userId: 'local-user',
    title: 'AC Compressor Replacement',
    equipment: 'Carrier 24ABB3 HVAC Unit',
    status: 'COMPLETED',
    currentStep: 3,
    technicianName: 'Alex Rivera',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  }).returning();

  const [diag2] = await db.insert(diagnosticData).values({
    repairId: repair2.id,
    equipmentName: 'Carrier HVAC Unit',
    observation: 'Unit blowing warm air. High side pressure normal, low side near zero.',
    hypothesis: 'Compressor internal failure.',
    verification: 'Amp draw test showed locked rotor amps.',
    prescription: 'Replace compressor unit and recharge refrigerant.',
    confidenceScore: 95,
  }).returning();

  await db.insert(diagnosticSteps).values([
    { diagnosticDataId: diag2.id, stepOrder: 1, title: 'Recover refrigerant', timeEstimate: '30m', tools: 'Recovery Machine', requiresAr: false },
    { diagnosticDataId: diag2.id, stepOrder: 2, title: 'Remove compressor', timeEstimate: '45m', tools: 'Wrenches, Torch', requiresAr: false },
    { diagnosticDataId: diag2.id, stepOrder: 3, title: 'Install new unit', timeEstimate: '45m', tools: 'Brazing Kit', requiresAr: false },
  ]);

  // Repair 3: DIAGNOSED
  const [repair3] = await db.insert(repairs).values({
    userId: 'local-user',
    title: 'Hydraulic Pressure Loss',
    equipment: 'GX-500 Pump',
    status: 'DIAGNOSED',
    currentStep: 0,
    technicianName: 'Alex Rivera',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  }).returning();

  const [diag3] = await db.insert(diagnosticData).values({
    repairId: repair3.id,
    equipmentName: 'GX-500 Pump',
    observation: 'System fails to reach operating pressure of 3000 PSI. Leaking visible around casing.',
    hypothesis: 'Main shaft seal failure.',
    verification: 'Audio spectrum analysis indicates cavitation noise peaks at 450Hz.',
    prescription: 'Replace shaft seal kit SK-99-X.',
    confidenceScore: 92,
  }).returning();

  await db.insert(diagnosticSteps).values([
    { diagnosticDataId: diag3.id, stepOrder: 1, title: 'Depressurize system', timeEstimate: '15m', tools: 'Valve Key', requiresAr: false },
    { diagnosticDataId: diag3.id, stepOrder: 2, title: 'Remove pump casing', timeEstimate: '20m', tools: 'Impact Wrench', requiresAr: true },
    { diagnosticDataId: diag3.id, stepOrder: 3, title: 'Extract old seal', timeEstimate: '10m', tools: 'Seal Puller', requiresAr: true },
    { diagnosticDataId: diag3.id, stepOrder: 4, title: 'Install SK-99-X', timeEstimate: '15m', tools: 'Press Tool', requiresAr: true },
    { diagnosticDataId: diag3.id, stepOrder: 5, title: 'Test pressure', timeEstimate: '10m', tools: 'Gauge', requiresAr: false },
  ]);

  await db.insert(safetyWarnings).values({
    diagnosticDataId: diag3.id,
    title: 'HIGH PRESSURE HAZARD',
    description: 'System must be fully depressurized via Valve V-2 before any disassembly.',
  });

  await db.insert(diagnosticReferences).values([
    { diagnosticDataId: diag3.id, refType: 'MANUAL', title: 'GX-500 Service Manual', details: 'Section 4.2 - Shaft Seal Replacement' },
    { diagnosticDataId: diag3.id, refType: 'HISTORY', title: 'Maintenance Log #8842', details: 'Similar failure noted 3 months ago' },
  ]);

  // Repair 4: IN_PROGRESS
  const [repair4] = await db.insert(repairs).values({
    userId: 'local-user',
    title: 'Conveyor Belt Alignment',
    equipment: 'Logistics Belt L-400',
    status: 'IN_PROGRESS',
    currentStep: 1,
    technicianName: 'Alex Rivera',
    createdAt: new Date(Date.now() - 30 * 60 * 1000),
  }).returning();

  const [diag4] = await db.insert(diagnosticData).values({
    repairId: repair4.id,
    equipmentName: 'Conveyor L-400',
    observation: 'Belt drifting to left side causing edge fraying.',
    hypothesis: 'Roller tension imbalance.',
    verification: 'Visual inspection confirms slack on right side tensioner.',
    prescription: 'Re-tension right side roller and align belt.',
    confidenceScore: 88,
  }).returning();

  await db.insert(diagnosticSteps).values([
    { diagnosticDataId: diag4.id, stepOrder: 1, title: 'Loosen lock nuts', timeEstimate: '5m', tools: 'Wrench 14mm', requiresAr: false },
    { diagnosticDataId: diag4.id, stepOrder: 2, title: 'Adjust tensioner bolt', timeEstimate: '10m', tools: 'Wrench 14mm', requiresAr: true },
    { diagnosticDataId: diag4.id, stepOrder: 3, title: 'Run belt and check tracking', timeEstimate: '5m', tools: 'Visual', requiresAr: false },
  ]);

  // Repair 5: VERIFICATION_NEEDED
  const [repair5] = await db.insert(repairs).values({
    userId: 'local-user',
    title: 'Circuit Breaker Trip',
    equipment: 'Panel Board P-2',
    status: 'VERIFICATION_NEEDED',
    currentStep: 3,
    technicianName: 'Alex Rivera',
    createdAt: new Date(Date.now() - 60 * 60 * 1000),
  }).returning();

  const [diag5] = await db.insert(diagnosticData).values({
    repairId: repair5.id,
    equipmentName: 'Panel Board P-2',
    observation: 'Breaker #4 tripping immediately upon reset.',
    hypothesis: 'Short to ground in sub-circuit.',
    verification: 'Megger test showed 0 Ohms phase-to-ground.',
    prescription: 'Locate and repair short in conduit run.',
    confidenceScore: 99,
  }).returning();

  await db.insert(diagnosticSteps).values([
    { diagnosticDataId: diag5.id, stepOrder: 1, title: 'Isolate circuit', timeEstimate: '5m', tools: 'LOTO Kit', requiresAr: false },
    { diagnosticDataId: diag5.id, stepOrder: 2, title: 'Trace conduit', timeEstimate: '30m', tools: 'Tone Generator', requiresAr: true },
    { diagnosticDataId: diag5.id, stepOrder: 3, title: 'Repair wire insulation', timeEstimate: '20m', tools: 'Tape, Strippers', requiresAr: true },
  ]);

  console.log('\n  ✅ Seed complete! Inserted:');
  console.log('     • 5 manuals');
  console.log('     • 5 repairs with diagnostic data');
  console.log('     • 17 diagnostic steps');
  console.log('     • 1 safety warning');
  console.log('     • 2 diagnostic references\n');

  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
