import type { GetServerSideProps } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./api/auth/[...nextauth]";
import { prisma } from "../lib/prisma";
import Tracker from "../components/Tracker";

type TrackerPageProps = {
  habits: {
    id: string;
    name: string;
    targetDaysPerMonth: number;
  }[];
  completions: {
    habitId: string;
    date: string;
    isCompleted: boolean;
  }[];
  dailyLogs: {
    date: string;
    moodScore: number | null;
    sleepHours: number | null;
  }[];
  initialYear: number;
  initialMonth: number;
};

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export const getServerSideProps: GetServerSideProps<TrackerPageProps> = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session?.user?.id) {
    return {
      redirect: {
        destination: "/auth/signin",
        permanent: false,
      },
    };
  }

  const now = new Date();
  const queryYear = Number(context.query.year);
  const queryMonth = Number(context.query.month);
  const initialYear = Number.isInteger(queryYear) && queryYear >= 1970 && queryYear <= 2100 ? queryYear : now.getFullYear();
  const initialMonth = Number.isInteger(queryMonth) && queryMonth >= 1 && queryMonth <= 12 ? queryMonth : now.getMonth() + 1;
  const from = new Date(Date.UTC(initialYear, initialMonth - 1, 1));
  const to = new Date(Date.UTC(initialYear, initialMonth, 1));

  const [habits, completions, dailyLogs] = await Promise.all([
    prisma.habit.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        targetDaysPerMonth: true,
      },
    }),
    prisma.habitCompletion.findMany({
      where: {
        habit: { userId: session.user.id },
        date: { gte: from, lt: to },
      },
      select: {
        habitId: true,
        date: true,
        isCompleted: true,
      },
    }),
    prisma.dailyLog.findMany({
      where: {
        userId: session.user.id,
        date: { gte: from, lt: to },
      },
      select: {
        date: true,
        moodScore: true,
        sleepHours: true,
      },
    }),
  ]);

  return {
    props: {
      habits,
      completions: completions.map((completion) => ({
        ...completion,
        date: toDateKey(completion.date),
      })),
      dailyLogs: dailyLogs.map((log) => ({
        ...log,
        date: toDateKey(log.date),
      })),
      initialYear,
      initialMonth,
    },
  };
};

export default function TrackerPage(props: TrackerPageProps) {
  return (
    <Tracker
      habits={props.habits}
      initialCompletions={props.completions}
      initialDailyLogs={props.dailyLogs}
      initialYear={props.initialYear}
      initialMonth={props.initialMonth}
    />
  );
}
