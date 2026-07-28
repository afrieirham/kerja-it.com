import { sql } from "drizzle-orm";
import { boolean, foreignKey, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";



export const job = pgTable("Job", {
	id: text().primaryKey().notNull(),
	url: text().notNull(),
	title: text().notNull(),
	description: text().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	source: text().notNull(),
}, (table) => [
	uniqueIndex("Job_url_key").using("btree", table.url.asc().nullsLast().op("text_ops")),
]);

export const recruiter = pgTable("Recruiter", {
	id: text().primaryKey().notNull(),
	email: text().notNull(),
	premiumCredit: integer().default(0).notNull(),
	freeCredit: integer().default(2).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("Recruiter_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	uniqueIndex("Recruiter_email_key").using("btree", table.email.asc().nullsLast().op("text_ops")),
]);

export const recruiterJob = pgTable("RecruiterJob", {
	id: text().primaryKey().notNull(),
	title: text().notNull(),
	description: text(),
	applyUrl: text().notNull(),
	live: boolean().default(false).notNull(),
	premium: boolean().notNull(),
	recruiterId: text().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
		columns: [table.recruiterId],
		foreignColumns: [recruiter.id],
		name: "RecruiterJob_recruiterId_fkey"
	}).onUpdate("cascade").onDelete("restrict"),
]);
