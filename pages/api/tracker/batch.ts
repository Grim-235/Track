import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { prisma } from "../../../lib/prisma";

type ToggleInput = {
  habitId: string;
  date: string;
  isCompleted: boolean;
};

type BatchRequestBody = {
  updates: ToggleInput[];
};

function isValidDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const updates = (req.body as BatchRequestBody | undefined)?.updates;

  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ error: "Expected a non-empty updates array." });
  }

  if (updates.length > 1000) {
    return res.status(413).json({ error: "Batch is too large. Send 1000 updates or fewer." });
  }

  const invalidUpdate = updates.find((update) => {
    return (
      !update ||
      typeof update.habitId !== "string" ||
      typeof update.date !== "string" ||
      typeof update.isCompleted !== "boolean" ||
      !isValidDateOnly(update.date)
    );
  });

  if (invalidUpdate) {
    return res.status(400).json({ error: "Each update must include habitId, YYYY-MM-DD date, and isCompleted." });
  }

  const habitIds = [...new Set(updates.map((update) => update.habitId))];
  const ownedHabits = await prisma.habit.findMany({
    where: {
      id: { in: habitIds },
      userId,
    },
    select: { id: true },
  });
  const ownedHabitIds = new Set(ownedHabits.map((habit) => habit.id));

  if (ownedHabitIds.size !== habitIds.length) {
    return res.status(403).json({ error: "One or more habits do not belong to the signed-in user." });
  }

  const saved = await prisma.$transaction(
    updates.map((update) => {
      const date = new Date(`${update.date}T00:00:00.000Z`);

      return prisma.habitCompletion.upsert({
        where: {
          habitId_date: {
            habitId: update.habitId,
            date,
          },
        },
        create: {
          habitId: update.habitId,
          date,
          isCompleted: update.isCompleted,
        },
        update: {
          isCompleted: update.isCompleted,
        },
      });
    }),
  );

  return res.status(200).json({ completions: saved });
}
