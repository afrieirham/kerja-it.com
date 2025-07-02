import { db } from "@/server/db";

export const getAllJobs = async ({
  searchTerm,
  page,
}: {
  searchTerm: string;
  page: number;
}) => {
  const pageSize = 50;
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
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return jobs;
};

export const getJobById = async ({ id }: { id: string }) => {
  const job = await db.recruiterJob.findFirst({ where: { id } });
  return job;
};

export const getAllMyJob = async ({ id }: { id: string }) => {
  const jobs = await db.recruiterJob.findMany({
    where: { recruiterId: id },
    orderBy: { createdAt: "desc" },
  });
  return jobs;
};

export const createNewJob = async ({
  userId,
  premium,
}: {
  userId: string;
  premium: boolean;
}) => {
  const newJob = await db.recruiterJob.create({
    data: {
      title: "Sample Job Title",
      applyUrl: "https://sample-url.com",
      recruiterId: userId,
      premium,
    },
  });
  return { jobId: newJob.id };
};
