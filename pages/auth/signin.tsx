import type { GetServerSideProps } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { getCsrfToken, signIn } from "next-auth/react";
import { useState } from "react";
import type { FormEvent } from "react";
import { authOptions } from "../api/auth/[...nextauth]";

type SignInProps = {
  csrfToken: string;
};

export const getServerSideProps: GetServerSideProps<SignInProps> = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (session?.user?.id) {
    return {
      redirect: {
        destination: "/tracker",
        permanent: false,
      },
    };
  }

  return {
    props: {
      csrfToken: (await getCsrfToken(context)) ?? "",
    },
  };
};

export default function SignIn({ csrfToken }: SignInProps) {
  const [error, setError] = useState("");
  const googleEnabled = Boolean(process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true" || process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const formData = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
      callbackUrl: "/tracker",
    });

    if (result?.ok) {
      window.location.href = result.url ?? "/tracker";
      return;
    }

    setError("Invalid email or password.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-zinc-100">
      <section className="w-full max-w-md border border-zinc-800 bg-zinc-950 p-6">
        <h1 className="text-2xl font-semibold text-white">Sign in</h1>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <input name="csrfToken" type="hidden" defaultValue={csrfToken} />
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
              name="password"
              type="password"
              required
            />
          </label>
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <button className="h-11 w-full rounded-md bg-white text-sm font-medium text-black" type="submit">
            Sign in
          </button>
        </form>
        {googleEnabled ? (
          <button
            className="mt-3 h-11 w-full rounded-md border border-zinc-700 text-sm font-medium text-white"
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/tracker" })}
          >
            Continue with Google
          </button>
        ) : null}
        <p className="mt-5 text-sm text-zinc-400">
          New here?{" "}
          <Link className="text-white underline" href="/auth/register">
            Create account
          </Link>
        </p>
      </section>
    </main>
  );
}
