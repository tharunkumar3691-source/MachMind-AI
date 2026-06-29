import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import dotenv from "dotenv";

// Load from .env.local
dotenv.config({ path: '.env.local' });

async function checkDatabase() {
    console.log("Checking database connection...");
    if (!process.env.DATABASE_URL) {
        console.error("No DATABASE_URL found.");
        return;
    }
    console.log("URL:", process.env.DATABASE_URL.split('@')[1]); // Log everything after credentials

    try {
        const sql = postgres(process.env.DATABASE_URL, { max: 1, ssl: 'require', connect_timeout: 5 });
        const db = drizzle(sql);
        const result = await sql`SELECT 1 as test`;
        console.log("SUCCESS! Database connection works. Result:", result);
        await sql.end();
    } catch (error) {
        console.error("FAILED! Database error:");
        console.error(error);
    }
}

checkDatabase();
