import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const jobRouter = createTRPCRouter({
  getAll: publicProcedure
    .input(
      z.object({
        searchTerm: z.string().optional(),
        page: z.number().nullable(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { searchTerm } = input;
      const pageSize = 50;
      const page = input.page ?? 1;

      const jobs = await ctx.db.job.findMany({
        orderBy: [{ createdAt: "desc" }, { title: "asc" }],
        where: {
          OR: [
            {
              title: {
                contains: searchTerm,
                mode: "insensitive",
              },
            },
            {
              description: {
                contains: searchTerm,
                mode: "insensitive",
              },
            },
          ],
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      const count = await ctx.db.job.count({});

      return { jobs, count };
    }),
});
