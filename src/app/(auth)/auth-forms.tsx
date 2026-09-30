"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";

function safeNext(next: string | null) {
  return next && next.startsWith("/app") ? next : "/app";
}

function Heading({ title, sub }: { title: string; sub?: ReactNode }) {
  return (
    <div>
      <h1 className="text-[40px] leading-[1] font-medium tracking-[-0.03em]">{title}</h1>
      {sub && <p className="mt-3 text-[16px] text-graphite">{sub}</p>}
    </div>
  );
}

function GoogleButton({ label, next }: { label: string; next: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        size="lg"
        loading={loading}
        className="w-full"
        onClick={async () => {
          setLoading(true);
          setError(null);
          const res = await authClient.signIn.social({ provider: "google", callbackURL: next, newUserCallbackURL: "/onboarding" });
          if (res.error) {
            setError(res.error.message ?? "Google sign in didn't work. Try again.");
            setLoading(false);
          }
        }}
      >
        {!loading && (
          <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
            <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7Z" />
            <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
            <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
            <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
          </svg>
        )}
        {label}
      </Button>
      {error && <p className="text-[13px] text-alert">{error}</p>}
    </div>
  );
}

function Divider() {
  return (
    <div className="eyebrow flex items-center gap-3 text-graphite">
      <span className="h-px flex-1 bg-ash" />
      or with email
      <span className="h-px flex-1 bg-ash" />
    </div>
  );
}

export function SignInForm({ google }: { google: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    setError(null);
    const res = await authClient.signIn.email({ email: String(form.get("email")), password: String(form.get("password")) });
    if (res.error) {
      setError(res.error.status === 401 ? "That email and password don't match." : (res.error.message ?? "Couldn't sign in."));
      setLoading(false);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <Heading title="Welcome back" sub="Log in to see where your money went." />
      {google && (
        <>
          <GoogleButton label="Continue with Google" next={next} />
          <Divider />
        </>
      )}
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Field label="Email">{(id) => <Input id={id} name="email" type="email" autoComplete="email" required defaultValue={params.get("email") ?? ""} />}</Field>
        <Field label="Password">{(id) => <Input id={id} name="password" type="password" autoComplete="current-password" required />}</Field>
        <Link href="/forgot-password" className="-mt-1 self-end text-[14px] text-graphite underline underline-offset-4 hover:text-ink">
          Forgot password?
        </Link>
        {error && <FormError>{error}</FormError>}
        <Button type="submit" size="lg" loading={loading} chevron>
          Log in
        </Button>
      </form>
      <p className="text-[15px] text-graphite">
        New to FinAI?{" "}
        <Link href="/sign-up" className="font-medium text-ink underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </div>
  );
}

export function SignUpForm({ google }: { google: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));
    if (password.length < 8) return setError("Use at least 8 characters for your password.");
    setLoading(true);
    setError(null);
    const res = await authClient.signUp.email({
      name: String(form.get("name")).trim(),
      email: String(form.get("email")).trim(),
      password,
    });
    if (res.error) {
      setError(
        res.error.code === "USER_ALREADY_EXISTS" || res.error.status === 422
          ? "There's already an account with that email. Try logging in."
          : (res.error.message ?? "Couldn't create your account."),
      );
      setLoading(false);
      return;
    }
    router.replace("/onboarding");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <Heading title="Open your books" sub="Free. No card, no bank login." />
      {google && (
        <>
          <GoogleButton label="Sign up with Google" next="/app" />
          <Divider />
        </>
      )}
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Field label="Your name">{(id) => <Input id={id} name="name" autoComplete="name" required />}</Field>
        <Field label="Email">{(id) => <Input id={id} name="email" type="email" autoComplete="email" required defaultValue={params.get("email") ?? ""} />}</Field>
        <Field label="Password" hint="At least 8 characters.">
          {(id, d) => <Input id={id} aria-describedby={d} name="password" type="password" autoComplete="new-password" required minLength={8} />}
        </Field>
        {error && <FormError>{error}</FormError>}
        <Button type="submit" size="lg" loading={loading} chevron>
          Create account
        </Button>
        <p className="text-[13px] text-graphite">
          By creating an account you agree to the{" "}
          <Link href="/terms" className="underline underline-offset-4 hover:text-ink">
            terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline underline-offset-4 hover:text-ink">
            privacy policy
          </Link>
          .
        </p>
      </form>
      <p className="text-[15px] text-graphite">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-ink underline underline-offset-4">
          Log in
        </Link>
      </p>
    </div>
  );
}

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email")).trim();
    setLoading(true);
    setError(null);
    const res = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
    setLoading(false);
    if (res.error) setError(res.error.message ?? "Couldn't send the email. Try again.");
    else setSent(true);
  }

  if (sent)
    return (
      <div className="flex flex-col gap-5">
        <Heading title="Check your email" sub="If there's an account with that address, a reset link is on its way. It works for one hour." />
        <Link href="/sign-in" className="text-[15px] font-medium underline underline-offset-4">
          Back to log in
        </Link>
      </div>
    );

  return (
    <div className="flex flex-col gap-6">
      <Heading title="Reset your password" sub="We'll email you a link to set a new one." />
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Email">{(id) => <Input id={id} name="email" type="email" autoComplete="email" required />}</Field>
        {error && <FormError>{error}</FormError>}
        <Button type="submit" size="lg" loading={loading} chevron>
          Send reset link
        </Button>
      </form>
      <Link href="/sign-in" className="text-[15px] text-graphite underline underline-offset-4 hover:text-ink">
        Back to log in
      </Link>
    </div>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(params.get("error") ? "That link has expired. Ask for a new one." : null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password"));
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (!token) return setError("This link is missing its token. Ask for a new one.");
    setLoading(true);
    const res = await authClient.resetPassword({ newPassword: password, token });
    setLoading(false);
    if (res.error) return setError(res.error.message ?? "Couldn't reset your password.");
    router.replace("/sign-in");
  }

  return (
    <div className="flex flex-col gap-6">
      <Heading title="Choose a new password" />
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="New password" hint="At least 8 characters.">
          {(id, d) => <Input id={id} aria-describedby={d} name="password" type="password" autoComplete="new-password" required />}
        </Field>
        {error && <FormError>{error}</FormError>}
        <Button type="submit" size="lg" loading={loading} disabled={!token} chevron>
          Save password
        </Button>
      </form>
      <Link href="/forgot-password" className="text-[15px] text-graphite underline underline-offset-4 hover:text-ink">
        Send a new link
      </Link>
    </div>
  );
}
