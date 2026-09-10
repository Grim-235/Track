import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { prisma } from "../../../lib/prisma";

type DailyLogUpdate = {
  date: string;
  moodScore?: number | null;
  sleepHours?: number | null;
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

  const updates = req.body?.updates as DailyLogUpdate[] | undefined;

  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ error: "Expected a non-empty updates array." });
  }

  if (updates.length > 1000) {
    return res.status(413).json({ error: "Batch is too large. Send 1000 updates or fewer." });
  }

  const invalid = updates.find((update) => {
    if (!update) {
      return true;
    }

    const moodScore = update.moodScore;
    const sleepHours = update.sleepHours;
    const hasMood = moodScore !== undefined;
    const hasSleep = sleepHours !== undefined;
    const moodValid =
      !hasMood || moodScore === null || (Number.isInteger(moodScore) && moodScore >= 1 && moodScore <= 10);
    const sleepValid =
      !hasSleep || sleepHours === null || (typeof sleepHours === "number" && sleepHours >= 0 && sleepHours <= 24);

    return !isValidDateOnly(update.date) || !moodValid || !sleepValid;
  });

  if (invalid) {
    return res.status(400).json({ error: "Invalid daily log update." });
  }

  const saved = await prisma.$transaction(
    updates.map((update) => {
      const date = new Date(`${update.date}T00:00:00.000Z`);
      const data = {
        ...(update.moodScore !== undefined ? { moodScore: update.moodScore } : {}),
        ...(update.sleepHours !== undefined ? { sleepHours: update.sleepHours } : {}),
      };

      return prisma.dailyLog.upsert({
        where: { userId_date: { userId, date } },
        create: {
          userId,
          date,
          moodScore: update.moodScore ?? null,
          sleepHours: update.sleepHours ?? null,
        },
        update: data,
      });
    }),
  );

  return res.status(200).json({ dailyLogs: saved });
}
