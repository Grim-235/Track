import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";
import type { FormEvent } from "react";

export default function Register() {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Could not create account.");
      setIsSubmitting(false);
      return;
    }

    await signIn("credentials", {
      email,
      password,
      callbackUrl: "/tracker",
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-zinc-100">
      <section className="w-full max-w-md border border-zinc-800 bg-zinc-950 p-6">
        <h1 className="text-2xl font-semibold text-white">Create account</h1>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm text-zinc-300">
            Email
            <input
              className="mt-2 h-11 w-full rounded-md border border-zinc-700 bg-black px-3 text-white outline-none focus:border-white"
              name="email"
              type="email"
              required
            />
          </label>
          <label className="block text-sm text-zinc-300">
            Password
            <input
              className="mt-2 h-11 w-full rounded-md border border-zinc-700 bg-black px-3 text-white outline-none focus:border-white"
              minLength={8}
              name="password"
              type="password"
              required
            />
          </label>
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <button
            className="h-11 w-full rounded-md bg-white text-sm font-medium text-black disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            Create account
          </button>
        </form>
        <p className="mt-5 text-sm text-zinc-400">
          Already registered?{" "}
          <Link className="text-white underline" href="/auth/signin">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
