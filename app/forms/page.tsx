import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Downtime fallback (URS-20): when the system is unavailable, operators print
// the blank paper version of any checklist. Each form matches the electronic
// fields one-for-one, and entries are typed in afterwards from the paper record.
export default async function PaperFormsIndex() {
  const session = await auth();
  if (!session?.user) notFound();

  const checklists = await db.checklist.findMany({
    where: { active: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: { versions: { where: { isCurrent: true }, select: { versionNumber: true, _count: { select: { items: true } } }, take: 1 } },
  });

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <div>
        <Link href="/dashboard" className="text-xs font-medium text-muted hover:text-foreground">
          ← Back to the app
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-foreground">Paper forms (downtime fallback)</h1>
        <p className="text-sm text-muted">
          Print the blank form for any checklist if the system is down. Fill it in by hand, have it verified and signed on paper, then enter it into the system when it is back.
          Keep the paper original with the electronic record.
        </p>
      </div>
      <ul className="divide-y divide-border rounded-[var(--radius)] border border-border bg-surface">
        {checklists.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">{c.name}</p>
              <p className="text-xs text-muted">
                {c.category.replace(/_/g, " ")} · v{c.versions[0]?.versionNumber ?? "—"} · {c.versions[0]?._count.items ?? 0} items
              </p>
            </div>
            <Link href={`/forms/${c.id}`} className="rounded-lg border border-border-strong px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-sunken">
              Open printable form
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
