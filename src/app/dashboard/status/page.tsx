import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Dad Care · Backend status" };

type Check = { ok: boolean; label: string; detail: string };

// Step 1 health check: proves the app can reach Supabase and the schema is in place.
async function checkBackend(): Promise<Check[]> {
  await connection(); // render per request, never at build time
  if (!hasSupabaseEnv) {
    return [{ ok: false, label: "Supabase keys", detail: "Copy .env.example to .env.local and add your project URL and publishable key." }];
  }
  const supabase = await createClient();
  const checks: Check[] = [{ ok: true, label: "Supabase keys", detail: "Found in .env.local" }];

  const { error } = await supabase.from("households").select("id", { count: "exact", head: true });
  checks.push(
    error
      ? { ok: false, label: "Database schema", detail: `${error.message}. Run the migration in supabase/migrations.` }
      : { ok: true, label: "Database schema", detail: "Tables found. Row-level security is on." },
  );

  const { data } = await supabase.auth.getUser();
  checks.push({
    ok: Boolean(data.user),
    label: "Signed in",
    detail: data.user ? data.user.email ?? "Signed in" : "Not yet. Sign-in comes with the dashboard in step 3.",
  });
  return checks;
}

async function BackendChecks() {
  const checks = await checkBackend();
  return (
    <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
      {checks.map((c) => (
        <li key={c.label} className="flex items-start gap-3 p-4">
          <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${c.ok ? "bg-ok" : "bg-warn"}`} />
          <div className="min-w-0">
            <p className="font-bold">{c.label}</p>
            <p className="text-sm text-muted">{c.detail}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function Dashboard() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-12">
      <div>
        <p className="text-xs font-bold tracking-wider text-muted uppercase">Phil&apos;s dashboard</p>
        <h1 className="font-display text-3xl font-bold">Backend status</h1>
        <p className="mt-1 text-muted">The house map, timeline and alerts arrive in step 3. This page checks the foundation.</p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted">Checking the backend…</p>}>
        <BackendChecks />
      </Suspense>
    </main>
  );
}
