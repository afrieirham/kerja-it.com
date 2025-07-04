import { clerkClient } from "@/server/auth";
import { db } from "@/server/db";

export const syncUserData = async ({ clerkId }: { clerkId: string }) => {
  const user = await db.recruiter.findFirst({ where: { id: clerkId } });
  if (!user) {
    const clerkUser = await clerkClient.users.getUser(clerkId);
    let freeCredit = 0;
    let premiumCredit = 0;
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
      premiumCredit = user.premiumCredit;
      freeCredit = user.freeCredit;
      email = user.email;
    }
    return { premiumCredit, freeCredit, email };
  }

  return {
    premiumCredit: user.premiumCredit,
    freeCredit: user.freeCredit,
    email: user.email,
  };
};

export const decrementPremiumCreditByOne = async ({
  userId,
}: {
  userId: string;
}) => {
  await db.recruiter.update({
    where: { id: userId },
    data: { premiumCredit: { decrement: 1 } },
  });
};

export const decrementFreeCreditByOne = async ({
  userId,
}: {
  userId: string;
}) => {
  await db.recruiter.update({
    where: { id: userId },
    data: { freeCredit: { decrement: 1 } },
  });
};

export const checkFreeCredit = async ({ userId }: { userId: string }) => {
  const user = await db.recruiter.findFirst({ where: { id: userId } });
  return Boolean(user?.freeCredit);
};

export const checkPremiumCredit = async ({ userId }: { userId: string }) => {
  const user = await db.recruiter.findFirst({ where: { id: userId } });
  return Boolean(user?.premiumCredit);
};
