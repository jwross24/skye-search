import { signIn, signUp } from '@/app/auth/actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  const params = await searchParams

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-8 rounded-2xl bg-card p-8 shadow-sm">
        <div className="text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-ocean/10">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="size-6 text-ocean"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M12 3C7 3 3 7 3 12s4 9 9 9 9-4 9-9" strokeLinecap="round" />
              <path d="M21 12c-2 0-4 1.5-6 1.5S11 12 9 12s-4 1.5-6 1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            SkyeSearch
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Your career companion
          </p>
        </div>

        {params.error && (
          <div className="rounded-xl bg-amber-warm/10 px-4 py-3 text-sm text-amber-warm">
            {params.error}
          </div>
        )}

        {params.message && (
          <div className="rounded-xl bg-ocean/10 px-4 py-3 text-sm text-ocean">
            {params.message}
          </div>
        )}

        <form className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-foreground"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1.5 block w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground shadow-sm transition-colors focus:border-ocean focus:outline-none focus:ring-2 focus:ring-ocean/20"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-foreground"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="mt-1.5 block w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground shadow-sm transition-colors focus:border-ocean focus:outline-none focus:ring-2 focus:ring-ocean/20"
            />
          </div>

          <div className="flex flex-col gap-3 pt-1">
            <button
              formAction={signIn}
              className="w-full rounded-xl bg-ocean-deep px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-ocean-deep/90 focus:outline-none focus:ring-2 focus:ring-ocean focus:ring-offset-2"
            >
              Sign in
            </button>
            <button
              formAction={signUp}
              className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ocean focus:ring-offset-2"
            >
              Create account
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
