import Link from "next/link";

const sides = [
  {
    href: "/dad",
    eyebrow: "Dad · Galaxy S22",
    title: "Dad's screen",
    body: "Four large buttons, press and hold, everything spoken aloud.",
  },
  {
    href: "/dashboard",
    eyebrow: "Phil · any browser",
    title: "Caregiver dashboard",
    body: "House map, today's timeline, medicines and the emergency ladder.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-4 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-4xl font-bold text-balance">Dad Care</h1>
        <p className="max-w-prose text-muted">
          See at a glance that Dad is safe in Jos. If something goes wrong, the right person is called within minutes.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {sides.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-accent"
          >
            <span className="text-xs font-bold tracking-wider text-muted uppercase">{s.eyebrow}</span>
            <span className="font-display text-xl font-bold">{s.title}</span>
            <span className="text-sm text-muted">{s.body}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
