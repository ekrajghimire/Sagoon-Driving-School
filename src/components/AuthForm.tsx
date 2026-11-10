"use client";
import { safeNext } from "@/lib/safe-next";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { signIn, signUp } from "@/lib/auth-client";


export function AuthForm({ mode, next, googleEnabled }: { mode: "login" | "register"; next?: string; googleEnabled: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const dest = safeNext(next);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email"));
    const password = String(fd.get("password"));
    setPending(true);
    let res: { error?: { message?: string } | null };
    try {
      res =
        mode === "login"
          ? await signIn.email({ email, password })
          : await signUp.email({ email, password, name: String(fd.get("name")), phone: String(fd.get("phone") || ""), marketingOptIn: fd.get("marketing") === "on" } as Parameters<typeof signUp.email>[0]);
    } catch {
      setPending(false);
      setError("We couldn't reach the server. Please check your connection and try again.");
      return;
    }
    if (res.error) {
      setPending(false);
      setError(res.error.message ?? "Something went wrong. Please try again.");
      return;
    }
    // Keep the button busy while we navigate, so it can't be submitted twice.
    router.push(dest);
    router.refresh();
  }

  return (
    <div className="card mx-auto w-full max-w-md shadow-md sm:p-8">
      <h1 className="text-2xl font-extrabold tracking-tight">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
      <p className="mt-1 text-sm text-muted">
        {mode === "login" ? "Log in to manage lessons, packages and progress." : "Track your lessons, use package credits and see your progress."}
      </p>

      {googleEnabled && (
        <>
          <button type="button" className="btn-outline mt-5 w-full" onClick={() => signIn.social({ provider: "google", callbackURL: dest })}>
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden><path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8Z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.9A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7H2.1a11 11 0 0 0 0 10l3.7-2.9Z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7l3.7 2.9C6.7 7.3 9.1 5.4 12 5.4Z"/></svg>
            Continue with Google
          </button>
          <p className="my-5 flex items-center gap-3 text-xs font-semibold text-muted uppercase before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">or</p>
        </>
      )}

      <form onSubmit={onSubmit} className={`space-y-4 ${googleEnabled ? "" : "mt-5"}`}>
        {mode === "register" && (
          <>
            <div>
              <label className="label" htmlFor="name">Full name</label>
              <input id="name" name="name" className="input" required minLength={2} autoComplete="name" />
            </div>
            <div>
              <label className="label" htmlFor="phone">Mobile</label>
              <input id="phone" name="phone" type="tel" className="input" autoComplete="tel" />
            </div>
          </>
        )}
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" className="input" required autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPw ? "text" : "password"}
              className="input pr-12"
              required
              minLength={8}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              aria-describedby={mode === "register" ? "pw-help" : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "Hide password" : "Show password"}
              aria-pressed={showPw}
              className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-muted transition-colors hover:text-brand-700"
            >
              {showPw ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
            </button>
          </div>
          {mode === "register" && <p id="pw-help" className="help">At least 8 characters.</p>}
        </div>
        {mode === "register" && (
          <>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" required className="mt-0.5" />
              <span>I agree to the <Link href="/terms" className="link-underline">terms</Link> and <Link href="/privacy" className="link-underline">privacy policy</Link>.</span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="marketing" className="mt-0.5" />
              <span>Send me occasional driving tips and offers (optional).</span>
            </label>
          </>
        )}
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-danger">{error}</p>}
        <button className="btn-brand w-full" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {pending ? (mode === "login" ? "Logging in…" : "Creating account…") : mode === "login" ? "Log in" : "Create account"}
        </button>
      </form>
      <p className="mt-5 text-center text-sm">
        {mode === "login" ? (
          <>New here? <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="link-underline">Create an account</Link></>
        ) : (
          <>Already have an account? <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="link-underline">Log in</Link></>
        )}
      </p>
      <p className="mt-3 text-center text-sm text-muted">No account needed to book — <Link href="/book" className="link-underline">book as a guest</Link>.</p>
    </div>
  );
}
