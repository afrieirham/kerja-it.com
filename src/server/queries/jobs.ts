import { db } from "@/server/db";

export const getAllExternalJobs = async ({
  searchTerm,
  page,
  pageSize,
}: {
  searchTerm: string;
  page: number;
  pageSize: number;
}) => {
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

export const getAllLiveFreeJobs = async () => {
  return await db.recruiterJob.findMany({
    where: { live: true, premium: false },
    take: 10,
  });
};

export const getAllLivePremiumJobs = async () => {
  return await db.recruiterJob.findMany({
    where: { live: true, premium: true },
  });
};
