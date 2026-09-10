import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { prisma } from "../../../lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "GET") {
    const habits = await prisma.habit.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
    return res.status(200).json({ habits });
  }

  if (req.method === "POST") {
    const name = String(req.body?.name ?? "").trim();
    const targetDaysPerMonth = Number(req.body?.targetDaysPerMonth ?? 31);

    if (!name) {
      return res.status(400).json({ error: "Habit name is required." });
    }

    if (!Number.isInteger(targetDaysPerMonth) || targetDaysPerMonth < 1 || targetDaysPerMonth > 31) {
      return res.status(400).json({ error: "Target days must be between 1 and 31." });
    }

    const habit = await prisma.habit.create({
      data: {
        userId,
        name,
        targetDaysPerMonth,
      },
    });

    return res.status(201).json({ habit });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed" });
}
