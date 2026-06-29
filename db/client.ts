import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Connection string from environment
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn(
    '[DB] DATABASE_URL is not set. Database operations will fail. ' +
    'Set DATABASE_URL in .env.local to connect to Aurora PostgreSQL.'
  );
}

// Create postgres.js client
// For Vercel Serverless: use max 1 connection per function instance
// ssl: 'require' is mandatory for AWS Aurora/RDS connections
const client = postgres(connectionString || 'postgres://localhost:5432/machmind-ai', {
  ssl: connectionString ? 'require' : false,
  connect_timeout: 10,
  max: 1,
});

// Create Drizzle ORM instance with schema for relational queries
export const db = drizzle(client, { schema });

export default db;
