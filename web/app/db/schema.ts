import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const job = pgTable(
	"Job",
	{
		id: text()
			.primaryKey()
			.notNull()
			.$defaultFn(() => randomUUID()),
		url: text().notNull(),
		title: text().notNull(),
		description: text().notNull(),
		createdAt: timestamp({ precision: 3, mode: "string" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: timestamp({ precision: 3, mode: "string" })
			.notNull()
			.$defaultFn(() => new Date().toISOString()),
		source: text().notNull(),
		company: text(),
		location: text(),
		role: text(),
		seniority: text(),
		salary: text(),
		postedAt: timestamp({ precision: 3, mode: "string" }),
	},
	(table) => [
		uniqueIndex("Job_url_key").using(
			"btree",
			table.url.asc().nullsLast().op("text_ops"),
		),
	],
);
