import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "~/env.server";
import * as schema from "./schema";

const client = postgres(env.DATABASE_URL);

const globalForDb = globalThis as unknown as {
	db: ReturnType<typeof drizzle> | undefined;
};

export const db = globalForDb.db ?? drizzle(client, { schema });

if (env.NODE_ENV !== "production") {
	globalForDb.db = db;
}
