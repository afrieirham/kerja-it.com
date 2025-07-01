import { clerkClient } from "@/server/auth";
import { db } from "@/server/db";

export const syncUserData = async ({ clerkId }: { clerkId: string }) => {
  const user = await db.recruiter.findFirst({ where: { id: clerkId } });
  if (!user) {
    const clerkUser = await clerkClient.users.getUser(clerkId);
    let credit = 0;
    let email = "";
    if (clerkUser.primaryEmailAddress) {
      const user = await db.recruiter.upsert({
        where: { id: clerkId },
        create: {
          id: clerkId,
          email: clerkUser.primaryEmailAddress.emailAddress,
        },
        update: { email: clerkUser.primaryEmailAddress.emailAddress },
      });
      credit = user.jobCredit;
      email = user.email;
    }
    return { credit, email };
  }

  return { credit: user.jobCredit, email: user.email };
};
