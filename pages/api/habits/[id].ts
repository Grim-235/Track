import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { prisma } from "../../../lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  const userId = session?.user?.id;
  const id = String(req.query.id ?? "");

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const habit = await prisma.habit.findFirst({
    where: { id, userId },
    select: { id: true },
  });

  if (!habit) {
    return res.status(404).json({ error: "Habit not found." });
  }

  if (req.method === "PATCH") {
    const name = req.body?.name === undefined ? undefined : String(req.body.name).trim();
    const targetDaysPerMonth =
      req.body?.targetDaysPerMonth === undefined ? undefined : Number(req.body.targetDaysPerMonth);

    if (name !== undefined && !name) {
      return res.status(400).json({ error: "Habit name cannot be empty." });
    }

    if (
      targetDaysPerMonth !== undefined &&
      (!Number.isInteger(targetDaysPerMonth) || targetDaysPerMonth < 1 || targetDaysPerMonth > 31)
    ) {
      return res.status(400).json({ error: "Target days must be between 1 and 31." });
    }

    const updated = await prisma.habit.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(targetDaysPerMonth !== undefined ? { targetDaysPerMonth } : {}),
      },
    });

    return res.status(200).json({ habit: updated });
  }

  if (req.method === "DELETE") {
    await prisma.habit.delete({ where: { id } });
    return res.status(204).end();
  }

  res.setHeader("Allow", "PATCH, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
