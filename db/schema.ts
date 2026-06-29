import { pgTable, serial, text, integer, boolean, timestamp, real, jsonb, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================
// REPAIRS — Core repair session record
// ============================================================
export const repairs = pgTable('repairs', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().default('local-user'),
  title: text('title').notNull(),
  equipment: text('equipment').notNull(),
  status: text('status', {
    enum: ['ACTIVE', 'DIAGNOSED', 'IN_PROGRESS', 'VERIFICATION_NEEDED', 'COMPLETED', 'PENDING'],
  }).notNull().default('ACTIVE'),
  currentStep: integer('current_step').notNull().default(0),
  technicianName: text('technician_name').notNull().default('Field Technician'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// DIAGNOSTIC_DATA — AI analysis result linked to a repair
// ============================================================
export const diagnosticData = pgTable('diagnostic_data', {
  id: serial('id').primaryKey(),
  repairId: integer('repair_id')
    .notNull()
    .references(() => repairs.id, { onDelete: 'cascade' }),
  equipmentName: text('equipment_name'),
  observation: text('observation').notNull(),
  hypothesis: text('hypothesis').notNull(),
  verification: text('verification').notNull(),
  prescription: text('prescription').notNull(),
  confidenceScore: real('confidence_score').notNull().default(0),
});

// ============================================================
// DIAGNOSTIC_STEPS — Individual repair procedure steps
// ============================================================
export const diagnosticSteps = pgTable('diagnostic_steps', {
  id: serial('id').primaryKey(),
  diagnosticDataId: integer('diagnostic_data_id')
    .notNull()
    .references(() => diagnosticData.id, { onDelete: 'cascade' }),
  stepOrder: integer('step_order').notNull(),
  title: text('title').notNull(),
  timeEstimate: text('time_estimate').notNull(),
  tools: text('tools').notNull(),
  requiresAr: boolean('requires_ar').notNull().default(false),
});

// ============================================================
// SAFETY_WARNINGS — Safety warnings per diagnosis
// ============================================================
export const safetyWarnings = pgTable('safety_warnings', {
  id: serial('id').primaryKey(),
  diagnosticDataId: integer('diagnostic_data_id')
    .notNull()
    .references(() => diagnosticData.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').notNull(),
});

// ============================================================
// DIAGNOSTIC_REFERENCES — Knowledge sources (manual, history, web)
// ============================================================
export const diagnosticReferences = pgTable('diagnostic_references', {
  id: serial('id').primaryKey(),
  diagnosticDataId: integer('diagnostic_data_id')
    .notNull()
    .references(() => diagnosticData.id, { onDelete: 'cascade' }),
  refType: text('ref_type', {
    enum: ['MANUAL', 'HISTORY', 'IOT', 'WEB'],
  }).notNull(),
  title: text('title').notNull(),
  details: text('details').notNull(),
  uri: text('uri'),
});

// ============================================================
// SEARCH_SOURCES — Google Search grounding citations
// ============================================================
export const searchSources = pgTable('search_sources', {
  id: serial('id').primaryKey(),
  diagnosticDataId: integer('diagnostic_data_id')
    .notNull()
    .references(() => diagnosticData.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  uri: text('uri').notNull(),
});

// ============================================================
// MANUALS — Equipment manual library
// ============================================================
export const manuals = pgTable('manuals', {
  id: serial('id').primaryKey(),
  userId: text('user_id'),
  title: text('title').notNull(),
  category: text('category').notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  fileUrl: text('file_url'), // S3 URL for PDF
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// MEDIA_FILES — S3 file metadata tracker
// ============================================================
export const mediaFiles = pgTable('media_files', {
  id: serial('id').primaryKey(),
  repairId: integer('repair_id')
    .references(() => repairs.id, { onDelete: 'set null' }),
  fileType: text('file_type', {
    enum: ['video', 'image', 'audio', 'pdf', 'evidence', 'report'],
  }).notNull(),
  s3Key: text('s3_key').notNull(),
  s3Url: text('s3_url').notNull(),
  originalFilename: text('original_filename'),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// RELATIONS — Drizzle relational queries
// ============================================================
export const repairsRelations = relations(repairs, ({ one, many }) => ({
  diagnosticData: one(diagnosticData, {
    fields: [repairs.id],
    references: [diagnosticData.repairId],
  }),
  mediaFiles: many(mediaFiles),
}));

export const diagnosticDataRelations = relations(diagnosticData, ({ one, many }) => ({
  repair: one(repairs, {
    fields: [diagnosticData.repairId],
    references: [repairs.id],
  }),
  steps: many(diagnosticSteps),
  safetyWarning: one(safetyWarnings, {
    fields: [diagnosticData.id],
    references: [safetyWarnings.diagnosticDataId],
  }),
  references: many(diagnosticReferences),
  searchSources: many(searchSources),
}));

export const diagnosticStepsRelations = relations(diagnosticSteps, ({ one }) => ({
  diagnosticData: one(diagnosticData, {
    fields: [diagnosticSteps.diagnosticDataId],
    references: [diagnosticData.id],
  }),
}));

export const safetyWarningsRelations = relations(safetyWarnings, ({ one }) => ({
  diagnosticData: one(diagnosticData, {
    fields: [safetyWarnings.diagnosticDataId],
    references: [diagnosticData.id],
  }),
}));

export const diagnosticReferencesRelations = relations(diagnosticReferences, ({ one }) => ({
  diagnosticData: one(diagnosticData, {
    fields: [diagnosticReferences.diagnosticDataId],
    references: [diagnosticData.id],
  }),
}));

export const searchSourcesRelations = relations(searchSources, ({ one }) => ({
  diagnosticData: one(diagnosticData, {
    fields: [searchSources.diagnosticDataId],
    references: [diagnosticData.id],
  }),
}));

export const mediaFilesRelations = relations(mediaFiles, ({ one }) => ({
  repair: one(repairs, {
    fields: [mediaFiles.repairId],
    references: [repairs.id],
  }),
}));

// ============================================================
// AUTHENTICATION TABLES — Auth.js (NextAuth.js) schema
// ============================================================
export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').unique().notNull(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: text('image'),
});

export const accounts = pgTable(
  'accounts',
  {
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => ({
    compoundKey: primaryKey({ columns: [account.provider, account.providerAccountId] }),
  })
);

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

