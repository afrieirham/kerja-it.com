import { db } from "@/server/db";

export const getAllJobs = async ({ searchTerm }: { searchTerm: string }) => {
  const jobs = await db.job.findMany({
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
  });

  return jobs;
};
