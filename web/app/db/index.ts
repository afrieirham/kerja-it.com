import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "~/env.server";
import * as relations from "./relations";
import * as schema from "./schema";

const client = postgres(env.DATABASE_URL);

export const db = drizzle(client, { schema: { ...schema, ...relations } });
