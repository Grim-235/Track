"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/router";
import { signOut } from "next-auth/react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Habit = {
  id: string;
  name: string;
  targetDaysPerMonth: number;
};

type Completion = {
  habitId: string;
  date: string;
  isCompleted: boolean;
};

type DailyLog = {
  date: string;
  moodScore: number | null;
  sleepHours: number | null;
};

type TrackerProps = {
  habits: Habit[];
  initialCompletions: Completion[];
  initialDailyLogs: DailyLog[];
  initialYear?: number;
  initialMonth?: number;
};

type CompletionMap = Record<string, boolean>;
type DailyLogMap = Record<string, { moodScore: string; sleepHours: string }>;

const dayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" });

function pad2(value: number) {
  return value.toString().padStart(2, "0");
}

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function getCompletionKey(habitId: string, date: string) {
  return `${habitId}:${date}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function getMonthDays(year: number, month: number) {
  const daysInMonth = getDaysInMonth(year, month);

  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const date = toDateKey(year, month, day);
    const weekday = dayFormatter.format(new Date(`${date}T00:00:00.000Z`));

    return { day, date, weekday };
  });
}

function buildCompletionMap(completions: Completion[]) {
  return completions.reduce<CompletionMap>((acc, completion) => {
    acc[getCompletionKey(completion.habitId, completion.date)] = completion.isCompleted;
    return acc;
  }, {});
}

function buildDailyLogMap(logs: DailyLog[]) {
  return logs.reduce<DailyLogMap>((acc, log) => {
    acc[log.date] = {
      moodScore: log.moodScore?.toString() ?? "",
      sleepHours: log.sleepHours?.toString() ?? "",
    };
    return acc;
  }, {});
}

export default function Tracker({
  habits,
  initialCompletions,
  initialDailyLogs,
  initialYear,
  initialMonth,
}: TrackerProps) {
  const router = useRouter();
  const today = new Date();
  const [habitList, setHabitList] = useState(habits);
  const [selectedYear, setSelectedYear] = useState(initialYear ?? today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(initialMonth ?? today.getMonth() + 1);
  const [completions, setCompletions] = useState<CompletionMap>(() => buildCompletionMap(initialCompletions));
  const [dailyLogs, setDailyLogs] = useState<DailyLogMap>(() => buildDailyLogMap(initialDailyLogs));
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    setHabitList(habits);
  }, [habits]);

  useEffect(() => {
    if (initialYear && initialMonth) {
      setSelectedYear(initialYear);
      setSelectedMonth(initialMonth);
    }

    setCompletions(buildCompletionMap(initialCompletions));
    setDailyLogs(buildDailyLogMap(initialDailyLogs));
  }, [initialCompletions, initialDailyLogs, initialMonth, initialYear]);

  const monthDays = useMemo(() => getMonthDays(selectedYear, selectedMonth), [selectedYear, selectedMonth]);
  const daysInMonth = monthDays.length;
  const totalGoal = habitList.length * daysInMonth;

  const completedCount = useMemo(() => {
    return habitList.reduce((total, habit) => {
      return (
        total +
        monthDays.reduce((habitTotal, day) => {
          return habitTotal + (completions[getCompletionKey(habit.id, day.date)] ? 1 : 0);
        }, 0)
      );
    }, 0);
  }, [completions, habitList, monthDays]);

  const dailyProgressData = useMemo(() => {
    return monthDays.map((day) => ({
      day: day.day.toString(),
      completed: habitList.filter((habit) => completions[getCompletionKey(habit.id, day.date)]).length,
    }));
  }, [completions, habitList, monthDays]);

  const habitAnalysis = useMemo(() => {
    return habitList.map((habit) => {
      const achieved = monthDays.filter((day) => completions[getCompletionKey(habit.id, day.date)]).length;
      const goal = Math.min(habit.targetDaysPerMonth || daysInMonth, daysInMonth);
      const progress = goal > 0 ? Math.round((achieved / goal) * 100) : 0;

      return {
        ...habit,
        goal,
        achieved,
        progress: Math.min(progress, 100),
      };
    });
  }, [completions, daysInMonth, habitList, monthDays]);

  const leaderboard = useMemo(() => {
    return [...habitAnalysis].sort((a, b) => b.progress - a.progress || b.achieved - a.achieved).slice(0, 10);
  }, [habitAnalysis]);

  const donutData = [
    { name: "Completed", value: completedCount },
    { name: "Left", value: Math.max(totalGoal - completedCount, 0) },
  ];

  async function toggleCompletion(habitId: string, date: string) {
    const key = getCompletionKey(habitId, date);
    const nextValue = !completions[key];

    setCompletions((current) => ({ ...current, [key]: nextValue }));
    setSavingKey(key);

    try {
      const response = await fetch("/api/tracker/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: [{ habitId, date, isCompleted: nextValue }],
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to save completion.");
      }
    } catch (error) {
      setCompletions((current) => ({ ...current, [key]: !nextValue }));
      console.error(error);
    } finally {
      setSavingKey(null);
    }
  }

  async function addHabit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const targetDaysPerMonth = Number(formData.get("targetDaysPerMonth") ?? daysInMonth);

    if (!name) {
      return;
    }

    const response = await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, targetDaysPerMonth }),
    });

    if (response.ok) {
      const body = await response.json();
      setHabitList((current) => [...current, body.habit]);
      form.reset();
    }
  }

  async function deleteHabit(habitId: string) {
    const previous = habitList;
    setHabitList((current) => current.filter((habit) => habit.id !== habitId));

    const response = await fetch(`/api/habits/${habitId}`, { method: "DELETE" });

    if (!response.ok) {
      setHabitList(previous);
    }
  }

  function changeMonth(month: number, year = selectedYear) {
    if (!Number.isInteger(year) || year < 1970 || year > 2100) {
      return;
    }

    setSelectedMonth(month);
    setSelectedYear(year);
    router.push(`/tracker?year=${year}&month=${month}`, undefined, { scroll: false });
  }

  function updateDailyLog(date: string, field: "moodScore" | "sleepHours", value: string) {
    setDailyLogs((current) => ({
      ...current,
      [date]: {
        moodScore: current[date]?.moodScore ?? "",
        sleepHours: current[date]?.sleepHours ?? "",
        [field]: value,
      },
    }));
  }

  async function saveDailyLog(date: string, field: "moodScore" | "sleepHours") {
    const rawValue = dailyLogs[date]?.[field] ?? "";
    const parsedValue = rawValue === "" ? null : Number(rawValue);

    if (rawValue !== "" && Number.isNaN(parsedValue)) {
      return;
    }

    await fetch("/api/daily-logs/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        updates: [{ date, [field]: parsedValue }],
      }),
    });
  }

  return (
    <section className="min-h-screen bg-black text-zinc-100">
      <header className="sticky top-0 z-30 border-b border-zinc-800 bg-black/95 px-6 py-4 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-normal text-white">Habit Tracker</h1>
          </div>
          <div className="flex items-center gap-3">
            <select
              className="h-10 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-white"
              value={selectedMonth}
              onChange={(event) => changeMonth(Number(event.target.value))}
            >
              {Array.from({ length: 12 }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {new Date(Date.UTC(2026, index, 1)).toLocaleString("en-US", {
                    month: "long",
                    timeZone: "UTC",
                  })}
                </option>
              ))}
            </select>
            <input
              className="h-10 w-24 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-white"
              type="number"
              min="1970"
              max="2100"
              value={selectedYear}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
              onBlur={(event) => changeMonth(selectedMonth, Number(event.target.value))}
            />
            <button
              className="h-10 rounded-md border border-zinc-700 px-3 text-sm text-zinc-200 hover:border-zinc-400 hover:text-white"
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="grid gap-6 px-6 py-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <form className="mb-4 flex flex-wrap items-end gap-3" onSubmit={addHabit}>
            <label className="block text-sm text-zinc-300">
              Habit
              <input
                className="mt-2 h-10 w-64 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-white outline-none focus:border-white"
                name="name"
                placeholder="New habit"
              />
            </label>
            <label className="block text-sm text-zinc-300">
              Monthly target
              <input
                className="mt-2 h-10 w-32 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-white outline-none focus:border-white"
                defaultValue={daysInMonth}
                max={31}
                min={1}
                name="targetDaysPerMonth"
                type="number"
              />
            </label>
            <button className="h-10 rounded-md bg-white px-4 text-sm font-medium text-black" type="submit">
              Add habit
            </button>
          </form>

          <section className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
            <div className="h-56 border border-zinc-800 bg-zinc-950 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyProgressData}>
                  <XAxis dataKey="day" stroke="#a1a1aa" tickLine={false} axisLine={false} />
                  <YAxis stroke="#a1a1aa" allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: "#27272a" }}
                    contentStyle={{ background: "#09090b", border: "1px solid #3f3f46", color: "#fff" }}
                  />
                  <Bar dataKey="completed" fill="#f4f4f5" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
              <Metric label="Total Goal" value={totalGoal} />
              <Metric label="Completed" value={completedCount} />
              <Metric label="Left" value={Math.max(totalGoal - completedCount, 0)} />
            </div>
          </section>

          <div className="overflow-x-auto border border-zinc-800 bg-zinc-950">
            <div
              className="grid min-w-max"
              style={{ gridTemplateColumns: `220px repeat(${daysInMonth}, 48px)` }}
            >
              <div className="sticky left-0 z-20 border-b border-r border-zinc-800 bg-zinc-950 p-3 text-sm font-medium text-zinc-300">
                Habit
              </div>
              {monthDays.map((day) => (
                <div
                  key={day.date}
                  className="border-b border-r border-zinc-800 px-1 py-2 text-center text-xs text-zinc-400"
                >
                  <div className="font-medium text-zinc-200">{day.day}</div>
                  <div>{day.weekday}</div>
                </div>
              ))}

              {habitList.map((habit) => (
                <div key={habit.id} className="contents">
                  <div className="sticky left-0 z-10 flex h-12 items-center justify-between gap-2 border-b border-r border-zinc-800 bg-zinc-950 px-3 text-sm text-white">
                    <span className="truncate">{habit.name}</span>
                    <button
                      aria-label={`Delete ${habit.name}`}
                      className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-900 hover:text-white"
                      type="button"
                      onClick={() => deleteHabit(habit.id)}
                    >
                      X
                    </button>
                  </div>
                  {monthDays.map((day) => {
                    const key = getCompletionKey(habit.id, day.date);
                    const checked = Boolean(completions[key]);

                    return (
                      <label
                        key={key}
                        className="flex h-12 items-center justify-center border-b border-r border-zinc-800"
                      >
                        <input
                          aria-label={`${habit.name} on ${day.date}`}
                          type="checkbox"
                          checked={checked}
                          disabled={savingKey === key}
                          onChange={() => toggleCompletion(habit.id, day.date)}
                          className="h-5 w-5 cursor-pointer rounded border-zinc-600 bg-black text-white accent-white"
                        />
                      </label>
                    );
                  })}
                </div>
              ))}

              <DailyInputRow
                label="Mood"
                days={monthDays}
                field="moodScore"
                type="number"
                min={1}
                max={10}
                dailyLogs={dailyLogs}
                onChange={updateDailyLog}
                onBlur={saveDailyLog}
              />
              <DailyInputRow
                label="Hours of Sleep"
                days={monthDays}
                field="sleepHours"
                type="number"
                min={0}
                max={24}
                step={0.25}
                dailyLogs={dailyLogs}
                onChange={updateDailyLog}
                onBlur={saveDailyLog}
              />
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <section className="border border-zinc-800 bg-zinc-950 p-4">
            <h2 className="mb-3 text-sm font-semibold text-white">Monthly Completion</h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} innerRadius={62} outerRadius={88} dataKey="value" stroke="#09090b">
                    <Cell fill="#f4f4f5" />
                    <Cell fill="#3f3f46" />
                  </Pie>
                  <Tooltip contentStyle={{ background: "#09090b", border: "1px solid #3f3f46", color: "#fff" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <p className="text-center text-2xl font-semibold text-white">
              {totalGoal > 0 ? Math.round((completedCount / totalGoal) * 100) : 0}%
            </p>
          </section>

          <section className="border border-zinc-800 bg-zinc-950 p-4">
            <h2 className="mb-3 text-sm font-semibold text-white">Habit Analysis</h2>
            <div className="space-y-3">
              {habitAnalysis.map((habit) => (
                <div key={habit.id} className="grid grid-cols-[1fr_64px_72px] items-center gap-3 text-sm">
                  <span className="truncate text-zinc-200">{habit.name}</span>
                  <span className="text-zinc-400">
                    {habit.achieved}/{habit.goal}
                  </span>
                  <div>
                    <div className="mb-1 text-right text-xs text-zinc-400">{habit.progress}%</div>
                    <div className="h-2 bg-zinc-800">
                      <div className="h-2 bg-zinc-100" style={{ width: `${habit.progress}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="border border-zinc-800 bg-zinc-950 p-4">
            <h2 className="mb-3 text-sm font-semibold text-white">Leaderboard</h2>
            <ol className="space-y-2">
              {leaderboard.map((habit, index) => (
                <li key={habit.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-zinc-300">
                    {index + 1}. {habit.name}
                  </span>
                  <span className="text-white">{habit.progress}%</span>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </main>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-zinc-800 bg-zinc-950 p-4">
      <div className="text-xs uppercase text-zinc-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}

function DailyInputRow({
  label,
  days,
  field,
  type,
  min,
  max,
  step,
  dailyLogs,
  onChange,
  onBlur,
}: {
  label: string;
  days: { day: number; date: string; weekday: string }[];
  field: "moodScore" | "sleepHours";
  type: "number";
  min: number;
  max: number;
  step?: number;
  dailyLogs: DailyLogMap;
  onChange: (date: string, field: "moodScore" | "sleepHours", value: string) => void;
  onBlur: (date: string, field: "moodScore" | "sleepHours") => void;
}) {
  return (
    <div className="contents">
      <div className="sticky left-0 z-10 flex h-12 items-center border-b border-r border-zinc-800 bg-zinc-950 px-3 text-sm font-medium text-zinc-200">
        {label}
      </div>
      {days.map((day) => (
        <div key={`${field}:${day.date}`} className="flex h-12 items-center justify-center border-b border-r border-zinc-800 px-1">
          <input
            aria-label={`${label} on ${day.date}`}
            type={type}
            min={min}
            max={max}
            step={step}
            value={dailyLogs[day.date]?.[field] ?? ""}
            onChange={(event) => onChange(day.date, field, event.target.value)}
            onBlur={() => onBlur(day.date, field)}
            className="h-8 w-10 rounded border border-zinc-700 bg-black text-center text-xs text-white outline-none focus:border-white"
          />
        </div>
      ))}
    </div>
  );
}
