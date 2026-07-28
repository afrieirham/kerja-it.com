import { relations } from "drizzle-orm/relations";
import { recruiter, recruiterJob } from "./schema";

export const recruiterJobRelations = relations(recruiterJob, ({ one }) => ({
	recruiter: one(recruiter, {
		fields: [recruiterJob.recruiterId],
		references: [recruiter.id]
	}),
}));

export const recruiterRelations = relations(recruiter, ({ many }) => ({
	recruiterJobs: many(recruiterJob),
}));